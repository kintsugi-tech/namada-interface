import BigNumber from "bignumber.js";
import { useCallback, useContext, useEffect, useState } from "react";

import {
  ActionButton,
  Alert,
  AmountInput,
  Checkbox,
  Select,
} from "@namada/components";
import { Account, BondProps, TxProps } from "@namada/types";
import { shortenAddress } from "@namada/utils";
import { ImSpinner8 } from "react-icons/im";

import { Bond, getBondTx, getSdkInstance } from "../utils";

import { AppContext } from "./App";
import { ButtonContainer, InputContainer } from "./App.components";
import { FormStatus, GenesisFormContainer } from "./Genesis.components";

const KINTSUGI_ADDR = "tnam1qydvhqdu2q2vrgvju2ngpt6yhrehu525pus6m28p";
type Props = {
  accounts: Account[];
  validators: { label: string; value: string }[];
};

export const GenesisBondForm: React.FC<Props> = ({ accounts, validators }) => {
  const { integration } = useContext(AppContext)!;

  const accountLookup = accounts.reduce(
    (acc, account) => {
      acc[account.address] = account;
      return acc;
    },
    {} as Record<string, Account>
  );

  const [account, setAccount] = useState<Account>(accounts[0]);

  const [loading, setLoading] = useState(false);
  const [editingBonds, setEditingBonds] = useState(false);
  const [previousBonds, setPreviousBonds] = useState<
    { source: string; validator: string; amount: string }[]
  >([]);

  const [validator, setValidator] = useState<string>("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [automatic, setAutomatic] = useState(true);
  const [tip, setTip] = useState(false);

  const [success, setSuccess] = useState<string>();
  const [error, setError] = useState<string>();
  const [disablingError, setDisablingError] = useState<
    React.JSX.Element | undefined
  >();

  const accountsSelectData = accounts.map(({ alias, address }) => ({
    label: `${alias} - ${shortenAddress(address)}`,
    value: address,
  }));

  useEffect(() => {
    const getBalance = async () => {
      try {
        const res = await fetch(
          `${process.env.NAMADA_INTERFACE_GENESIS_API_URL ?? "http://127.0.0.1:3000"}/balance/${account.address}`
        );

        if (res.ok) {
          const b = (await res.json()) as { balance: string };
          setDisablingError(undefined);
          setBalance(parseFloat(b.balance));
        } else {
          if (res.status === 404) {
            setDisablingError(
              <p className="p-8">
                We can't find a genesis balance for this account. Please make
                sure you claimed your airdrop back in the days.
              </p>
            );
          }
        }
      } catch (e) {
        console.log("ok");
        console.error(e);
      }

      setError(undefined);
    };

    getBalance();
  }, [account]);

  useEffect(() => {
    const checkSubmission = async () => {
      try {
        const res = await fetch(
          `${process.env.NAMADA_INTERFACE_GENESIS_API_URL ?? "http://127.0.0.1:3000"}/bonds/${account.publicKey ?? ""}`
        );

        if (res.ok) {
          const bondData = (await res.json()) as {
            bonds: { source: string; validator: string; amount: string }[];
          };

          setPreviousBonds(bondData.bonds);
        } else {
          setPreviousBonds([]);
        }
      } catch (e) {
        console.log("ok");
        console.error(e);
      }
    };

    checkSubmission();
  }, [account]);

  useEffect(() => {
    setSuccess(undefined);
    setError(undefined);
    setBonds([]);
  }, [automatic]);

  useEffect(() => {
    // set validator at page load if default is provided
    if (typeof window !== "undefined") {
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      if (urlParams.has("validator")) {
        setValidator(urlParams.get("validator")!);
      }
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setError(undefined);
      setSuccess(undefined);

      if (!account || !amount) {
        console.log(account, validator, amount);
        setError("Please provide the required values!");
        return;
      }

      if (!validator || validator == "") {
        setError("Please select a validator!");
        return;
      }

      setLoading(true);
      try {
        // Calculate amounts
        let regular_amount =
          tip ? BigNumber(Math.ceil(amount * 0.8)) : BigNumber(amount);
        let tip_amount =
          tip ? BigNumber(amount).minus(regular_amount) : BigNumber(0);

        // Init SDK
        let { tx } = await getSdkInstance();
        const txs: TxProps[] = [];
        let bondProps: BondProps[] = [];

        // Prepare tx
        bondProps.push({
          source: account.address,
          validator: validator,
          amount: new BigNumber(regular_amount),
        });

        txs.push(await getBondTx(tx, bondProps[0], account));

        // Prepare tip tx
        if (tip_amount > BigNumber(0)) {
          bondProps.push({
            source: account.address,
            validator: KINTSUGI_ADDR,
            amount: new BigNumber(tip_amount),
          });

          txs.push(await getBondTx(tx, bondProps[1], account));
        }

        // genesis checksums are placeholder
        const checksums: Record<string, string> = {
          "tx_bond.wasm":
            "0000000000000000000000000000000000000000000000000000000000000000",
        };

        let signer = integration.signer();

        let result = await signer?.sign(txs, account.address, checksums);

        if (!result) {
          console.error("No result from signing");
          setError("Error: No result from signing");
          return;
        }

        let bonds: Bond[] = [];
        let i = 0;
        for (const res of result) {
          let signResponse = await tx.getTxSignature(
            res,
            account.publicKey ?? ""
          );

          bonds.push({
            ...bondProps[i],
            source: account.publicKey ?? "",
            signatures: signResponse.signatures,
          });
          i++;
        }

        if (automatic) {
          // Submit bonds to api
          const response = await fetch(
            `${process.env.NAMADA_INTERFACE_GENESIS_API_URL ?? "http://127.0.0.1:3000"}/submit_bond`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ bonds: bonds }),
            }
          );

          if (response.ok) {
            setSuccess(
              "Your bond transaction has been successfully submitted to be included in the genesis. You will see it reflected in the GitHub repository automatically shortly."
            );
            setLoading(false);
          } else {
            let errorInfo = await response.json();
            let errorMessage = "";

            if (errorInfo.errors) {
              errorMessage = errorInfo.errors.map((e: any) => e.msg).join(", ");
              throw new Error(`${errorMessage}`);
            } else {
              throw new Error(
                `Unable to submit bond transaction to API ${response.status}`
              );
            }
          }
          return;
        } else {
          setBonds(bonds);
          setSuccess(
            "Your bond transaction has been signed correctly! Please copy paste the signed bond.toml from the below box, and open a pull request on GitHub yourself following this guide."
          );
          setLoading(false);
        }
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.includes("does not match Tx header chain_id")) {
            setError(`CHAIN_ID_MISMATCH`);
          } else {
            setError(`Unable to sign transaction. ${e}`);
          }
        } else {
          setError(`Unable to sign transaction. Unknown error`);
        }
        setLoading(false);
      }
    },
    [account, validator, amount, tip, automatic]
  );

  return (
    <GenesisFormContainer>
      <InputContainer>
        {accounts.length > 0 ?
          <Select
            data={accountsSelectData}
            value={account.address}
            label="Account"
            onChange={(e) => setAccount(accountLookup[e.target.value])}
          />
        : <div>
            You have no signing accounts! Import or create an account in the
            extension, then reload this page.
          </div>
        }
      </InputContainer>

      {!disablingError ?
        previousBonds.length == 0 || editingBonds ?
          <>
            <InputContainer>
              <Select
                data={validators}
                value={validator}
                label="Validator"
                onChange={(e) => setValidator(e.target.value)}
              />
            </InputContainer>
            <InputContainer>
              <AmountInput
                placeholder={`100 NAM`}
                label="Amount"
                value={amount === undefined ? undefined : new BigNumber(amount)}
                min={0}
                maxDecimalPlaces={3}
                onChange={(e) => setAmount(e.target.value?.toNumber())}
                error={amount && amount > balance ? `Insufficient Balance` : ""}
              />
              <span className="mt-2 text-white text-xs">
                Genesis Balance: {balance.toFixed(2)} NAM
              </span>
            </InputContainer>
            <InputContainer>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="automatic-check"
                  className="bg-neutral-600 text-yellow-500"
                  checked={automatic}
                  onChange={() => {
                    setAutomatic(!automatic);
                  }}
                />
                <label
                  htmlFor={"automatic-check"}
                  className="text-white text-sm"
                >
                  Enable automatic submission of signature (no PR on GitHub
                  needed)
                </label>
              </div>
            </InputContainer>
            {validator !== KINTSUGI_ADDR && (
              <InputContainer>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="kintsugi-check"
                    className="bg-neutral-600 text-yellow-500"
                    checked={tip}
                    onChange={() => {
                      setTip(!tip);
                    }}
                  />
                  <label
                    htmlFor={"kintsugi-check"}
                    className="text-white text-sm"
                  >
                    Delegate 20% also to{" "}
                    <a
                      href="https://kintsugi.tech"
                      className="underline text-yellow"
                      target="_blank"
                    >
                      Kintsugi Validator
                    </a>{" "}
                    - as a thank for building this interface
                  </label>
                </div>
              </InputContainer>
            )}{" "}
          </>
        : <div className="py-4 text-white">
            It looks like you already submitted a bond! <br /> <br />
            <b>Current Bonds:</b>
            {previousBonds.map((b) => {
              let valName = validators.find((v) => v.value === b.validator);
              return (
                <p key={b.source}>
                  {valName?.label}: {b.amount} NAM
                </p>
              );
            })}
          </div>

      : <div className="text-white"> {disablingError}</div>}

      {error && (
        <Alert type="error">
          {error === "CHAIN_ID_MISMATCH" ?
            <>
              Unable to sign transaction. Please make sure to configure the
              correct chain id (namada-genesis) in namada extension. Check{" "}
              <a
                href="https://namada-genesis.kintsugi-nodes.com/chain-setting.gif"
                target="_blank"
                className="underline"
              >
                here
              </a>{" "}
              for more info.
            </>
          : error}
        </Alert>
      )}
      {success && <Alert type="success">{success}</Alert>}
      {loading && (
        <Alert type="info" className="text-center bg-transparent">
          <ImSpinner8 className="inline-block w-5 h-5 animate-spin mr-2" />
          Signing transaction...
        </Alert>
      )}

      <FormStatus>
        {bonds.length > 0 && (
          <>
            <div className="mt-4 text-sm text-white">signed-bond.toml</div>
            <div className="w-full mt-1 font-mono break-all border rounded-md p-4">
              {bonds.map((bond, i) => (
                <p key={i}>
                  {i > 0 && <br />}
                  [[bond]] <br />
                  source = "{bond.source}"
                  <br />
                  validator = "{bond.validator}" <br />
                  amount = "{bond.amount.toString()}" <br />
                  <br />
                  [bond.signatures]
                  <br />
                  {bond.signatures.map((s) => (
                    <span key={s.pub_key}>
                      {s.pub_key} = "{s.signature}"
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </>
        )}
      </FormStatus>

      <ButtonContainer>
        <ActionButton
          backgroundHoverColor="yellow"
          textHoverColor="black"
          outlineColor="yellow"
          className={`max-w-fit ${loading && "opacity-50"}`}
          color="cyan"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            if (previousBonds.length > 0 && !editingBonds) {
              setEditingBonds(true);
            } else {
              handleSubmit(e);
            }
          }}
          disabled={
            loading || (disablingError !== undefined && disablingError !== null)
          }
        >
          {previousBonds.length > 0 ? "Edit Bonds" : "Sign Bond"}
        </ActionButton>
      </ButtonContainer>
    </GenesisFormContainer>
  );
};
