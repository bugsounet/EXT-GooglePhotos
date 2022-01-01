"use strict"

var NodeHelper = require("node_helper")
var logGP = (...args) => { /* do nothing */ }

const fs = require("fs")
const path = require("path")
const GPhotos = require("@bugsounet/google-photos")

module.exports = NodeHelper.create({
  start: function () {
    this.photo=null
  },

  socketNotificationReceived: function (noti, payload) {
    switch (noti) {
      case "INIT":
        console.log("[PHOTOS] EXT-GooglePhotos Version:", require('./package.json').version, "rev:", require('./package.json').rev)
        this.initialize(payload)
      break
      /** GPhotos callbacks **/
      case "GP_MORE_PICTS":
      case "GP_LOAD_FAIL":
        if (this.photos) this.photos.prepAndSendChunk(Math.ceil(20*60*1000/this.config.displayDelay))
        break
    }
  },

  initialize: async function (config) {
    this.config = config
    if (this.config.debug) logGP = (...args) => { console.log("[GPHOTOS]", ...args) }
    if (this.config.useGooglePhotosAPI) {
      logGP("Starting GooglePhotosAPI module...")
      logGP("Check credentials.json...")
      if (fs.existsSync(__dirname + "/credentials.json")) {
        this.config.CREDENTIALS = __dirname + "/credentials.json"
      } else {
        if(fs.existsSync(path.resolve(__dirname + "/../MMM-GoogleAssistant/credentials.json"))) {
         this.config.CREDENTIALS = path.resolve(__dirname + "/../MMM-GoogleAssistant/credentials.json")
        }
      }
      if (!this.config.CREDENTIALS) return console.log("[PHOTOS] credentials.json file not found !")
      else logGP("credentials.json found in", this.config.CREDENTIALS)

      if (!fs.existsSync(__dirname + "/tokenGP.json")) {
        console.log("[PHOTOS] tokenGP.json file not found !")
        return
      }

      this.config.TOKEN = __dirname + "/tokenGP.json"
      this.config.CACHE = __dirname + "/tmp"
      this.photos = new GPhotos(this.config, this.config.debug, (noti, params) => this.sendSocketNotification(noti, params))
      this.photos.start()
    }
  }
})
