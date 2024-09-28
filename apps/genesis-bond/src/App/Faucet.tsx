import BigNumber from "bignumber.js";
import { sanitize } from "dompurify";
import { useCallback, useMemo, useState } from "react";

import {
  ActionButton,
  Alert,
  AmountInput,
  Input,
  Select,
} from "@namada/components";
import { Account } from "@namada/types";
import { bech32mValidation, shortenAddress } from "@namada/utils";

import { Data, PowChallenge, TransferResponse } from "../utils";
import {
  ButtonContainer,
  InfoContainer,
  InputContainer,
} from "./App.components";
import {
  FaucetFormContainer,
  FormStatus,
  PreFormatted,
} from "./Faucet.components";

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

const bech32mPrefix = "tnam";

export const FaucetForm: React.FC<Props> = ({ accounts, isTestnetLive }) => {
  const accountLookup = accounts.reduce(
    (acc, account) => {
      acc[account.address] = account;
      return acc;
    },
    {} as Record<string, Account>
  );

  const [account, setAccount] = useState<Account>(accounts[0]);
  const [tokenAddress, setTokenAddress] = useState<string>();
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState(Status.Completed);
  const [statusText, setStatusText] = useState<string>();
  const [responseDetails, setResponseDetails] = useState<TransferResponse>();

  const accountsSelectData = accounts.map(({ alias, address }) => ({
    label: `${alias} - ${shortenAddress(address)}`,
    value: address,
  }));

  const powSolver: Worker = useMemo(
    () => new Worker(new URL("../workers/powWorker.ts", import.meta.url)),
    []
  );

  const isFormValid: boolean =
    Boolean(tokenAddress) &&
    Boolean(amount) &&
    (amount || 0) <= 5 &&
    Boolean(account) &&
    status !== Status.PendingPowSolution &&
    status !== Status.PendingTransfer &&
    isTestnetLive;

  const submitFaucetTransfer = async (submitData: Data): Promise<void> => {
    // do nothing
  };

  const postPowChallenge = (powChallenge: PowChallenge): Promise<string> =>
    new Promise((resolve) => {
      powSolver.onmessage = ({ data }) => {
        resolve(data);
        powSolver.onmessage = null;
      };
      powSolver.postMessage(powChallenge);
    });

  const handleSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!account || !amount || !tokenAddress) {
        console.error("Please provide the required values!");
        return;
      }

      // Validate target and token inputs
      const sanitizedToken = sanitize(tokenAddress);

      if (!sanitizedToken) {
        setStatus(Status.Error);
        setError("Invalid token address!");
        return;
      }

      if (!account) {
        setStatus(Status.Error);
        setError("No account found!");
        return;
      }

      if (!bech32mValidation(bech32mPrefix, sanitizedToken)) {
        setError("Invalid bech32m address for token address!");
        setStatus(Status.Error);
        return;
      }

      setStatus(Status.PendingPowSolution);
      setStatusText(undefined);

      // do nothing
    },
    [account, tokenAddress, amount]
  );

  return (
    <FaucetFormContainer>
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
        <Input
          label="Token Address (defaults to NAM)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          autoFocus={true}
        />
      </InputContainer>

      <InputContainer>
        <AmountInput
          placeholder={`From 1 to ${5}`}
          label="Amount"
          value={amount === undefined ? undefined : new BigNumber(amount)}
          min={0}
          maxDecimalPlaces={3}
          onChange={(e) => setAmount(e.target.value?.toNumber())}
          error={
            amount && amount > 4 ?
              `Amount must be less than or equal to ${5}`
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
    </FaucetFormContainer>
  );
};
