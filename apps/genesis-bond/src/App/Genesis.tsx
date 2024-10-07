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
import { ValidatorData } from "./types";

const VALIDITY_ADDR = "tnam1q8lhvxys53dlc8wzlg7dyqf9avd0vff6wvav4amt";
type Props = {
  accounts: Account[];
  validators: ValidatorData[] | null;
};

export const GenesisBondForm: React.FC<Props> = ({ accounts, validators }) => {
  const { integration } = useContext(AppContext)!;
  const validatorsSelectValue = validators?.map((v) => ({
    label: v.alias,
    value: v.address,
  }));
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
    const getBalance = async (): Promise<void> => {
      try {
        const res = await fetch(
          "https://validityops.github.io/namada-bond/balances.json"
        );

        if (res.ok) {
          const balances = (await res.json()) as Record<string, string>;

          // Check if the account address exists in the balances.json
          if (balances[account.address]) {
            setDisablingError(undefined);
            setBalance(parseFloat(balances[account.address]));
          } else {
            // If the account address is not found, display an error
            setDisablingError(
              <p className="p-8">
                We {`can't`} find a genesis balance for this account. Please
                make sure you claimed your airdrop back in the days.
              </p>
            );
          }
        } else {
          // Handle non-200 responses
          console.error("Failed to fetch balances.json");
        }
      } catch (e) {
        console.error(e);
      }

      setError(undefined);
    };

    getBalance();
  }, [account]);

  useEffect(() => {
    const checkSubmission = async (): Promise<void> => {
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

      if (!account || !validator || !amount) {
        console.log(account, validator, amount);
        setError("Please provide the required values!");
        return;
      }

      setLoading(true);
      try {
        // Calculate amounts
        const regular_amount =
          tip ? BigNumber(Math.ceil(amount * 0.8)) : BigNumber(amount);
        const tip_amount =
          tip ? BigNumber(amount).minus(regular_amount) : BigNumber(0);

        // Init SDK
        const { tx } = await getSdkInstance();
        const txs: TxProps[] = [];
        const bondProps: BondProps[] = [];

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
            validator: VALIDITY_ADDR,
            amount: new BigNumber(tip_amount),
          });

          txs.push(await getBondTx(tx, bondProps[1], account));
        }

        // genesis checksums are placeholder
        const checksums: Record<string, string> = {
          "tx_bond.wasm":
            "0000000000000000000000000000000000000000000000000000000000000000",
        };

        const signer = integration.signer();

        const result = await signer?.sign(txs, account.address, checksums);

        if (!result) {
          console.error("No result from signing");
          setError("Error: No result from signing");
          return;
        }

        const bonds: Bond[] = [];
        let i = 0;
        for (const res of result) {
          const signResponse = await tx.getTxSignature(
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
            const errorInfo = await response.json();
            let errorMessage = "";

            if (errorInfo.errors) {
              errorMessage = errorInfo.errors
                .map((e: { msg: string }) => e.msg)
                .join(", ");
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
                data={validatorsSelectValue ?? [{ label: "", value: "" }]}
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
            {validator !== VALIDITY_ADDR && (
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
                      href="https://validityops.com"
                      className="underline text-yellow"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ValidityOps Validator
                    </a>{" "}
                    - as a thank you for building this interface
                  </label>
                </div>
              </InputContainer>
            )}{" "}
          </>
        : <div className="py-4 text-white">
            It looks like you already submitted a bond! <br /> <br />
            <b>Current Bonds:</b>
            {previousBonds.map((b) => {
              const valName = validators?.find((v) => v.value === b.validator);
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
                rel="noreferrer"
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
                  source = {`"${bond.source}"`}
                  <br />
                  validator = {`"${bond.validator}"`} <br />
                  amount = {`"${bond.amount.toString()}"`} <br />
                  <br />
                  [bond.signatures]
                  <br />
                  {bond.signatures.map((s) => (
                    <span key={s.pub_key}>
                      {s.pub_key} = {`"${s.signature}"`}
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
