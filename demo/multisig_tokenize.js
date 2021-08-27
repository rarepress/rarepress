const Rarepress = require('../index');
(async () => {
  // 1. initialize
  const rarepress = new Rarepress({ network: "rinkeby" });
  await rarepress.init()
  // 2. Add to nebulus
  let cid = await rarepress.add("https://thisartworkdoesnotexist.com")

  // 3. save alice address
  let alice = rarepress.wallet.address
  console.log("alice = ", alice)

  // 4. switch to bob 
  await rarepress.wallet.switch("m'/44'/60'/0'/0/1")
  let bob = rarepress.wallet.address
  console.log("bob = ", bob)

  // 5. build token with both alice and bob address
  let token = await rarepress.token.build({
    metadata: {
      name: "🍞",
      description: "bread",
      image: "/ipfs/" + cid
    },
    creators: [
      { account: alice, value: 5000 },
      { account: bob, value: 5000 }
    ],
    supply: 100
  })
  // 6. sign token with bob
  console.log("token wallet = ", rarepress.token.wallet)
  console.log("BUILT TOKEN", token)
  console.log("signing token", token)
  let signedToken = await rarepress.token.sign(token)
  console.log("## bob signed", signedToken)

  // 7. switch back to alice
  await rarepress.wallet.switch("m'/44'/60'/0'/0/0")

  console.log("signing token", token)
  // 8. sign token with alice
  signedToken = await rarepress.token.sign(token, signedToken.signatures)
  console.log("## alice signed", signedToken)




  // 5. send token to rarible
  let sent = await rarepress.token.send({ body: signedToken })
  console.log("sent", sent)
  // 6. store token locally
  await rarepress.token.put(signedToken)
  // 7. build a trade position for the token
  /*
  let built = await rarepress.trade.build({
    who: {
      from: rarepress.wallet.address
    },
    what: {
      type: "ERC1155",
      id: sent.tokenId,
      value: 7
    },
    with: {
      type: "ETH",
      value: 42 * 10**18
    }
  })
  // 7. sign the trade
  let signedTrade = await rarepress.trade.sign(built)
  // 8. send the trade to rarible
  let tradeSent = await rarepress.trade.send({ body: signedTrade })
  console.log("tradeSent", tradeSent)
  */
})();
