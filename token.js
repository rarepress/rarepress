/*******************************************************************
*
* TOKEN
*
* - public methods
*   - write methods
*     - build(dsl): build a token
*     - signable(token): return an encoded version of the token, ready to be signed
*     - sign(token): encode a token, sign it, and return the resulting token
*     - save(token): save a new token object in DB
*     - create(dsl): build a token + sign the token + save the token
*     - send(token, url): send a token to remote
*   - read methods
*     - query(query): query tokens
*     - queryOne(query): query one token
*     - files(token): get all the IPFS CIDs and their paths within the metadata
* - private methods
*   - storeMeta
*   - id
*   - serialize
*   - push
*
*******************************************************************/
const fs = require('fs')
const sigUtil = require('eth-sig-util')
const axios = require('axios')
const traverse = require('traverse')
class Token {
  constructor(options) {
    this.config = JSON.parse(JSON.stringify(options.config))
    this.endpoints = this.config.endpoints
    this.db = options.db
    this.nebulus = options.nebulus
    this.network = options.network
  }

  // 1. PUBLIC WRITE APIS
  async build(dsl) {
    let message = JSON.parse(JSON.stringify(dsl))
    let stub = {}
    if (!message.contract) {
      if (message.type === "ERC721") {
        stub.contract = this.config.token.domain[this.network].ERC721.verifyingContract
      } else if (message.type === "ERC1155") {
        stub.contract = this.config.token.domain[this.network].ERC1155.verifyingContract
      } else {
        // default is ERC721
        stub.contract = this.config.token.domain[this.network].ERC721.verifyingContract
      }
    } else {
      stub.contract = message.contract
    }

    // turn into signable format
    if (!message.creators) {
      if (this.wallet) {
        stub.creators = [{ account: this.wallet.address, value: 10000 }]
      } else {
        throw new Error("Required attribute: 'creators'")
        return;
      }
    } else {
      stub.creators = message.creators
    }
    stub.royalties = (message.royalties ? message.royalties : [])
    stub.tokenId = (message.tokenId ? message.tokenId : this.id(stub.creators[0].account))
    if (!message.tokenURI) {
      const tokenURI = await this.storeMeta(message)
      stub.tokenURI = tokenURI
    } else {
      stub.tokenURI = message.tokenURI
    }
    stub.uri = stub.tokenURI
    stub["@type"] = (message.type ? message.type : "ERC721")
    if (stub["@type"] === "ERC721") {
      if (message.supply) {
        throw new Error("ERC721 should not have a supply attribute")
        return
      }
    } else if (stub["@type"] === "ERC1155") {
      if (message.supply && message.supply >= 1) {
        stub.supply = message.supply
      } else {
        throw new Error("ERC1155 should have a supply attribute greater than or equal to 1")
        return
      }
    } else {
      throw new Error("type must be either ERC721 or ERC1155")
      return
    }
    stub.metadata = message.metadata
    return stub
  }
  async signable(message) {
    let signTemplate = JSON.parse(JSON.stringify(this.config.token.stub[message["@type"]]))
    let domain = this.config.token.domain[this.network][message["@type"]]
    domain.verifyingContract = message.contract
    signTemplate.domain = Object.assign(signTemplate.domain, domain)

    let signable = Object.assign(signTemplate, { message })

    return signable
  }
  async sign(message) {
    let signable = await this.signable(message)

    // sig is an array
    // find the current wallet index
    let creators = signable.message.creators
    let signatures = signable.message.signatures

    if (!signatures || signatures.length === 0 || signatures.length !== creators.length) {
      // let's create a signatures array
      signatures = []
      // use the local wallet
      let sigIndex
      for(let i=0; i<signable.message.creators.length; i++) {
        let creator = signable.message.creators[i];
        if (creator.account.toLowerCase() === this.wallet.address.toLowerCase()) {
          sigIndex = i;
        }
        signatures.push(null)
      }
      if (typeof sigIndex === "undefined") {
        throw new Error("the wallet is not included in the creators list")
        return;
      }
    }
    // check that the sig size and creators size match
    if (signatures.length !== creators.length) {
      throw new Error("the creators array size doesn't match the signature array size")
      return;
    }
    // verify all signatures against the creators
    let isvalid = true;
    for(let i=0; i<signatures.length; i++) {
      let signature = signatures[i]
      if (signature) {
        try {
          let address = sigUtil.recoverTypedSignature_v4({ data: signable, sig: signature });
          if (address.toLowerCase() !== creators[i].account.toLowerCase()) {
            isvalid = false;
          }
        } catch (e) {
          isvalid = false;
        }
      }
    }
    if (!isvalid) {
      throw new Error("invalid signature included in the signature array")
      return;
    }
    let signature = await this.wallet.ethereum.request({
      method: "eth_signTypedData_v4",
      params: [null, JSON.stringify(signable)],
    })

    let sigIndex = creators.map((c) => {
      return c.account.toLowerCase()
    }).indexOf(this.wallet.address.toLowerCase())
    signatures[sigIndex] = signature
    signable.signatures = signatures

    return this.serialize(signable)
  }
  async save(token) {
    if (!token.metadata) {
      let matches = /\/ipfs\/(.+)$/.exec(token.uri)
      if (matches && matches.length > 0) {
        const cid = /\/ipfs\/(.+)$/.exec(token.uri)[1]
        let metastr = await this.nebulus.get(cid)
        token.metadata = JSON.parse(metastr)
      } else if (token.uri.startsWith("data:application/json;base64,")) {
        let b64 = token.uri.slice(29)
        let metastr = Buffer.from(b64, "base64").toString()
        token.metadata = JSON.parse(metastr)
      } else {
        throw new Error("metadata invalid", token)
      }
    }
    await this.db.token.save(token)
    return token
  }
  async create(dsl) {
    let unsignedToken = await this.build(dsl)
    let signedToken = await this.sign(unsignedToken)
    await this.save(signedToken)
    return signedToken
  }
  async files(body) {
    let items = {
      files: [],
      folders: []
    }

    const meta_cid = /\/ipfs\/(.+)$/.exec(body.uri)[1]

    let metastr = await this.nebulus.get(meta_cid)
    let metadata = JSON.parse(metastr)

    traverse(metadata).forEach(function(x) {
      if (this.isLeaf && typeof x === "string" && x.startsWith("/ipfs/")) {
        let re = /\/ipfs\/[^\/]+$/
        if (re.test(x)) {
          items.files.push({
            path: this.path,
            uri: x,
          })
        } else {
          let dir = path.dirname(x)
          if (!items.folders.includes(dir)) {
            items.folders.push({
              path: this.path,
              uri: dir
            })
          }
        }
      }
    })

    // push all ipfs files
    let ids = [{ cid: meta_cid, path: [] }]
    for(let file of items.files) {
      const cid = /\/ipfs\/(.+)$/.exec(file.uri)[1]
      ids.push({ path: file.path, cid, })
    }
    for(let folder of items.folders) {
      const cid = /\/ipfs\/(.+)$/.exec(folder.uri)[1]
      ids.push({ path: folder.path, cid, })
    }
    return ids
  }
  async send (token, url) {
    if (!url) url = this.endpoints[this.network].token
    let body = token
    /***************************************************************************
    *
    *   items := {
    *     files: [
    *       '/ipfs/bafybeiarb3icbwpkyz7fgrkb7oqgiv3wh365nbxalvhkah6rde7ktpvbzq'
    *     ],
    *     folders: [
    *       '/ipfs/bafybeiarb3icbwpkyz7fgrkb7oqgiv3wh365nbxalvhkah6rde7ktpvbzq'
    *     ]
    *   }
    *
    ***************************************************************************/

    if (body.metadata) delete body.metadata // if metadata is attached, delete before sending.
    if (body.tokenURI) delete body.tokenURI // if tokenURI is attached, delete before sending. (uri alone is sufficient)

    // save before sending
    await this.save(body)

    // send
    let res = await axios.post(url, body).then((res) => {
      return res.data
    })
    return res
  }

