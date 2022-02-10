'use strict'
const GP = require("@bugsounet/google-photos")
const fs = require("fs")
const path = require('path')

console.log("[GPHOTOS] Check credentials.json...")
if (fs.existsSync(__dirname + "/../credentials.json")) {
  this.CREDENTIALS = __dirname + "/../credentials.json"
} else {
  if(fs.existsSync(path.resolve(__dirname + "/../../MMM-GoogleAssistant/credentials.json"))) {
   this.CREDENTIALS = path.resolve(__dirname + "/../../MMM-GoogleAssistant/credentials.json")
  }
}
if (!this.CREDENTIALS) return console.log("[GPHOTOS] credentials.json file not found !")
else console.log("[GPHOTOS] credentials.json found in", this.CREDENTIALS)
const authOption = {
  CREDENTIALS: this.CREDENTIALS,
  TOKEN: path.resolve(__dirname, '../tokenGP.json')
}

var GPhotos = new GP(authOption, true)

GPhotos.generateToken(
  function success () {
    console.log ("[GPHOTOS] TokenGP is generated.")
    process.exit()
  },
  function fail() {
    console.log("[GPHOTOS] TokenGP file doesn't exist. Check the permission.")
    process.exit()
  }
)
