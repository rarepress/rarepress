module.exports = {
  types: {
    TYPES: {
      EIP712Domain: [
        { "type": "string", "name": "name" },
        { "type": "string", "name": "version" },
        { "type": "uint256", "name": "chainId" },
        { "type": "address", "name": "verifyingContract" }
      ],
      AssetType: [
        { "name": "assetClass", "type": "bytes4" },
        { "name": "data", "type": "bytes" }
      ],
      Asset: [
        { "name": "assetType", "type": "AssetType" },
        { "name": "value", "type": "uint256" }
      ],
      Order: [
        { "name": "maker", "type": "address" },
        { "name": "makeAsset", "type": "Asset" },
        { "name": "taker", "type": "address" },
        { "name": "takeAsset", "type": "Asset" },
        { "name": "salt", "type": "uint256" },
        { "name": "start", "type": "uint256" },
        { "name": "end", "type": "uint256" },
        { "name": "dataType", "type": "bytes4" },
        { "name": "data", "type": "bytes" }
      ]
    },
    DATA_V1_TYPE: {
      "components": [
        {
          "components": [
            {
              "name": "account",
              "type": "address",
            },
            {
              "name": "value",
              "type": "uint96",
            },
          ],
          "name": "payouts",
          "type": "tuple[]",
        },
        {
          "components": [
            {
              "name": "account",
              "type": "address",
            },
            {
              "name": "value",
              "type": "uint96",
            },
          ],
          "name": "originFees",
          "type": "tuple[]",
        },
      ],
      "name": "data",
      "type": "tuple",
    },
    ERC721_LAZY_TYPE: {
      "components": [
        {
          "name": "contract",
          "type": "address",
        },
        {
          "components": [
            {
              "name": "tokenId",
              "type": "uint256",
            },
            {
              "name": "uri",
              "type": "string",
            },
            {
              "components": [
                {
                  "name": "account",
                  "type": "address",
                },
                {
                  "name": "value",
                  "type": "uint96",
                },
              ],
              "name": "creators",
              "type": "tuple[]",
            },
            {
              "components": [
                {
                  "name": "account",
                  "type": "address",
                },
                {
                  "name": "value",
                  "type": "uint96",
                },
              ],
              "name": "royalties",
              "type": "tuple[]",
            },
            {
              "name": "signatures",
              "type": "bytes[]"
            }
          ],
          "name": "data",
          "type": "tuple",
        },
      ],
      "name": "data",
      "type": "tuple",
    },
    ERC1155_LAZY_TYPE: {
      "components": [
        {
          "name": "contract",
          "type": "address",
        },
        {
          "components": [
            {
              "name": "tokenId",
              "type": "uint256",
            },
            {
              "name": "uri",
              "type": "string",
            },
            {
              "name": "supply",
              "type": "uint256",
            },
            {
              "components": [
                {
                  "name": "account",
                  "type": "address",
                },
                {
                  "name": "value",
                  "type": "uint96",
                },
              ],
              "name": "creators",
              "type": "tuple[]",
            },
            {
              "components": [
                {
                  "name": "account",
                  "type": "address",
                },
                {
                  "name": "value",
                  "type": "uint96",
                },
              ],
              "name": "royalties",
              "type": "tuple[]",
            },
            {
              "name": "signatures",
              "type": "bytes[]"
            }
          ],
          "name": "data",
          "type": "tuple",
        },
      ],
      "name": "data",
      "type": "tuple",
    }
  },
  endpoints: {
    mainnet: {
      token: "https://api.rarible.com/protocol/v0.1/ethereum/nft/mints",
      trade: "https://api.rarible.com/protocol/v0.1/ethereum/order/orders"
    },
    ropsten: {
      token: "https://api-dev.rarible.com/protocol/v0.1/ethereum/nft/mints",
      trade: "https://api-dev.rarible.com/protocol/v0.1/ethereum/order/orders"
    },
    rinkeby: {
      token: "https://api-staging.rarible.com/protocol/v0.1/ethereum/nft/mints",
      trade: "https://api-staging.rarible.com/protocol/v0.1/ethereum/order/orders"
    },
  },
  token: {
    domain: {
      mainnet: {
        ERC1155: {
          chainId: 1,
          verifyingContract: "0xB66a603f4cFe17e3D27B87a8BfCaD319856518B8"
        },
        ERC721: {
          chainId: 1,
          verifyingContract: "0xF6793dA657495ffeFF9Ee6350824910Abc21356C",
        }
      },
      ropsten: {
        ERC1155: {
          chainId: 3,
          verifyingContract: "0x6a94aC200342AC823F909F142a65232E2f052183".toLowerCase()
        },
        ERC721: {
          chainId: 3,
          verifyingContract: "0xB0EA149212Eb707a1E5FC1D2d3fD318a8d94cf05".toLowerCase()
        }
      },
      rinkeby: {
        ERC1155: {
          chainId: 4,
          verifyingContract: "0x1AF7A7555263F275433c6Bb0b8FdCD231F89B1D7".toLowerCase()
        },
        ERC721: {
          chainId: 4,
          verifyingContract: "0x6ede7f3c26975aad32a475e1021d8f6f39c89d82".toLowerCase()
        }
      }
    },
    stub: {
      ERC721: {
        domain: {
          name: "Mint721",
          version: "1",
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Part: [
            { name: "account", type: "address" },
            { name: "value", type: "uint96" },
          ],
          Mint721: [
            { name: "tokenId", type: "uint256" },
            { name: "tokenURI", type: "string" },
            { name: "creators", type: "Part[]" },
            { name: "royalties", type: "Part[]" },
          ],
        },
        primaryType: "Mint721"
      },
      ERC1155: {
        domain: {
          name: "Mint1155",
          version: "1",
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Part: [
            {name: 'account', type: 'address'},
            {name: 'value', type: 'uint96'}
          ],
          Mint1155: [
            {name: 'tokenId', type: 'uint256'},
            {name: 'supply', type: 'uint256'},
            {name: 'tokenURI', type: 'string'},
            {name: 'creators', type: 'Part[]'},
            {name: 'royalties', type: 'Part[]'}
          ]
        },
        primaryType: "Mint1155"
      },
    }
  },
  trade: {
    domain: {
      mainnet: {
        chainId: 1,
        verifyingContract: "0x9757F2d2b135150BBeb65308D4a91804107cd8D6".toLowerCase()
      },
      ropsten: {
        chainId: 3,
        verifyingContract: "0x33Aef288C093Bf7b36fBe15c3190e616a993b0AD".toLowerCase()
      },
      rinkeby: {
        chainId: 4,
        verifyingContract: "0xd4a57a3bD3657D0d46B4C5bAC12b3F156B9B886b".toLowerCase()
      }
    }
  }
}
