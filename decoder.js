const Web3 = require('web3');
const config = require('./config')
const { TYPES, DATA_V1_TYPE, ERC721_LAZY_TYPE, ERC1155_LAZY_TYPE } = config.types
const abi = new Web3().eth.abi
const id = (s) => { return Web3.utils.sha3(s).substring(0, 10) }
class Decoder {
  constructor(o) {
    this.network = o.network
  }
  assetType (assetType) {
    const encodedAssetClasses = {}
    const assetClasses = ["ETH", "ERC20", "ERC721", "ERC1155", "ERC721_LAZY", "ERC1155_LAZY"]
    for(let c of assetClasses) {
      let encoded = id(c)
      encodedAssetClasses[encoded] = c
    }
    let type = (encodedAssetClasses[assetType.assetClass])
    let decoded
    if (type === "ERC721_LAZY") {
      decoded = abi.decodeParameters(
        ERC721_LAZY_TYPE.components,
        assetType.data
      )

    } else if (type === "ERC1155_LAZY") {
      decoded = abi.decodeParameters(
        ERC1155_LAZY_TYPE.components,
        assetType.data
      )
    }
    return decoded
/*
{
  type: 'RARIBLE_V2',
  make: {
    assetType: {
      assetClass: 'ERC1155',
      tokenId: '52103307166765014994970427877263908096137622415890452046409198997075308070505',
      contract: '0x1AF7A7555263F275433c6Bb0b8FdCD231F89B1D7'
    },
    value: '7'
  },
  take: { assetType: { assetClass: 'ETH' }, value: '42000000000000000000' },
  data: { dataType: 'RARIBLE_V2_DATA_V1', payouts: [], originFees: [] },
  salt: '162837475362596296',
  maker: '0x73316d4224263496201c3420b36Cdda9c0249574'
}
*/
    return decoded
  }
  data (data, wrongEncode) {
    const decoded = abi.decodeParameter(
      DATA_V1_TYPE, 
      data
    )
    return decoded
  }
  decode(trade) {
    let struct = { }
    if (trade.makeAsset) {
      struct.make = {
        assetType: this.assetType(trade.makeAsset.assetType),
        value: trade.makeAsset.value
      }
    }
    struct.maker = trade.maker
    if (trade.takeAsset) {
      struct.take = {
        assetType: this.assetType(trade.takeAsset.assetType),
        value: trade.takeAsset.value
      }
    }
    struct.taker = trade.taker
    struct.salt = trade.salt
    struct.start = trade.start
    struct.end = trade.end
    struct.data = this.data(trade.data)
    return struct
  }
}
module.exports = Decoder
