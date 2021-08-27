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
  console.log("# BUILT")
  console.log(token)
  // 4. sign token
  let signedToken = await rarepress.token.sign(token)
  console.log("# SIGNED")
  console.log(signedToken)
  let stored = await rarepress.token.store(signedToken)
  console.log("# STORED")
  console.log(stored)

  let retrieved = await rarepress.db.token.findOne(rarepress.wallet.address, {
    query: {
      tokenId: stored.tokenId
    }
  })
  console.log("# RETRIEVED")
  console.log(retrieved)

  let sent = await rarepress.token.send({
    body: retrieved
  })
  console.log("# SENT")
  console.log(sent)
})();
