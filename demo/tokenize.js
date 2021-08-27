const Rarepress = require('../index');
(async () => {
  // 1. initialize
  const rarepress = new Rarepress({ network: "rinkeby" });
  await rarepress.init()
  // 2. add to nebulus
  let cid = await rarepress.add("https://thisartworkdoesnotexist.com")
  // 3. build token
  let token = await rarepress.token.build({
    type: "ERC1155",
    metadata: {
      name: "😎",
      description: "sunglasses",
      image: "/ipfs/" + cid
    },
    creators: [{ account: rarepress.wallet.address, value: 10000 }],
    supply: 7
  })
  console.log("# BUILT")
  console.log(token)
  // 4. sign token
  let signedToken = await rarepress.token.sign(token)
  console.log("signedToken", signedToken)
  await rarepress.token.save(signedToken)
  let sent = await rarepress.token.send(signedToken)
  console.log("# SENT")
  console.log(sent)
})();
