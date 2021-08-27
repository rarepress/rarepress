const mushie = require('mushie')
const sigUtil = require('eth-sig-util')
const priv2addr = require('ethereum-private-key-to-address')
const Wallet = async (key) => {
  let maker = await mushie.maker()
  const w = await maker.make({
    key: key,
    init: async (mushie) => {
      mushie.address = await mushie.ethereum.request({
        method: "eth_requestAccounts"
      }).then((a) => { return a[0] })
    },
    use: {
      ethereum: (key) => {
        return {
          verify: (o) => {
            return sigUtil.recoverTypedSignature_v4({ data, sig });
          },
          request: async (o) => {
            if (o.method === "eth_signTypedData_v4") {
              return sigUtil.signTypedData_v4(key.privateKey, { data: JSON.parse(o.params[1]) });
            } else if (o.method === "personal_sign") {
              return sigUtil.personalSign(key.privateKey, { data: o.params[1] });
            } else if (o.method === "eth_requestAccounts") {
              return [priv2addr(key.privateKey)]
            }
          }
        }
      },
    }
  })
  return w
}
module.exports = Wallet
