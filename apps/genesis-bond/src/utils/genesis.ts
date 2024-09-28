import initSdk from "@heliax/namada-sdk/inline-init";
import { getSdk, Sdk } from "@heliax/namada-sdk/web";
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
  signatures: Map<string, string>;
};
