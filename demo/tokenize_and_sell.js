const Rarepress = require('../index');
(async () => {
  // 1. initialize
  const rarepress = new Rarepress({ network: "rinkeby" });
  await rarepress.init()
  // 2. add to nebulus
  let cid = await rarepress.add("https://thisartworkdoesnotexist.com")
  // 3. build token
  let token = await rarepress.token.build({
    type: "ERC721",
    metadata: {
      name: "🤪",
      description: "crazy",
      image: "/ipfs/" + cid
    },
    creators: [{ account: rarepress.wallet.address, value: 10000 }],
  })
  // 4. sign token
  let signedToken = await rarepress.token.sign(token)
  console.log("signedToken", signedToken)
  // 5. save signed token
  await rarepress.token.save(signedToken)
  // 6. send the signed token to rarible
  let sent = await rarepress.token.send(signedToken)
  console.log("sent", sent)
  // 7. build a trade position for the token
  let built = await rarepress.trade.build({
    who: {
      from: rarepress.wallet.address
    },
    what: {
      type: "ERC721",
      id: signedToken.tokenId,
    },
    with: {
      type: "ETH",
      value: 88 * 10**18
    }
  })
  // 7. sign the trade
  let signedTrade = await rarepress.trade.sign(built)
  console.log("signedTrade", JSON.stringify(signedTrade, null, 2))
  // 8. send the trade to rarible
  let tradeSent = await rarepress.trade.send(signedTrade)
  console.log("tradeSent", tradeSent)
})();
