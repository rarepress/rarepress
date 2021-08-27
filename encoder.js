const Web3 = require('web3');
const abi = new Web3().eth.abi
const id = (s) => { return Web3.utils.sha3(s).substring(0, 10) }
/****************************************************************************************
*
*  [Trade Encoder]
*  Reference Implementation is at:
*  https://github.com/rariblecom/protocol-ethereum-sdk
*
****************************************************************************************/
class Encoder {
  constructor(o) {
    this.config = o.config
    this.network = o.network
  }
  assetType (assetType) {
    // Lazify
    switch (assetType.assetClass) {
      case "ETH":
        return {
          assetClass: id(assetType.assetClass),
          data: "0x",
        }
      case "ERC20":
        return {
          assetClass: id(assetType.assetClass),
          data: abi.encodeParameter("address", assetType.contract),
        }
      case "ERC721":
        return {
          assetClass: id(assetType.assetClass),
          data: abi.encodeParameter(
            { root: { contract: "address", tokenId: "uint256", } },
            { contract: assetType.contract, tokenId: assetType.tokenId },
          ),
        }
      case "ERC1155":
        return {
          assetClass: id(assetType.assetClass),
          data: abi.encodeParameter(
            { root: { contract: "address", tokenId: "uint256", } },
            { contract: assetType.contract, tokenId: assetType.tokenId },
          ),
        }
      case "ERC721_LAZY": {
        const encoded = abi.encodeParameter(
          this.config.types.ERC721_LAZY_TYPE,
          {
            contract: assetType.contract,
            data: {
              tokenId: assetType.tokenId,
              uri: assetType.uri,
              creators: assetType.creators,
              royalties: assetType.royalties,
              signatures: assetType.signatures,
            },
          },
        )
        return {
          assetClass: id(assetType.assetClass),
          data: `0x${encoded.substring(66)}`,
        }
      }
      case "ERC1155_LAZY": {
        const encoded = abi.encodeParameter(
          this.config.types.ERC1155_LAZY_TYPE,
          {
            contract: assetType.contract,
            data: {
              tokenId: assetType.tokenId,
              uri: assetType.uri,
              supply: assetType.supply,
              creators: assetType.creators,
              royalties: assetType.royalties,
              signatures: assetType.signatures,
            },
          },
        )
        return {
          assetClass: id(assetType.assetClass),
          data: `0x${encoded.substring(66)}`,
        }
      }
    }
    throw new Error(`Unsupported asset class: ${assetType.assetClass}`)
  }
  data (data, wrongEncode) {
    switch (data.dataType) {
      case "RARIBLE_V2_DATA_V1": {
        const encoded = abi.encodeParameter(
          this.config.types.DATA_V1_TYPE, 
          { payouts: data.payouts, originFees: data.originFees }
        )
        if (wrongEncode) {
          return [id("V1"), `0x${encoded.substring(66)}`]
        }
        return [id("V1"), encoded]
      }
    }
    throw new Error(`Data type not supported: ${data.dataType}`)
  }
  encode(originalTrade) {
    let trade = JSON.parse(JSON.stringify(originalTrade))
    let struct = { }
    if (trade.make) {
      struct.makeAsset = {
        assetType: this.assetType(trade.make.assetType),
        value: trade.make.value
      }
    }
    struct.maker = (trade.maker ? trade.maker : "0x0000000000000000000000000000000000000000")
    if (trade.take) {
      struct.takeAsset = {
        assetType: this.assetType(trade.take.assetType),
        value: trade.take.value
      }
    }
    struct.taker = (trade.taker ? trade.taker : "0x0000000000000000000000000000000000000000")
    struct.salt = trade.salt
    struct.start = (typeof trade.start !== "undefined" ? trade.start : 0)
    struct.end = (typeof trade.end !== "undefined" ? trade.end : 0)
    let data = this.data(trade.data)
    struct.dataType = data[0]
    struct.data = data[1]
    return struct
  }
  signable(struct, contract) {
    return {
      types: this.config.types.TYPES,
      domain: {
        "name": "Exchange",
        "version": "2",
        "chainId": this.config.trade.domain[this.network].chainId,
        "verifyingContract": this.config.trade.domain[this.network].verifyingContract,
      },
      message: struct,
      primaryType: "Order",
    }
  }
}
module.exports = Encoder
