/**
 ** Module : EXT-GooglePhotos
 ** @bugsounet
 ** ©02-2022
 ** @eouia code based
 ** support: https://forum.bugsounet.fr
 **/

logGP = (...args) => { /* do nothing */ }

Module.register("EXT-GooglePhotos", {
  defaults: {
    debug: false,
    displayType: 0,
    displayDelay: 10 * 1000,
    displayInfos: true,
    albums: [],
    sort: "new", // "old", "random"
    hiResolution: true,
    timeFormat: "DD/MM/YYYY HH:mm",
    moduleHeight: 300,
    moduleWidth: 300
  },

  start: function () {
    if (this.config.debug) logGP = (...args) => { console.log("[GPHOTOS]", ...args) }
    var checkConfig = false
    if (typeof this.config.displayType === "number" && this.config.displayType >= 0 && this.config.displayType <= 1) checkConfig = true
    if (!checkConfig) {
      this.config.displayType = 0
      console.error("GPhoto: displayType error --> correct with default")
    }
    this.config.LoadingText= this.translate("LOADING")
    this.config.GPAlbumName= this.translate("GPAlbumName")
    this.busy = false
    this.GPhotos= {
      updateTimer: null,
      albums: null,
      scanned: [],
      index: 0,
      needMorePicsFlag: true,
      warning: 0
    }
  },

  getTranslations: function() {
    return {
      en: "translations/en.json",
      fr: "translations/fr.json",
      it: "translations/it.json",
      de: "translations/de.json",
      es: "translations/es.json",
      nl: "translations/nl.json",
      pt: "translations/pt.json",
      ko: "translations/ko.json"
    }
  },

  getStyles: function () {
    return [
      "EXT-GooglePhotos.css",
      "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
    ]
  },

  getDom: function() {
    /** GPhotos Module mode**/
    if (this.config.displayType == 1) {
      var GPhotos = document.createElement("div")
      GPhotos.id = "EXT_GPHOTO"
      GPhotos.style.height= this.config.moduleHeight + "px"
      GPhotos.style.width= this.config.moduleWidth + "px"
      var GPhotosBack = document.createElement("div")
      GPhotosBack.id = "EXT_GPHOTO_BACK"
      var GPhotosCurrent = document.createElement("div")
      GPhotosCurrent.id = "EXT_GPHOTO_CURRENT"
      GPhotosCurrent.addEventListener('animationend', ()=>{
        GPhotosCurrent.classList.remove("animated")
      })
      var GPhotosInfo = document.createElement("div")
      GPhotosInfo.id = "EXT_GPHOTO_INFO"
      GPhotosInfo.className= "Module"
      GPhotosInfo.innerHTML = "EXT-GooglePhotos Loading..."

      GPhotos.appendChild(GPhotosBack)
      GPhotos.appendChild(GPhotosCurrent)
      GPhotos.appendChild(GPhotosInfo)
      return GPhotos
    } else {
      var dom = document.createElement("div")
      dom.style.display = 'none'
      return dom
    }
  },

  notificationReceived: function(noti, payload) {
    switch(noti) {
      case "DOM_OBJECTS_CREATED":
        this.prepare()
        this.sendSocketNotification("INIT", this.config)
        setTimeout(() => { this.showBackgroundGooglePhotoAPI() }, 5000)
        break
      case "GAv4_READY":
        this.sendNotification("EXT_HELLO", this.name)
        break
      case "EXT_GOOGLEPHOTOS-STOP":
        this.sendSocketNotification("STOP_SCAN")
        this.busy= true
        break
      case "EXT_GOOGLEPHOTOS-START":
        this.busy= false
        this.sendSocketNotification("START_SCAN")
        break
    }
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      /** GPhotos **/
      case "GPhotos_PICT":
        if (payload && Array.isArray(payload) && payload.length > 0) {
          this.GPhotos.needMorePicsFlag = false
          this.GPhotos.scanned = payload
          this.GPhotos.index = 0
          if (this.config.debug) {
            this.sendNotification("EXT_ALERT", {
              type: "information",
              message: this.translate("GPReceive", { VALUES: payload.length }),
              icon: "modules/EXT-GooglePhotos/resources/GooglePhoto-Logo.png",
              timer: 10000
            })
          }
          logGP("GPReceive", payload.length)
        }
        break
      case "GPhotos_INIT":
        this.GPhotos.albums = payload
        break
      case "ERROR":
      case "GPError":
        this.sendNotification("EXT_ALERT", {
          type: "error",
          message: payload,
          icon: "modules/EXT-GooglePhotos/resources/GooglePhoto-Logo.png"
        })
    }    
  },

  resume: function() {
    if (this.config.displayType == 0) {
      var GPhotos = document.getElementById("EXT_GPHOTO")
      GPhotos.classList.remove("hidden")
      logGP("GPhotos is resumed.")
    }
  },

  suspend: function() {
    if (this.config.displayType == 0) {
      var GPhotos = document.getElementById("EXT_GPHOTO")
      GPhotos.classList.add("hidden")
      logGP("GPhotos is suspended.")
    }
  },

  prepare: function() {
    /** Create a popup for external photo display **/
    var photo = document.createElement("img")
    photo.id = "EXT_PHOTO"
    photo.classList.add("hidden")
    document.body.appendChild(photo)

    /** Create a Fake module for Background using **/
    if (this.config.displayType == 0) {
      var nodes = document.getElementsByClassName("region fullscreen below")
      var pos = nodes[0].querySelector(".container")
      var children = pos.children
      var module = document.createElement("div")
      module.id = "module_Fake_EXT_GPHOTO"
      module.classList.add("module", "EXT_GPHOTO", "hidden")
      var header = document.createElement("header")
      header.classList.add("module-header")
      header.style.display = "none"
      module.appendChild(header)
      var content = document.createElement("div")
      content.classList.add("module-content")
      var viewDom = document.createElement("div")
      viewDom.id = "EXT_GPHOTO"
      var back = document.createElement("div")
      back.id = "EXT_GPHOTO_BACK"
      var current = document.createElement("div")
      current.id = "EXT_GPHOTO_CURRENT"
      current.addEventListener('animationend', ()=>{
        current.classList.remove("animated")
      })
      var info = document.createElement("div")
      info.id = "EXT_GPHOTO_INFO"
      info.innerHTML = this.config.LoadingText
      viewDom.appendChild(back)
      viewDom.appendChild(current)
      viewDom.appendChild(info)
  
      content.appendChild(viewDom)
      module.appendChild(content)
      pos.insertBefore(module, children[children.length])
    }
  },

  /** GPhotos API **/
  updatePhotos: function () {
    if (this.GPhotos.scanned.length == 0) {
      if (!this.busy) this.sendSocketNotification("GP_MORE_PICTS")
      return
    }
    if (this.GPhotos.index < 0) this.GPhotos.index = 0
    if (this.GPhotos.index >= this.GPhotos.scanned.length) this.GPhotos.index = 0
    var target = this.GPhotos.scanned[this.GPhotos.index]
    if (this.config.hiResolution) {
      var url = target.baseUrl + "=w1080-h1920"
    }
    else var url = target.baseUrl
    this.ready(url, target)
    this.GPhotos.index++
    if (this.GPhotos.index >= this.GPhotos.scanned.length) {
      this.GPhotos.index = 0
      this.GPhotos.needMorePicsFlag = true
    }
    if (this.GPhotos.needMorePicsFlag) {
      if (!this.busy) this.sendSocketNotification("GP_MORE_PICTS")
    }
  },

  ready: function(url, target) {
    var hidden = document.createElement("img")
    hidden.onerror = () => {
      console.error("[GPHOTOS] Failed to Load Image.")
      if (!this.busy) {
        this.sendNotification("EXT_ALERT", {
          type: "warning",
          message: this.translate("GPFailedOpenURL"),
          icon: "modules/EXT-GooglePhotos/resources/GooglePhoto-Logo.png"
        })
        this.sendSocketNotification("GP_LOAD_FAIL", url)
      }
    }
    hidden.onload = () => {
      var back = document.getElementById("EXT_GPHOTO_BACK")
      var current = document.getElementById("EXT_GPHOTO_CURRENT")
      var dom = document.getElementById("EXT_GPHOTO")
      back.style.backgroundImage = `url(${url})`
      current.style.backgroundImage = `url(${url})`
      current.classList.add("animated")
      var info = document.getElementById("EXT_GPHOTO_INFO")
      var album = this.GPhotos.albums.find((a)=>{
        if (a.id == target._albumId) return true
        return false
      })
      info.innerHTML = ""
      if (!this.config.displayInfos) info.classList.add("hidden")
      var albumCover = document.createElement("div")
      albumCover.classList.add("albumCover")
      if (typeof album != 'undefined') { // @doctorfree patch
        albumCover.style.backgroundImage = `url(modules/EXT-GooglePhotos/tmp/cache/${album.id})`
      }
      var albumTitle = document.createElement("div")
      albumTitle.classList.add("albumTitle")
      albumTitle.innerHTML = this.config.GPAlbumName+ " " + album.title
      var photoTime = document.createElement("div")
      photoTime.classList.add("photoTime")
      photoTime.innerHTML = (this.config.timeFormat == "relative")
        ? moment(target.mediaMetadata.creationTime).fromNow()
        : moment(target.mediaMetadata.creationTime).format(this.config.timeFormat)
      var infoText = document.createElement("div")
      infoText.classList.add("infoText")

      info.appendChild(albumCover)
      infoText.appendChild(albumTitle)
      infoText.appendChild(photoTime)
      info.appendChild(infoText)
      logGP("Image loaded ["+ this.GPhotos.index + "/" + this.GPhotos.scanned.length + "]:", url)
      if (!this.busy) this.sendSocketNotification("GP_LOADED", url)
    }
    hidden.src = url
  },

  showBackgroundGooglePhotoAPI: function () {
    if (this.GPhotos.scanned.length == 0) {
      clearTimeout(this.GPhotos.updateTimer)
      this.GPhotos.updateTimer = null
      if (!this.busy) {
        this.sendNotification("EXT_ALERT", {
          type: "warning",
          message: this.translate("GPNoPhotoFound"),
          icon: "modules/EXT-GooglePhotos/resources/GooglePhoto-Logo.png"
        })
        this.sendSocketNotification("GP_MORE_PICTS")
      }
      this.GPhotos.warning++
      if (this.GPhotos.warning >= 5) {
        if (!this.busy) this.sendNotification("EXT_ALERT", {
          type: "warning",
          message: this.translate("GPError"),
          icon: "modules/EXT-GooglePhotos/resources/GooglePhoto-Logo.png"
        })
        this.GPhotos.warning = 0
        return
      }
      this.GPhotos.updateTimer = setInterval(()=>{
        this.showBackgroundGooglePhotoAPI()
      }, 15000)
    } else {
      if (this.GPhotos.albums) {
        this.sendNotification("EXT_ALERT", {
          type: "information",
          message: this.translate("GPOpen"),
          icon: "modules/EXT-GooglePhotos/resources/GooglePhoto-Logo.png"
        })
      }
      clearTimeout(this.GPhotos.updateTimer)
      this.GPhotos.updateTimer = null
      this.updatePhotos()

      this.GPhotos.updateTimer = setInterval(()=>{
        this.updatePhotos()
      }, this.config.displayDelay)
    }
  }
})
