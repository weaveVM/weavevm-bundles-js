import * as constants from "../constants"
import { ethers, SignatureLike, Signature } from "ethers"
import { SignatureData, Tag } from "../structs"

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
  data: Uint8Array = new Uint8Array()
  to: string = "0x0000000000000000000000000000000000000000"
  signature?: Signature
  hash?: string
  tagsSizeLimit: number = 2048;
  tags: Map<string, string>=new Map();

  constructor(data: Uint8Array = new Uint8Array(), to: string = "0x0000000000000000000000000000000000000000") {
    this.data = data
    this.to = to
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
      to: this.to,
      data: "0x" + Buffer.from(this.data).toString("hex"),
    }
  }

  withData(data: Uint8Array): this {
    this.data = data
    return this
  }

  withTo(to: string): this {
    this.to = to
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
      to: this.to,
      input: "0x" + Buffer.from(this.data).toString("hex"),
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
      ...(this.tags.size&&({
        tags: [...this.tags.entries()].map((tag)=>({
          name:tag[0],
          value:tag[1]
        }))
      }))// Only exports tags field if there's non-0 amount of tags
    }
  }

  fromBundledEnvelope(bundledEnvelope: any): this {
    this.data = new Uint8Array(Buffer.from(bundledEnvelope.input.slice(2), "hex"))
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
    this.to = bundledEnvelope.to
    this.value = bundledEnvelope.value
    this.tags=new Map((bundledEnvelope.tags||[]).map((tag:Tag)=>([tag.name,tag.value])))
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
