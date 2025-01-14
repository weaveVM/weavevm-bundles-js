// test/bundler.test.js
const expect=require('expect.js')
const {
  Bundle,
} = require('../dist/index'); 
let constants = require("../dist/constants")
let ethers = require("ethers")

describe('WeaveVM Bundler Tests', function () {
  this.timeout(120_000);

  it('test_bundle_retrieval', async function () {
    const bundleTxid = '0xc8ec20bd3ef5f692a9058614c231e2ad343db0825404437f5af9f1a655e8f724';


        let provider = new ethers.JsonRpcProvider(constants.WVM_RPC_URL, {
            chainId: constants.CHAIN_ID,
            name: 'wvm-testnet',
        })
        let tx = await provider.getTransaction(bundleTxid)

        let bundle=new Bundle().fromTransaction(tx)
        expect(bundle.envelopes).to.not.be.empty()
        expect(bundle.envelopes[0]?.hash).to.be("0xc8889322be2dec1c535f7668ac84701cbfbddf1a864e31e661ad593aa109a8b1")
    
  });

});
