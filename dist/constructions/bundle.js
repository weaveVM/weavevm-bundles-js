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
exports.Bundle = void 0;
const zlib = __importStar(require("zlib"));
const envelope_1 = require("./envelope");
const constants = __importStar(require("../constants"));
const structs_1 = require("../structs");
class Bundle {
    to = constants.ADDRESS_BABE1;
    chain_id = constants.CHAIN_ID;
    envelopes = [];
    signature;
    hash;
    constructor(envelopes = []) {
        this.envelopes = envelopes;
    }
    addEnvelope(envelope) {
        if (!(envelope instanceof envelope_1.Envelope)) {
            throw new TypeError("Envelope has to be instance of Envelope");
        }
        if (!envelope.hash || !envelope.signature || !envelope.sender) {
            throw new Error("Envelope has to be signed before being added to Bundle");
        }
        this.envelopes.push(envelope);
    }
    extractBorshableCalldata() {
        return this.envelopes.map((envelope) => envelope.extractBorshable());
    }
    borshCalldata() {
        const borshOutBuffer = Buffer.alloc(structs_1.BundleData.span);
        structs_1.BundleData.encode(this.extractBorshableCalldata(), borshOutBuffer);
        return borshOutBuffer;
    }
    compressAndBorshCalldata() {
        return zlib.brotliCompressSync(this.borshCalldata());
    }
    get input() {
        return this.compressAndBorshCalldata();
    }
    setSignedAttributes(signedBundleTransaction) {
        this.signature = signedBundleTransaction.signature;
        this.hash = signedBundleTransaction.hash;
    }
    fromTransaction(bundleTransaction) {
        if (bundleTransaction.to !== this.to) {
            throw new Error("Bundle transaction goes to wrong address!");
        }
        const decompressedBundleData = zlib.brotliDecompressSync(Buffer.from(bundleTransaction.data.slice(2), "hex"));
        const parsedBundleData = structs_1.BundleData.decode(decompressedBundleData);
        const envelopes = parsedBundleData.envelopes.map((env) => new envelope_1.Envelope().fromBundledEnvelope(env));
        if (!envelopes.every((e) => e.isValid())) {
            throw new Error("Not every Envelope is valid!");
        }
        if (bundleTransaction.signature)
            this.signature = bundleTransaction.signature;
        if (bundleTransaction.hash)
            this.hash = bundleTransaction.hash;
        this.envelopes = envelopes;
        return this;
    }
    extractTransaction() {
        return {
            to: this.to,
            chain_id: this.chain_id,
            ...(this.hash && { hash: this.hash }),
            ...(this.signature && { signature: this.signature }),
            data: '0x' + this.compressAndBorshCalldata().toString('hex'),
        };
    }
}
exports.Bundle = Bundle;