  // 2. PUBLIC READ APIS
  async query(q) {
    let tokens = await this.db.token.query(q)
    return tokens
  }
  async queryOne(q) {
    let token = await this.db.token.queryOne(q)
    return token
  }

  // 3. PRIVATE METHODS
  async storeMeta(o) {
    // 1. write metadata to nebulus
    // 2. insert metadata to db
    const metastr = JSON.stringify(o.metadata)
    if (o.metadataLocation === "eth") {
      const tokenURI = `data:application/json;base64,${Buffer.from(metastr).toString("base64")}`
      return tokenURI
    } else {
      const cid = await this.nebulus.add(Buffer.from(metastr))
      const tokenURI = `/ipfs/${cid}`
      return tokenURI
    }
  }
  id(creator) {
    const timestamp = Date.now()  // 13 digits
    const rand = (Math.random() * Math.pow(10, 18)).toString().slice(0,11); // 11 digits
    const base = "" + timestamp + rand // 24 digits
    let bi = BigInt(creator + base)
    return bi.toString(10)
  }
  serialize (signable) {
    const signed = {
      "@type": signable.message["@type"],
      tokenId: signable.message.tokenId,
      uri: signable.message.tokenURI,
      tokenURI: signable.message.tokenURI,
      contract: signable.message.contract,
      creators: signable.message.creators,
      royalties: signable.message.royalties,
      signatures: signable.signatures,
      metadata: signable.message.metadata,
    }
    if (signable.message.supply) signed.supply = signable.message.supply
    return signed
  }
  push (cid) {
    return new Promise((resolve, reject) => {
      this.nebulus.on("push:" + cid, async (cid) => {
        resolve()
      })
      this.nebulus.push(cid)
    })
  }
}
module.exports = Token
