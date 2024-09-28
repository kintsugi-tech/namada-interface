import BigNumber from "bignumber.js";
import { useCallback, useState } from "react";

import { ActionButton, Alert, AmountInput, Select } from "@namada/components";
import { Account } from "@namada/types";
import { shortenAddress } from "@namada/utils";

import { TransferResponse } from "../utils";
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
  const accountLookup = accounts.reduce(
    (acc, account) => {
      acc[account.address] = account;
      return acc;
    },
    {} as Record<string, Account>
  );

  const [account, setAccount] = useState<Account>(accounts[0]);
  const [validator, setValidator] = useState<string>();
  const [amount, setAmount] = useState<number | undefined>(undefined);
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
      value: "kintsugi-1",
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

      // do nothing

      alert("click");
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
          Get Testnet Tokens
        </ActionButton>
      </ButtonContainer>
    </GenesisFormContainer>
  );
};
