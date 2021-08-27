const Rarepress = require('../index');
const rarepress = new Rarepress({ network: "rinkeby" });
const aliceSign = async (carolToken) => {
  let token = JSON.parse(JSON.stringify(carolToken))
  // 7. switch back to alice
  await rarepress.wallet.switch("m'/44'/60'/0'/0/0")

  // 8. sign carol token with alice
  console.log("caroltoken signatures", token.signatures)
  signable = await rarepress.token.build(token)
  let carolAliceToken = await rarepress.token.sign(signable)
  console.log("## carol and alice signed", carolAliceToken)

  await rarepress.token.put(carolAliceToken)
}
const bobSign = async (carolToken) => {
  let token = JSON.parse(JSON.stringify(carolToken))
  // 9. switch to bob
  await rarepress.wallet.switch("m'/44'/60'/0'/0/1")

  // 10. sign carol token with bob
  signable = await rarepress.token.build(token)
  let carolBobToken = await rarepress.token.sign(signable)
  console.log("## carol and bob signed", carolBobToken)
  await rarepress.token.put(carolBobToken)
};
(async () => {
  // 1. initialize
  await rarepress.init()

  let cid = await rarepress.add("https://thisartworkdoesnotexist.com")
  // 3. save alice address
  let alice = rarepress.wallet.address
  console.log("alice = ", alice)

  // 4. switch to bob 
  await rarepress.wallet.switch("m'/44'/60'/0'/0/1")
  let bob = rarepress.wallet.address
  console.log("bob = ", bob)

  // 5. switch to carol
  await rarepress.wallet.switch("m'/44'/60'/0'/0/2")
  let carol = rarepress.wallet.address
  console.log("carol = ", carol)

  // 5. build token with both alice and bob address
  //const cid = "bafkreia2h3aqrsycoonqiw5y74jek2ql5fqepzeayxu6ybscoy6uobhe34"
  let signable = await rarepress.token.build({
    metadata: {
      name: "🍞",
      description: "bread",
      image: "/ipfs/" + cid
    },
    creators: [
      { account: alice, value: 5000 },
      { account: bob, value: 3000 },
      { account: carol, value: 2000 }
    ],
    supply: 100
  })
  console.log("before sign", signable)

  // 6. carol signs
  let carolToken = await rarepress.token.sign(signable)
  console.log("## carol signed", carolToken)
//  await rarepress.token.store(carolToken)


  // From this point, carol sends the token to Alice and Bob.
  // Alice and Bob will sign Carol's token separately, and store separately.
  // Alice only has Carol's signature and so does Bob

  await aliceSign(carolToken)
  await bobSign(carolToken)

  let fullySignedToken = await rarepress.token.get({
    tokenId: carolToken.tokenId
  })
  console.log("fully signed token", fullySignedToken)
  /*
  let sent = await rarepress.token.send({
    body: fullySignedToken
  })
  console.log("sent =", sent)
  */

})();
