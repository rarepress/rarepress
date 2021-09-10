
const Rarepress = require('../index');
(async () => {
  // 1. initialize
  const rarepress = new Rarepress({ network: "mainnety" });
  await rarepress.init()
  let addr;
  let i = 0;
  while(true) {
    await rarepress.wallet.switch(`m'/44'/60'/0'/0/${i}`)
    addr = rarepress.wallet.address
    if (addr.startsWith("0x0")) {
      break;
    }
    i++;
  }
  console.log("addr", addr, i)
  let cid = await rarepress.add("https://thisartworkdoesnotexist.com")
  let token = await rarepress.token.create({
    metadata: {
      name: "name",
      description: "desc",
      image: "/ipfs/" + cid
    }
  })
  console.log("token = ", token)

  await rarepress.fs.push(cid)
  await rarepress.fs.push(token.uri)

  let sent = await rarepress.token.send(token)
  console.log("sent = ", sent)


  process.exit()
})();
