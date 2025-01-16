"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Envelope = void 0;
const constants = __importStar(require("../constants"));
const ethers_1 = require("ethers");
class Envelope {
    chain_id = constants.CHAIN_ID;
    nonce = 0;
    gasPrice = "0";
    gasLimit = 0;
    value = "0";
    type = 0;
    data = new Uint8Array();
    to = "0x0000000000000000000000000000000000000000";
    signature;
    hash;
    tagsSizeLimit = 2048;
    tags = new Map();
    constructor(data = new Uint8Array(), to = "0x0000000000000000000000000000000000000000") {
        this.data = data;
        this.to = to;
    }
    get sender() {
        if (!this.hash || !this.signature)
            return undefined;
        return ethers_1.ethers.recoverAddress(this.hash, this.signature);
    }
    setSignedAttributes(signedEnvelopeTransaction) {
        this.signature = signedEnvelopeTransaction.signature;
        this.hash = signedEnvelopeTransaction.hash;
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
        };
    }
    withData(data) {
        this.data = data;
        return this;
    }
    withTo(to) {
        this.to = to;
        return this;
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
            ...(this.tags.size && ({
                tags: [...this.tags.entries()].map((tag) => ({
                    name: tag[0],
                    value: tag[1]
                }))
            })) // Only exports tags field if there's non-0 amount of tags
        };
    }
    fromBundledEnvelope(bundledEnvelope) {
        this.data = new Uint8Array(Buffer.from(bundledEnvelope.input.slice(2), "hex"));
        this.nonce = bundledEnvelope.nonce.toString(10);
        this.chain_id = Number(bundledEnvelope.chain_id.toString(10));
        this.signature = ethers_1.Signature.from({
            yParity: bundledEnvelope.signature.y_parity ? 1 : 0,
            r: bundledEnvelope.signature.r,
            s: bundledEnvelope.signature.s,
        });
        this.hash = bundledEnvelope.hash;
        this.gasPrice = bundledEnvelope.gas_price.toString(10);
        this.gasLimit = bundledEnvelope.gas_limit.toString(10);
        this.to = bundledEnvelope.to;
        this.value = bundledEnvelope.value;
        this.tags = new Map((bundledEnvelope.tags || []).map((tag) => ([tag.name, tag.value])));
        return this;
    }
    isValid() {
        try {
            this.sender;
        }
        catch {
            return false;
        }
        if (this.nonce !== 0 && this.nonce !== "0")
            return false;
        return true;
    }
}
exports.Envelope = Envelope;
