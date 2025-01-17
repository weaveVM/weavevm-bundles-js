# WeaveVM Bundles JS/TS

This library provides JS/TS primitives and utilities for working with [WeaveVM Bundles](https://github.com/weaveVM/bundler?tab=readme-ov-file#protocol-specification). 

> **Note**: This library is primarily intended for Node.js usage. Some parts (e.g., `zlib` operations) might not work directly in the browser without polyfills or bundling tools.

It also relies on [ethers.js](https://docs.ethers.org/v6/) for transaction signatures and address utilities.

## Motivation

The goal of this library is to provide an easy way for JavaScript developers to construct **envelopes** and **bundles**, sign them, compress them, and prepare them for WeaveVM.

## Installation

To install this library, use NPM:

```bash
npm i weavevm-bundles
```

## Usage

This library exposes two main classes:

- **`Envelope`** – Represents an individual transaction envelope, including fields like `to`, `nonce`, `signature`, and `hash`.
- **`Bundle`** – A container that holds multiple `Envelope` instances, allowing them to be compressed, serialized, and ultimately sent as a single transaction to WeaveVM.

You will also want [ethers.js](https://docs.ethers.org/v6/) to manipulate and sign transactions.

### Importing

```js
import { Envelope, Bundle } from "weavevm-bundles";
// Also import ethers for signing/verification/broadcasting:
import { ethers } from "ethers";
```

---

## Envelope

An **`Envelope`** wraps a transaction-like structure: it has fields such as `chain_id`, `nonce`, `to`, `data`, as well as optional `signature` and `hash`. 

```ts
class Envelope {
  chain_id: number = 9496;
  nonce: number | string = 0;
  gasPrice: string = "0";
  gasLimit: number | string = 0;
  value: string = "0";
  type: number = 0;
  data: Uint8Array = new Uint8Array();
  to: string = "0x0000000000000000000000000000000000000000";
  signature?: Signature;  // ethers.js Signature
  hash?: string;//Tx hash, set after signing (via setSignedAttributes)
  tagsSizeLimit: number = 2048;
  tags: Map<string, string> = new Map();
}
```

### Creating a new Envelope

You can create a new envelope by specifying its data (as a `Uint8Array`) and its destination address (optional):

```js
const envelope = new Envelope(
  new Uint8Array(Buffer.from("My Envelope Data")),
  "0xTargetAddressHere"
);
//Or
const envelope = new Envelope(
  new Uint8Array(Buffer.from("My Envelope Data"))
);
```

By default, `chain_id` is 9496 (WeaveVM Testnet), it can be adjusted as desired. `nonce`, gas related params must be 0 so that transaction is invalid on WeaveVM.

### Adding data or changing the `to` address fluently

Use the chainable methods `.withData()` and `.withTo()` to modify the envelope:

```js
envelope
  .withData(new Uint8Array(Buffer.from("Some new data")))
  .withTo("0xSomeOtherAddress");
```
### Signing an Envelope

Envelopes are designed to hold a signature and a `hash` for ensuring authenticity.  
**Important**: You should sign the Envelope **as a transaction** rather than a raw message. Here’s how:

```js
import { ethers } from "ethers";
import { Envelope } from "weavevm-bundles";

(async () => {
  // Create or obtain a wallet
  const wallet = ethers.Wallet.createRandom();

  // Create an Envelope
  const envelope = new Envelope(
    new Uint8Array(Buffer.from("Some envelope data")),
    "0x0000000000000000000000000000000000000000"// Target is optional
  );
  // Optional: Set tags
  envelope.tags.set("Content-Type", "text/plain")

  // Extract an unsigned transaction object (ethers-compatible)
  const unsignedTx = envelope.extractUnsigned();

  // Sign the transaction
  const signedTxHex = await wallet.signTransaction(unsignedTx);

  // Parse the signed transaction to retrieve signed attributes
  const signedTx = ethers.Transaction.from(signedTxHex);

  // Attach the signature & hash onto the Envelope
  envelope.setSignedAttributes({
    signature: signedTx.signature,
    hash: signedTx.hash,
  });
  //Now Envelope should be valid and can be added to bundle


})();
```
### Validating an Envelope

When `signature` and `hash` are set, the envelope can derive its `sender`:

```js
console.log("Envelope sender:", envelope.sender);
// If there's an error recovering address, isValid() will fail:
console.log("Is the Envelope valid?", envelope.isValid());
```

**`envelope.isValid()`** ensures that transaction is invalid for the blockchain, but valid to be included in the bundle.
### Extracting the Envelope
You might want to extract serialized Envelope transaction for submitting to bundler service. 

You can do it by keeping signed data (after `wallet.signTransaction(envelope.extractUnsigned())`), or calling extractSigned():
```js
envelope.extractSigned()
```
---
## Bundle

A **`Bundle`** aggregates multiple `Envelope` instances and provides:

- **Borsh** serialization of all included envelopes.
- **Compression** via `brotli`.
- High-level logic for setting overall bundle signatures and hash.

```ts
class Bundle {
  envelopes: Envelope[] = [];
  signature?: SignatureData;
  hash?: string;
}
```

### Creating a Bundle

```js
const bundle = new Bundle();
```

Or you can optionally pass an array of envelopes:

```js
const envelope1 = new Envelope(/* ... */);
const envelope2 = new Envelope(/* ... */);
const bundle = new Bundle([envelope1, envelope2]);
```

### Adding Envelopes

Use `.addEnvelope()` to add a new envelope. It requires that each envelope be **signed** (i.e., it has a `hash`, `signature`, thus a valid `sender`):

```js
bundle.addEnvelope(envelope1);
bundle.addEnvelope(envelope2);
```

### Borsh Serialization & Compression
Bundle class manages borsh-ing and compression for you, no need to worry about that.

### Extracting the Bundle Transaction

`extractTransaction()` returns a minimal object representing ethers.js transaction-like object you have to sign and submit to weavevm. It includes:

- `to` – The special WeaveVM contract address (`ADDRESS_BABE1`).
- `chain_id`.
- `hash` and `signature` if present.
- `data` – The compressed, Borsh-serialized envelopes.

```js
const txObject = bundle.extractTransaction();
// txObject looks like:
// {
//   to: "0xBABE1...",
//   chain_id: 9496,
//   data: <0x(Serialized+compressed envelopes, hex-ed)>,
//   hash: "...",           // if signature was set
//   signature: {...},      // if signature was set
// }
```

### Restoring a Bundle from an On-chain Transaction

If you’ve retrieved a bundle transaction from the WeaveVM network (e.g., via `ethers.getTransaction()`), you can decompress and parse it by calling **`fromTransaction()`**:

```js
const provider = new ethers.JsonRpcProvider("https://testnet-rpc.wvm.dev", {
  chainId: 9496,
  name: 'wvm-testnet',
});

(async () => {
  const tx = await provider.getTransaction("0xYourBundleTxHashHere");
  
  // Reconstruct the Bundle from the on-chain transaction
  const restoredBundle = new Bundle().fromTransaction(tx);
  
  console.log("Restored bundle envelopes:", restoredBundle.envelopes);

})();
```

Internally, **`fromTransaction()`**:

1. Verifies the `to` address matches the expected WeaveVM address.
2. Decompresses the `data` field (assuming hex encoding).
3. Borsh-decodes the envelopes into `Envelope` objects.
4. Validates each envelope.
5. Sets any top-level `hash` and `signature` if provided.

---

## Example End-to-End Flow

Below is a simplified end-to-end usage example:

```js
import { Envelope, Bundle } from "weavevm-bundles";
import { ethers } from "ethers";

(async () => {
  // Create a wallet (for demonstration; you'd normally have an existing private key or mnemonic)
  const wallet = ethers.Wallet.createRandom();

  // Create an Envelope with some data (nonce, gasPrice, gasLimit, etc. are all zero by default)
  const envelope = new Envelope(
    new Uint8Array(Buffer.from("test-data", "utf8")),
    "0x0000000000000000000000000000000000000000"
  );

  // Extract an unsigned ethers.js transaction
  const unsignedTx = envelope.extractUnsigned();

  // Sign the transaction
  // (Though 0 gas price/limit is invalid in a real EVM sense, this demonstrates the mechanics)
  const signedTxHex = await wallet.signTransaction(unsignedTx);
  const signedTx = ethers.Transaction.from(signedTxHex);

  // Attach signature & hash to the envelope
  envelope.setSignedAttributes(signedTx);

  console.log("Envelope is valid?", envelope.isValid());

  // Create a Bundle and add the Envelope
  const bundle = new Bundle();
  bundle.addEnvelope(envelope);

  // Prepare the final transaction data
  const txData = bundle.extractTransaction();

  console.log("Final bundle transaction data:", txData);

  // Send this transaction via ethers.js
  const provider = new ethers.JsonRpcProvider("https://testnet-rpc.wvm.dev", {
    chainId: 9496,
    name: "wvm-testnet",
  });
  const walletWithProvider = wallet.connect(provider);

  try {
    const response = await walletWithProvider.sendTransaction(txData);
    console.log("Transaction sent! Hash:", response.hash);
    await response.wait();
    console.log("Transaction confirmed!");
  } catch (err) {
    console.error("Transaction failed:", err);
  }
})();
```

---

## Contributing
If you want to propose some changes for the bundles protocol, please make a PR into the [Rust version of this library](https://github.com/weaveVM/bundler), which is the upstream library that this TS/JS port closely mirrors.
