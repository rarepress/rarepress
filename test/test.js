const assert = require('assert');
const fs = require('fs');
const rmfr = require('rmfr');
const diff = require('deep-diff').diff;
const Rarepress = require('../index');
const rarepress = new Rarepress()
var cid
var config;
describe('test', function() {
  before(async function() {
    await rmfr(__dirname + "/db")
    await rarepress.init({
      network: "rinkeby",
      storage: __dirname + "/db",
    })
    const buf = await fs.promises.readFile(__dirname + "/test.png")
    cid = await rarepress.add(buf)
  })
  beforeEach(async function() {
    await rarepress.db.token.del({})
    await rarepress.db.trade.del({})
    await rarepress.db.knex("creators").del()
    config = {
      token: {
        type: "ERC1155",
        metadata: {
          name: "🍞",
          description: "bread",
          image: "/ipfs/" + cid
        },
        creators: [{ account: rarepress.wallet.address, value: 10000 }],
        supply: 100
      },
      trade: (signedToken) => {
        return {
          who: {
            from: rarepress.wallet.address
          },
          what: {
            type: "ERC1155",
            id: signedToken.tokenId,
            value: 7
          },
          with: {
            type: "ETH",
            value: 42 * 10**18
          }
        }
      }
    }
  })
  describe('token', function() {
    describe("token constructor", () => {
      it("should initialize correctly with the defaults", async () => {
        const rp = new Rarepress()
        await rp.init({
          wallet: false
        })
        assert.equal(rp.token.network, "mainnet")
      })
    })
    describe("token.build()", () => {
      it('build()', async () => {
        let token = await rarepress.token.build(config.token)
        let expectedKeys = ["metadata", "creators", "royalties", "tokenId", "tokenURI", "uri", "@type", "contract"]
        for(let key of expectedKeys) {
          assert(typeof token[key] !== undefined)
        }
      })
      it("build() should reject if type is not passed", async () => {
        delete config.token.type
        await assert.rejects(async () => {
          let token = await rarepress.token.build(config.token)
        }, (err) => {
          assert.equal(err.message, "the type must be either 'ERC721' or 'ERC1155'")
          return true;
        })
      })
      it("build() with custom contract", async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        localconfig.token.contract = "<custom contract>"
        let token = await rarepress.token.build(localconfig.token)
        assert.equal(token.contract, "<custom contract>")
      })
      it('multiple builds with multiple different contracts', async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        localconfig.token.contract = "<custom contract 0>"
        let token0 = await rarepress.token.build(localconfig.token)
        localconfig.token.contract = "<custom contract 1>"
        let token1 = await rarepress.token.build(localconfig.token)
        localconfig.token.contract = "<custom contract 2>"
        let token2 = await rarepress.token.build(localconfig.token)
        assert.equal(token0.contract, "<custom contract 0>")
        assert.equal(token1.contract, "<custom contract 1>")
        assert.equal(token2.contract, "<custom contract 2>")
      })

      it("throw an error if ERC1155 doesn't have a supply attribute", async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        delete localconfig.token.supply
        await assert.rejects(async () => {
          let token = await rarepress.token.build(localconfig.token)
        }, (err) => {
          assert.equal(err.message, "ERC1155 should have a supply attribute greater than or equal to 1")
          return true;
        })

      })
      it("throw an error if ERC1155 has a supply attribute of 0", async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        localconfig.token.supply = 0
        await assert.rejects(async () => {
          let token = await rarepress.token.build(localconfig.token)
        }, (err) => {
          assert.equal(err.message, "ERC1155 should have a supply attribute greater than or equal to 1")
          return true;
        })
      })
      it("does not throw an error if trying to build ERC1155 with 'supply' greater than or equal to 1", async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        localconfig.token.supply = 1
        await assert.doesNotReject(async () => {
          let token = await rarepress.token.build(localconfig.token)
          return true;
        })
        localconfig.token.supply = 2
        await assert.doesNotReject(async () => {
          let token = await rarepress.token.build(localconfig.token)
          return true;
        })
      })
      it("does not throw an error if trying to build ERC721 without 'supply' attribute", async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        localconfig.token.type = "ERC721"
        delete localconfig.token.supply
        await assert.doesNotReject(async () => {
          let token = await rarepress.token.build(localconfig.token)
          return true;
        })
      })
      it("throws an error if trying to build ERC721 with a 'supply' attribute", async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        localconfig.token.type = "ERC721"
        await assert.rejects(async () => {
          let token = await rarepress.token.build(localconfig.token)
        }, (err) => {
          assert.equal(err.message, "ERC721 should not have a supply attribute")
          return true;
        })

      })
    })
    describe("token.signable()", () => {
      it('signable() returns a signable object', async () => {
        let token = await rarepress.token.build(config.token)
        let signable = await rarepress.token.signable(token)
        assert(typeof signable.domain === "object")
        assert(typeof signable.types === "object")
        assert(typeof signable.primaryType === "string")
        assert(typeof signable.message === "object")
      })
    })
    describe("token.sign()", () => {
      it('sign() should only attach signatures', async () => {
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        let expectedKeys = ["metadata", "creators", "royalties", "tokenId", "tokenURI", "uri", "@type", "contract", "signatures"]
        for(let key of expectedKeys) {
          assert(typeof signedToken[key] !== undefined)
        }
      })
      it('sign() should not change the original token content', async () => {
        let token = await rarepress.token.build(config.token)
        let originalToken = JSON.parse(JSON.stringify(token))
        let signedToken = await rarepress.token.sign(token)
        let changes = diff(originalToken, token)
        assert(!changes)
      })
    })
    describe("token.save()", () => {
      it('save() stores the original token inside "body" attribute', async () => {
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        await rarepress.token.save(signedToken)
        let retrieved = await rarepress.token.queryOne({
          where: { tokenId: signedToken.tokenId }
        })
        let body = JSON.parse(retrieved.body)
        let change = diff(body, signedToken)
        assert.equal(change, undefined)
      })
      it('save() fails if there is no signature', async () => {
        let token = await rarepress.token.build(config.token)
        await assert.rejects(async () => {
          await rarepress.token.save(token)
        }, (err) => {
          assert.equal(err.message, "signatures doesn't exist")
          return true;
        })
      })
      it('multiple saves with multiple different contracts should correctly store the contract columns', async () => {
        let localconfig = JSON.parse(JSON.stringify(config))
        localconfig.token.contract = "<custom contract 0>"
        localconfig.token.metadata.name = "NFT 0"
        let token0 = await rarepress.token.build(localconfig.token)
        let signed0 = await rarepress.token.sign(token0) 
        localconfig.token.contract = "<custom contract 1>"
        localconfig.token.metadata.name = "NFT 1"
        let token1 = await rarepress.token.build(localconfig.token)
        let signed1 = await rarepress.token.sign(token1) 
        localconfig.token.contract = "<custom contract 2>"
        localconfig.token.metadata.name = "NFT 2"
        let token2 = await rarepress.token.build(localconfig.token)
        let signed2 = await rarepress.token.sign(token2) 
        await rarepress.token.save(signed0)
        await rarepress.token.save(signed1)
        await rarepress.token.save(signed2)

        let tokens = await rarepress.token.query({
          where: {}
        })

        assert.equal(tokens.length, 3)
        assert.equal(tokens[0].contract, "<custom contract 0>")
        assert.equal(tokens[1].contract, "<custom contract 1>")
        assert.equal(tokens[2].contract, "<custom contract 2>")

        let token = await rarepress.token.queryOne({
          where: { contract: "<custom contract 0>" }
        })
        assert.equal(token.name, "NFT 0")

        token = await rarepress.token.queryOne({
          where: { contract: "<custom contract 1>" }
        })
        assert.equal(token.name, "NFT 1")

        token = await rarepress.token.queryOne({
          where: { contract: "<custom contract 2>" }
        })
        assert.equal(token.name, "NFT 2")
      })
    })
  })
  describe('trade', function() {
    describe("trade.build()", () => {
      it('a built trade must have three mandatory attributes, and at least maker or taker', async () => {
        // Token INIT
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        await rarepress.token.save(signedToken)

        // Build Trade
        let trade = await rarepress.trade.build(config.trade(signedToken))

        // Mandatory attributes check
        const mandatoryAttributes = ["type", "data", "salt"]
        for(a of mandatoryAttributes) {
          assert(typeof trade[a] !== "undefined")
        }

        // at least makeAsset or takeAsset
        assert(trade.make || trade.take)
        assert(trade.maker || trade.taker)
      })
      it('build() should NOT fail even if the token does not exist on DB', async () => {
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        let tokens = await rarepress.token.query({
          where: {}
        })
        await assert.doesNotReject(async () => {
          let trade = await rarepress.trade.build(config.trade(signedToken))
        })
      })
      it('sign() should fail if the token does not exist on DB', async () => {
      })
    })
    describe("trade.signable()", () => {
      it('signable() should return correct attributes', async () => {
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        await rarepress.token.save(signedToken)
        let trade = await rarepress.trade.build(config.trade(signedToken))
        let signable = await rarepress.trade.signable(trade)
        assert(typeof signable.domain === "object")
        assert(typeof signable.types === "object")
        assert(typeof signable.primaryType === "string")
        assert(typeof signable.message === "object")
      })
      it('signable() should fail if the token does not exist on DB', async () => {
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        let tokens = await rarepress.token.query({
          where: {}
        })
        let trade = await rarepress.trade.build(config.trade(signedToken))
        await assert.rejects(async () => {
          let signable = await rarepress.trade.signable(trade)
        }, (err) => {
          assert.equal(err.message, "token does not exist. must first save a token before creating a trade")
          return true;
        })
      })
    })
    describe("trade.sign()", () => {
      it('sign() should not mutate the original trade', async () => {
        // Token init
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        await rarepress.token.save(signedToken)

        // Build Trade
        let trade = await rarepress.trade.build(config.trade(signedToken))
        let unsignedTrade = JSON.parse(JSON.stringify(trade))

        // Sign Trade
        let signedTrade = await rarepress.trade.sign(trade)

        let changes = diff(unsignedTrade, trade)
        assert(!changes)
      })
      it('sign() should only add signature to the existing trade', async () => {
        // Token init
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        await rarepress.token.save(signedToken)

        // Build Trade
        let trade = await rarepress.trade.build(config.trade(signedToken))
        let unsignedTrade = JSON.parse(JSON.stringify(trade))

        // Sign Trade
        let signedTrade = await rarepress.trade.sign(trade)

        // Check the difference between unsigned and signed trades.
        // The only difference should be the signature
        let changes = diff(unsignedTrade, signedTrade)
        assert.equal(changes.length, 1)
        assert.equal(changes[0].path, 'signature')
      })
      it('sign() should fail if the token does not exist on DB', async () => {
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        let trade = await rarepress.trade.build(config.trade(signedToken))
        await assert.rejects(async () => {
          let signedTrade = await rarepress.trade.sign(trade)
        }, (err) => {
          assert.equal(err.message, "token does not exist. must first save a token before creating a trade")
          return true;
        })
      })
    })
    describe("trade.save()", () => {
      it('save() stores the original trade object inside "body" attribute', async () => {
        // Token init
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        await rarepress.token.save(signedToken)

        // Build Trade
        let trade = await rarepress.trade.build(config.trade(signedToken))
        let unsignedTrade = JSON.parse(JSON.stringify(trade))

        // Sign Trade
        let signedTrade = await rarepress.trade.sign(trade)

        await rarepress.trade.save(signedTrade)

        let trades = await rarepress.trade.query({
          where: { makeId: token.tokenId }
        })

        let changes = diff(JSON.parse(trades[0].body), signedTrade)
        assert.equal(changes, undefined)
      })
      it("save() across multiple contracts", async () => {
        let token = await rarepress.token.build(config.token)
        let signedToken = await rarepress.token.sign(token)
        await rarepress.token.save(signedToken)

        // Build Trade 0 (sell at 100)
        let dsl = config.trade(signedToken)
        dsl.with.value = 100
        let trade = await rarepress.trade.build(dsl)
        let signedTrade = await rarepress.trade.sign(trade)
        await rarepress.trade.save(signedTrade)

        // Build Trade 1 (sell at 1000)
        dsl.with.value = 1000
        trade = await rarepress.trade.build(dsl)
        signedTrade = await rarepress.trade.sign(trade)
        await rarepress.trade.save(signedTrade)

        // Build Trade 0 (sell at 10000)
        dsl.with.value = 10000
        trade = await rarepress.trade.build(dsl)
        signedTrade = await rarepress.trade.sign(trade)
        await rarepress.trade.save(signedTrade)

        let trades = await rarepress.trade.query({
          where: {}
        })
        assert.equal(trades.length, 3)

        let body = JSON.parse(trades[0].body)
        let value = parseInt(body.take.value)
        assert.equal(value, 100)

        body = JSON.parse(trades[1].body)
        value = parseInt(body.take.value)
        assert.equal(value, 1000)

        body = JSON.parse(trades[2].body)
        value = parseInt(body.take.value)
        assert.equal(value, 10000)

      })
    })
  })
})
