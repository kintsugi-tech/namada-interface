use namada_sdk::borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug)]
#[borsh(crate = "namada_sdk::borsh")]
pub struct GenesisSignature {
    pub pub_key: String,
    pub signature: String,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug)]
#[borsh(crate = "namada_sdk::borsh")]
pub struct GetTxSignatureResponse {
    pub signatures: Vec<GenesisSignature>,
}
