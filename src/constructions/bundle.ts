import * as zlib from "zlib"
import * as borsh from "@project-serum/borsh"
import { Envelope } from "./envelope"
import * as constants from "../constants"

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

const EnvelopeSignatureLayout = borsh.struct([
  borsh.bool("y_parity"),
  borsh.str("r"),
  borsh.str("s"),
])

const TxEnvelopeWrapperLayout = borsh.struct([
  borsh.u64("chain_id"),
  borsh.u64("nonce"),
  borsh.u128("gas_price"),
  borsh.u64("gas_limit"),
  borsh.str("to"),
  borsh.str("value"),
  borsh.str("input"),
  borsh.str("hash"),
  EnvelopeSignatureLayout.replicate("signature"),
])

const BundleData = borsh.struct([
  borsh.vec(TxEnvelopeWrapperLayout, "envelopes"),
])

export class Bundle {
  to: string = constants.ADDRESS_BABE1
  chain_id: number = constants.CHAIN_ID
  envelopes: Envelope[] = []
  signature?: SignatureData
  hash?: string

  constructor(envelopes: Envelope[] = []) {
    this.envelopes = envelopes
  }

  addEnvelope(envelope: Envelope) {
    if (!(envelope instanceof Envelope)) {
      throw new TypeError("Envelope has to be instance of Envelope")
    }
    if (!envelope.hash || !envelope.signature || !envelope.sender) {
      throw new Error("Envelope has to be signed before being added to Bundle")
    }
    this.envelopes.push(envelope)
  }

  extractBorshableCalldata() {
    return this.envelopes.map((envelope) => envelope.extractBorshable())
  }

  borshCalldata() {
    const borshOutBuffer = Buffer.alloc(BundleData.span)
    BundleData.encode(this.extractBorshableCalldata(), borshOutBuffer)
    return borshOutBuffer
  }

  compressAndBorshCalldata() {
    return zlib.brotliCompressSync(this.borshCalldata())
  }

  get input() {
    return this.compressAndBorshCalldata()
  }

  setSignedAttributes(signedBundleTransaction: SignedBundleTransaction) {
    this.signature = signedBundleTransaction.signature
    this.hash = signedBundleTransaction.hash
  }

  fromTransaction(bundleTransaction: BundleTransaction) {
    if (bundleTransaction.to !== this.to) {
      throw new Error("Bundle transaction goes to wrong address!")
    }
    const decompressedBundleData = zlib.brotliDecompressSync(
      Buffer.from(bundleTransaction.data.slice(2), "hex")
    )
    const parsedBundleData = BundleData.decode(decompressedBundleData)
    const envelopes = parsedBundleData.envelopes.map((env: any) =>
      new Envelope().fromBundledEnvelope(env)
    )
    if (!envelopes.every((e: Envelope) => e.isValid())) {
      throw new Error("Not every Envelope is valid!")
    }
    if (bundleTransaction.signature) this.signature = bundleTransaction.signature
    if (bundleTransaction.hash) this.hash = bundleTransaction.hash
    this.envelopes = envelopes
    return this
  }

  extractTransaction() {
    return {
      to: this.to,
      chain_id: this.chain_id,
      ...(this.hash && { hash: this.hash }),
      ...(this.signature && { signature: this.signature }),
      data: this.compressAndBorshCalldata(),
    }
  }
}
