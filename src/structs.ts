import * as borsh from "@project-serum/borsh"
export interface SignatureData {
    r: string
    s: string
    v?: number
    yParity?: number
}

export interface SignedBundleTransaction {
    signature: SignatureData
    hash: string
}

export interface BundleTransaction {
    to: string
    data: string
    signature?: SignatureData
    hash?: string
}
export interface Tag {
    name: string
    value: string
}

export const EnvelopeSignatureLayout = borsh.struct([
    borsh.bool("y_parity"),
    borsh.str("r"),
    borsh.str("s"),
])

export const TagLayout = borsh.struct([
    borsh.str("name"),
    borsh.str("value")
])

export const TxEnvelopeWrapperLayout = borsh.struct([
    borsh.u64("chain_id"),
    borsh.u64("nonce"),
    borsh.u128("gas_price"),
    borsh.u64("gas_limit"),
    borsh.str("to"),
    borsh.str("value"),
    borsh.str("input"),
    borsh.str("hash"),
    EnvelopeSignatureLayout.replicate("signature"),
    borsh.option(borsh.vec(TagLayout),"tags")
])

export const BundleData = borsh.struct([
    borsh.vec(TxEnvelopeWrapperLayout, "envelopes"),
])