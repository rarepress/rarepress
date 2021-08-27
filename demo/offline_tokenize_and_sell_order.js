const Rarepress = require('../index');
(async () => {
  // 1. initialize
  const rarepress = new Rarepress({ network: "rinkeby" });
  await rarepress.init()
  // 2. add to nebulus
  let cid = await rarepress.add("https://thisartworkdoesnotexist.com")
  // 3. build token
  let token = await rarepress.token.build({
    metadata: {
      name: "🍞",
      description: "bread",
      image: "/ipfs/" + cid
    },
    creators: [{ account: rarepress.wallet.address, value: 10000 }],
    supply: 100
  })
  // 4. sign token
  let signedToken = await rarepress.token.sign(token)
  console.log("signedToken", signedToken)
  // 5. save token
  await rarepress.token.put(signedToken)
  // 6. create a trade for the token
  let built = await rarepress.trade.build({
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
  })
  console.log("built trade", JSON.stringify(built, null, 2))
  // 7. sign the trade
  let signedTrade = await rarepress.trade.sign(built)
  console.log("signedTrade", JSON.stringify(signedTrade, null, 2))
  // 8. send the trade to rarible
//  let tradeSent = await rarepress.trade.send({ body: signedTrade })
//  console.log("tradeSent", tradeSent)
})();
