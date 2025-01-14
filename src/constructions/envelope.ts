import * as constants from "../constants"
import { ethers, SignatureLike, Signature } from "ethers"
import { SignatureData } from "./bundle"

export interface SignedEnvelopeTransaction {
  signature: SignatureData
  hash: string
}

export class Envelope {
  chain_id: number = constants.CHAIN_ID
  nonce: number | string = 0
  gasPrice: string = "0"
  gasLimit: number | string = 0
  value: string = "0"
  type: number = 0
  dataField: Uint8Array = new Uint8Array()
  toField: string = "0x0000000000000000000000000000000000000000"
  signature?: Signature
  hash?: string

  constructor(data: Uint8Array = new Uint8Array(), to: string = "0x0000000000000000000000000000000000000000") {
    this.dataField = data
    this.toField = to
  }

  get sender() {
    if (!this.hash || !this.signature) return undefined
    return ethers.recoverAddress(this.hash, this.signature )
  }

  setSignedAttributes(signedEnvelopeTransaction: SignedEnvelopeTransaction) {
    this.signature = signedEnvelopeTransaction.signature as Signature
    this.hash = signedEnvelopeTransaction.hash
  }

  extractUnsigned() {
    return {
      chainId: this.chain_id,
      nonce: "0",
      gasPrice: "0",
      gasLimit: "0",
      value: "0",
      type: 0,
      to: this.toField,
      data: "0x" + Buffer.from(this.dataField).toString("hex"),
    }
  }

  withData(data: Uint8Array): this {
    this.dataField = data
    return this
  }

  withTo(to: string): this {
    this.toField = to
    return this
  }

  extractBorshable() {
    return {
      chainId: this.chain_id,
      nonce: 0,
      gasPrice: 0,
      gasLimit: 0,
      value: 0,
      type: 0,
      to: this.toField,
      input: "0x" + Buffer.from(this.dataField).toString("hex"),
      hash: this.hash,
      signature: {
        y_parity: this.signature
          ? this.signature.v
            ? this.signature.v % 2 === 1
            : !!this.signature.yParity
          : false,
        r: this.signature ? this.signature?.r : "",
        s: this.signature ? this.signature?.s : "",
      },
    }
  }

  fromBundledEnvelope(bundledEnvelope: any): this {
    this.dataField = new Uint8Array(Buffer.from(bundledEnvelope.input.slice(2), "hex"))
    this.nonce = bundledEnvelope.nonce.toString(10)
    this.chain_id = Number(bundledEnvelope.chain_id.toString(10))
    this.signature = Signature.from({
      yParity: bundledEnvelope.signature.y_parity ? 1 : 0,
      r: bundledEnvelope.signature.r,
      s: bundledEnvelope.signature.s,
      
    })
    this.hash = bundledEnvelope.hash
    this.gasPrice = bundledEnvelope.gas_price.toString(10)
    this.gasLimit = bundledEnvelope.gas_limit.toString(10)
    this.toField = bundledEnvelope.to
    this.value = bundledEnvelope.value
    return this
  }

  isValid() {
    try {
      this.sender
    } catch {
      return false
    }
    if (this.nonce !== 0 && this.nonce !== "0") return false
    return true
  }
}
