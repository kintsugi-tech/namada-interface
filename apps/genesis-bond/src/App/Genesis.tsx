import BigNumber from "bignumber.js";
import { useCallback, useContext, useState } from "react";

import { ActionButton, Alert, AmountInput, Select } from "@namada/components";
import {
  Account,
  BondProps,
  TxProps,
  TxSignature,
  WrapperTxProps,
} from "@namada/types";
import { shortenAddress } from "@namada/utils";

import { Bond, getSdkInstance, TransferResponse } from "../utils";

import { AppContext } from "./App";
import {
  ButtonContainer,
  InfoContainer,
  InputContainer,
} from "./App.components";
import {
  FormStatus,
  GenesisFormContainer,
  PreFormatted,
} from "./Genesis.components";

enum Status {
  PendingPowSolution,
  PendingTransfer,
  Completed,
  Error,
}

type Props = {
  accounts: Account[];
  isTestnetLive: boolean;
};

export const GenesisBondForm: React.FC<Props> = ({
  accounts,
  isTestnetLive,
}) => {
  const { integration } = useContext(AppContext)!;

  const accountLookup = accounts.reduce(
    (acc, account) => {
      acc[account.address] = account;
      return acc;
    },
    {} as Record<string, Account>
  );

  const [account, setAccount] = useState<Account>(accounts[0]);
  const [validator, setValidator] = useState<string>(
    "tnam1qydvhqdu2q2vrgvju2ngpt6yhrehu525pus6m28p"
  );
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [bonds, setBonds] = useState<Bond[]>([]);

  const [error, setError] = useState<string>();
  const [status, setStatus] = useState(Status.Completed);
  const [statusText, setStatusText] = useState<string>();
  const [responseDetails, setResponseDetails] = useState<TransferResponse>();

  const accountsSelectData = accounts.map(({ alias, address }) => ({
    label: `${alias} - ${shortenAddress(address)}`,
    value: address,
  }));

  const validatorSelectData = [
    {
      label: "Kintsugi Nodes",
      value: "tnam1qydvhqdu2q2vrgvju2ngpt6yhrehu525pus6m28p",
    },
    {
      label: "Dimi",
      value: "kintsugi-2",
    },
  ];

  const isFormValid: boolean = true;

  const handleSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      if (!account || !validator || !amount) {
        console.log(account, validator, amount);
        console.error("Please provide the required values!");
        return;
      }

      // Init SDK
      let { tx } = await getSdkInstance();

      // Prepare tx
      const bondProps: BondProps = {
        source: account.address,
        validator: validator,
        amount: new BigNumber(amount),
      };

      const wrapperTxProps: WrapperTxProps = {
        token: "tnam1qqzywyugkgpp9ptl3702ld8k79lv0memlurnh2hh",
        feeAmount: new BigNumber(0),
        gasLimit: new BigNumber(0),
        chainId: "namada-genesis",
        publicKey: account.publicKey ?? "",
        memo: "",
      };

      const txs: TxProps[] = [];
      const bondTx = await tx.buildBond(wrapperTxProps, bondProps);
      txs.push(bondTx);

      const checksums: Record<string, string> = {
        "tx_bond.wasm":
          "0000000000000000000000000000000000000000000000000000000000000000",
      };

      let signer = integration.signer();

      let result = await signer?.sign(txs, account.address, checksums);

      if (!result) {
        console.error("No result from signing");
        return;
      }

      let bonds: Bond[] = [];
      for (const res of result) {
        let signatures = new Map<string, string>();

        let signResponse = await tx.getTxSignature(
          result[0],
          account.publicKey ?? ""
        );

        signResponse.signatures.forEach((s: TxSignature) => {
          signatures.set(s.pub_key, s.signature);
        });

        bonds.push({
          ...bondProps,
          source: account.publicKey ?? "",
          signatures,
        });
      }
      setBonds(bonds);
    },
    [account, validator, amount]
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

      <InputContainer>
        <Select
          data={validatorSelectData}
          value={validator}
          label="Validator"
          onChange={(e) => setValidator(e.target.value)}
        />
      </InputContainer>

      <InputContainer>
        <AmountInput
          placeholder={`From 1 to ${5000}`}
          label="Amount"
          value={amount === undefined ? undefined : new BigNumber(amount)}
          min={0}
          maxDecimalPlaces={3}
          onChange={(e) => setAmount(e.target.value?.toNumber())}
          error={
            amount && amount > 5000 ?
              `Amount must be less than or equal to ${5000}`
            : ""
          }
        />
      </InputContainer>
      <FormStatus>
        {bonds.length > 0 && (
          <div className="w-full font-mono break-all">
            {bonds.map((bond, i) => (
              <p className="mt-4" key={i}>
                [[bond]] <br />
                source = "{bond.source}"
                <br />
                validator = "{bond.validator}" <br />
                amount = "{bond.amount.toString()}" <br />
                <br />
                [bond.signatures]
                <br />
                {Array.from(bond.signatures).map(([key, value]) => (
                  <div key={key}>
                    {key} = "{value}"
                  </div>
                ))}
              </p>
            ))}
          </div>
        )}
      </FormStatus>

      {status !== Status.Error && (
        <FormStatus>
          {status === Status.PendingPowSolution && (
            <InfoContainer>
              <Alert type="warning">Computing POW Solution...</Alert>
            </InfoContainer>
          )}
          {status === Status.PendingTransfer && (
            <InfoContainer>
              <Alert type="warning">Processing Faucet Transfer..</Alert>
            </InfoContainer>
          )}
          {status === Status.Completed && statusText && (
            <InfoContainer>
              <Alert type="info">{statusText}</Alert>
            </InfoContainer>
          )}

          {responseDetails &&
            status !== Status.PendingPowSolution &&
            status !== Status.PendingTransfer && (
              <PreFormatted>
                {JSON.stringify(responseDetails, null, 2)}
              </PreFormatted>
            )}
        </FormStatus>
      )}
      {status === Status.Error && <Alert type="error">{error}</Alert>}

      <ButtonContainer>
        <ActionButton
          backgroundHoverColor="yellow"
          textHoverColor="black"
          outlineColor="yellow"
          className={`max-w-fit ${!isFormValid && "opacity-50"}`}
          color="cyan"
          onClick={handleSubmit}
          disabled={!isFormValid}
        >
          Sign Bond
        </ActionButton>
      </ButtonContainer>
    </GenesisFormContainer>
  );
};
