/*******************************************************************
*
* TRADE
*
* - public methods
*   - write methods
*     - build(dsl): build a trade
*     - signable(trade): encode a trade into a signable object
*     - sign(trade): encode and sign a trade, and return the resulting trade
*     - save(trade): store a trade object
*     - create(dsl): build a trade + sign the trade + save the trade
*     - send(trade, url): send a trade
*   - read methods
*     - query(query): query tokens
*     - queryOne(query): query one token
* - private methods
*   - buildAsset
*   - encode: encode a trade into a self-contained signable object
*
*******************************************************************/
const axios = require('axios')
const Encoder = require('./encoder')
const Decoder = require('./decoder')
class Trade {
  constructor(options) {
    this.config = JSON.parse(JSON.stringify(options.config))
    this.endpoints = this.config.endpoints
    this.db = options.db
    this.network = options.network
    this.encoder = new Encoder({
      network: this.network,
      config: this.config
    })
  }
  // 1. PUBLIC WRITE
  async build (o) {
    /************************************************
    *
    * let trade = await rarepress.trade.build({
    *   what: {
    *     type: "ERC721",
    *     contract: custonContractAddress,
    *     id: token.tokenId,
    *     value: 1
    *   },
    *   with: {
    *     type: "ETH",
    *     value: 10**19
    *   },
    *   who: {
    *     from: <address>,
    *     to: <address>
    *   }
    *   when: {
    *     from: <START>,
    *     to: <END>
    *   },
    *   how: {
    *     payouts: [],
    *     originFees: []
    *   }
    * })
    *
    ************************************************/
    let trade = {
      type: "RARIBLE_V2",
      make: this.buildAsset(o.what),
      take: this.buildAsset(o.with),
      data: {
        dataType: "RARIBLE_V2_DATA_V1",
        payouts: (o.how && o.how.payouts ? o.how.payouts : []),
        originFees: (o.how && o.how.originFees ? o.how.originFees : [])
      },
      salt: "" + Date.now() + Math.floor(Math.random() * 100000)  // current unix timestamp + random number
    }
    if (o.who && o.who.from) {
      trade.maker = o.who.from
    } else {
      if (this.wallet) {
        trade.maker = this.wallet.address
      }
    }
    if (o.who && o.who.to) {
      trade.taker = o.who.to
    }
    if (o.when) {
      if (o.when.from) trade.start = o.when.from
      if (o.when.to) trade.end = o.when.to
    }
    return trade;

  }
  async signable(originalTrade) {
    let trade = JSON.parse(JSON.stringify(originalTrade)) 
    let token = await this.token(trade)
    let contract = token.contract
    let encoded = await this.encode(trade, token)
    let signable = this.encoder.signable(encoded, contract)
    return signable
  }
  async sign(originalTrade) {
    let trade = JSON.parse(JSON.stringify(originalTrade)) 
    let signable = await this.signable(trade)
    let signature = await this.wallet.ethereum.request({
      method: "eth_signTypedData_v4",
      params: [null, JSON.stringify(signable)],
      from: this.wallet.address
    })
    trade.signature = signature
    return trade;
  }
  async save(trade) {
    await this.db.trade.save(trade)
    return trade
  }
  async create(dsl) {
    let unsignedTrade = await this.build(dsl)
    let signedTrade = await this.sign(unsignedTrade)
    await this.save(signedTrade)
    return signedTrade
  }
  async send (trade, url) {
    if (!url) url = this.endpoints[this.network].trade

    // 1. Save the snapshot first
    await this.save(trade)

    // 2. Send
    let res = await axios.post(url, trade).then((res) => {
      return res.data
    })
    return res
  }

  // 2. PUBLIC READ
  query(q) {
    return this.db.trade.query(q)
  }
  queryOne(q) {
    return this.db.trade.queryOne(q)
  }

  // 3. PRIVATE
  buildAsset(o) {
    let asset = {
      assetType: {},
      value: null
    }
    asset.assetType.assetClass = o.type
    if (o.id) asset.assetType.tokenId = o.id
    if (o.contract) {
      // custom contract
      asset.assetType.contract = o.contract
    } else if (o.type === "ERC721" || o.type === "ERC1155") {
      // default contract
      asset.assetType.contract = this.config.token.domain[this.network][o.type].verifyingContract
    }
    asset.value = (o.type === "ERC721" ? "1" : "" + o.value)
    return asset
  }
  async token(originalTrade) {
    let trade = JSON.parse(JSON.stringify(originalTrade)) 
    let tokenItem;
    // lazy trades require the token to exist locally
    if (trade.make && trade.make.assetType && ["ERC721", "ERC1155"].includes(trade.make.assetType.assetClass)) {
      tokenItem = await this.db.token.queryOne({
        where: {
          tokenId: trade.make.assetType.tokenId
        }
      })
    }
    if (!tokenItem) {
      throw new Error("token does not exist. must first save a token before creating a trade")
      return
    }
    let token = JSON.parse(tokenItem.body)
    return token
  }
  async encode(originalTrade, originalToken) {
    let trade = originalTrade
    let token = JSON.parse(JSON.stringify(originalToken)) 
    if (trade.make) {
      if (trade.make.assetType.assetClass === "ERC721" || trade.make.assetType.assetClass === "ERC1155") {
        trade.make.assetType.assetClass += "_LAZY"
        trade.make.assetType.uri = token.uri
        trade.make.assetType.creators = token.creators
        trade.make.assetType.royalties = token.royalties
        trade.make.assetType.signatures = token.signatures
        if (token.supply) trade.make.assetType.supply = token.supply
      }
    }
    if (trade.take) {
      if (trade.take.assetType.assetClass === "ERC721" || trade.take.assetType.assetClass === "ERC1155") {
        trade.take.assetType.assetClass += "_LAZY"
        trade.take.assetType.uri = token.uri
        trade.take.assetType.creators = token.creators
        trade.take.assetType.royalties = token.royalties
        trade.take.assetType.signatures = token.signatures
        if (token.supply) trade.take.assetType.supply = token.supply
      }
    }
    let encoded = this.encoder.encode(trade)
    return encoded
  }
}
module.exports = Trade
