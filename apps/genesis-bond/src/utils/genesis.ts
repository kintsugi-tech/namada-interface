import initSdk from "@heliax/namada-sdk/inline-init";
import { getSdk, Sdk, Tx } from "@heliax/namada-sdk/web";
import {
  Account,
  BondProps,
  TxMsgValue,
  TxSignature,
  WrapperTxProps,
} from "@namada/types";
import BigNumber from "bignumber.js";

export async function getSdkInstance(): Promise<Sdk> {
  const { cryptoMemory } = await initSdk();

  const sdk = getSdk(
    cryptoMemory,
    "https://rpc.namada.tududes.com", // I don't really understand why we are forced to set an RPC even if we are not using it..
    "",
    "tnam1qqzywyugkgpp9ptl3702ld8k79lv0memlurnh2hh"
  );
  return sdk;
}

export type Bond = {
  source: string;
  validator: string;
  amount: BigNumber;
  signatures: TxSignature[];
};

export type Validator = {
  address: string;
  alias: string;
  commission: string;
  maxCommissionRateChange: string;
  totalVotingPower: string;
  email: string;
  website: string;
  totalDelegations: string;
};

export async function loadValidators(): Promise<
  { label: string; value: string }[]
> {
  console.log("Evn process", process.env);
  const data = await fetch(
    `${process.env.NAMADA_INTERFACE_GENESIS_API_URL ?? "http://127.0.0.1:3000"}/validators`
  );

  if (!data.ok) {
    throw new Error(`Unable to load validators from API ${data.status}`);
  }
  const validators = (await data.json()) as Validator[];

  // shuffle validators
  validators.sort(() => Math.random() - 0.5);

  return validators.map((v) => {
    const alias = v.alias != "Unknown alias" ? v.alias : v.address;

    return {
      label:
        parseFloat(v.commission) > 15 ? alias + " ⚠️ High Commission" : alias,
      value: v.address,
    };
  });
}

export async function getBondTx(
  sdk: Tx,
  bondProps: BondProps,
  account: Account
): Promise<TxMsgValue> {
  const wrapperTxProps: WrapperTxProps = {
    token: "tnam1qqzywyugkgpp9ptl3702ld8k79lv0memlurnh2hh",
    feeAmount: new BigNumber(0),
    gasLimit: new BigNumber(0),
    chainId: "namada-genesis",
    publicKey: account.publicKey ?? "",
    memo: "",
  };

  return await sdk.buildBond(wrapperTxProps, bondProps);
}
