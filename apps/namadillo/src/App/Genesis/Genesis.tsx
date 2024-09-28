import initSdk from "@heliax/namada-sdk/inline-init";
import { getSdk, Sdk } from "@heliax/namada-sdk/web";
import { ActionButton } from "@namada/components";
import { BondProps, TxProps, WrapperTxProps } from "@namada/types";
import { nativeTokenAddressAtom } from "atoms/chain";
import { rpcUrlAtom } from "atoms/settings";
import BigNumber from "bignumber.js";
import { getDefaultStore } from "jotai";
import { useState } from "react";

export const Genesis = () => {
  let [account, setAccount] = useState<any>();
  let [signer, setSigner] = useState<any>();
  let [chain, setChain] = useState<any>();

  async function getSdkInstance(): Promise<Sdk> {
    const { cryptoMemory } = await initSdk();
    const store = getDefaultStore();
    const rpcUrl = store.get(rpcUrlAtom);
    const nativeToken = store.get(nativeTokenAddressAtom);

    if (!nativeToken.isSuccess) {
      throw "Native token not loaded";
    }

    const sdk = getSdk(cryptoMemory, rpcUrl, "", nativeToken.data);
    return sdk;
  }

  async function connect() {
    await window.namada.connect();
    let signer = await window.namada.getSigner();
    let account = await signer.defaultAccount();
    let chain = await window.namada.getChain();

    console.log("signer", signer);
    console.log("account", account);

    setSigner(signer);
    setAccount(account);
    setChain(chain);
  }

  async function sign() {
    // Props
    const bondProps: BondProps = {
      source: "tnam1qr8983etxg34sr42a5h7xklqspg7hm05luqf2txv", // "tnam1qr8983etxg34sr42a5h7xklqspg7hm05luqf2txv",
      validator: "tnam1qydvhqdu2q2vrgvju2ngpt6yhrehu525pus6m28p",
      amount: new BigNumber(69),
    };

    const wrapperTxProps: WrapperTxProps = {
      token: "tnam1qqzywyugkgpp9ptl3702ld8k79lv0memlurnh2hh",
      feeAmount: new BigNumber(0),
      gasLimit: new BigNumber(0),
      chainId: "namada-genesis",
      publicKey:
        "tpknam1qqqfl5ad6s3kfvev9vjzjnc23ntpk9kwm5p0f7ptaaghmfu0clc3xeqx2dy",
      memo: "",
    };

    let { tx } = await getSdkInstance();

    const txs: TxProps[] = [];
    const bondTx = await tx.buildBond(wrapperTxProps, bondProps);
    txs.push(bondTx);

    // Probabily this will be needed for multi-validator delegation
    // const txProps: TxProps[] = [];
    // txProps.push(tx.buildBatch(txs));

    // console.log(txProps);

    const checksums: Record<string, string> = {
      "tx_bond.wasm":
        "0000000000000000000000000000000000000000000000000000000000000000",
    };

    let result = await signer.sign(
      txs,
      "tnam1qr8983etxg34sr42a5h7xklqspg7hm05luqf2txv",
      checksums
    );

    let test = await tx.getTxSignature(
      result[0],
      "tpknam1qqqfl5ad6s3kfvev9vjzjnc23ntpk9kwm5p0f7ptaaghmfu0clc3xeqx2dy"
    );

    console.log("we got it!", test);
  }

  return (
    <main className="w-full text-white">
      <div className="max-w-md flex flex-row gap-4">
        <ActionButton
          className="border uppercase"
          onClick={() => connect()}
          size="sm"
          backgroundColor="cyan"
          outlineColor="cyan"
          textColor="black"
          textHoverColor="cyan"
          backgroundHoverColor="transparent"
        >
          Connect
        </ActionButton>

        <ActionButton
          className="border uppercase"
          onClick={() => sign()}
          size="sm"
          backgroundColor="cyan"
          outlineColor="cyan"
          textColor="black"
          textHoverColor="cyan"
          backgroundHoverColor="transparent"
        >
          Sign
        </ActionButton>
      </div>
      <div className="flex flex-col gap-4">
        {account && (
          <>
            <p>
              Account: {account.alias} <br />
              Address: {account.address} <br />
              Public Key: {account.publicKey}
            </p>
          </>
        )}
      </div>
    </main>
  );
};
