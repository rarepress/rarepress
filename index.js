const nebulus = require('nebulus')
const Token = require('./token')
const Trade = require('./trade')
const Rarebase = require('rarebase')
const Wallet = require('./wallet')
class Rarepress {
  async init(options) {
    /*************************************************************
    *
    *   options := {
    *     db: <db config (knex config)>,
    *     fs: <nebulus root path>,
    *     key: <BIP44 derivation path (optional. default: m'/44'/60'/0'/0/0)>,
    *     network: <"mainnet"|"rinkeby"|"ropsten"> (default: "mainnet"),
    *     wallet: <true|false> (default: true),
    *   }
    *
    *************************************************************/
    this.config = require('./config')
    this.network = (options && options.network ? options.network : "mainnet")
    this.db = new Rarebase()
    this.fsConfig = (options && options.fs ? options.fs : {})
    this.fsConfig.path = (options && options.fs && options.fs.path ? options.fs.path : "fs")
    this.fsConfig.max = (options && options.fs && options.fs.max ? options.fs.max : 100)
    this.fsConfig.config = (options && options.fs && options.fs.config ? options.fs.config : {})
    this.fs = new nebulus({
      path: this.fsConfig.path,
      max: this.fsConfig.max,
      config: this.fsConfig.config
    })
    if (options && options.db) {
      await this.db.init(options.db)
    } else {
      await this.db.init({
        client: "sqlite3",
        connection: {
          filename: this.fsConfig.path + "/rarebase.sqlite3"
        }
      })
    }
    this.token = new Token({
      config: this.config,
      nebulus: this.fs,
      db: this.db,
      network: this.network,
    })
    this.trade = new Trade({
      config: this.config,
      db: this.db,
      network: this.network,
    })
    if (options && options.wallet === false) {
      // nothing
    } else {
      let key = (options && options.key ? options.key : "m'/44'/60'/0'/0/0")
      this.wallet = await Wallet(key)
      this.token.wallet = this.wallet
      this.trade.wallet = this.wallet
      this.account = this.wallet.address
      return this.wallet.address
    }
  }
  async login(path) {
    await this.wallet.switch(path)
    this.token.wallet = this.wallet
    this.trade.wallet = this.wallet
    this.account = this.wallet.address
    return this.wallet.address
  }
  add(x) {
    return this.fs.add(x)
  }
  folder(x) {
    return this.fs.folder(x)
  }
}
module.exports = Rarepress
