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
    const bundleTxid = '0x9bf22d08777d8c291480ec34c578b49cd5be577ad6dbb5836bdc9b11ec18846b';


        let provider = new ethers.JsonRpcProvider(constants.WVM_RPC_URL, {
            chainId: constants.CHAIN_ID,
            name: 'wvm-testnet',
        })
        let tx = await provider.getTransaction(bundleTxid)

        let bundle=new Bundle().fromTransaction(tx)
       
        expect(bundle.envelopes).to.not.be.empty()
        expect(bundle.envelopes[0]?.hash).to.be("0xa9aae96f25e5f7a497661c476ad4707ffc94394967285540d152907d841e2024")
        expect(bundle.envelopes[0].tags.get("Content-Type")).to.be("text/plain")
        
    
  });

});
