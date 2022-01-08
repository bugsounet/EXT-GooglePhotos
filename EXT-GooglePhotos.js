/**
 ** Module : EXT-GooglePhotos
 ** @bugsounet
 ** ©01-2022
 ** support: http://forum.bugsounet.fr
 **/

logNOTI = (...args) => { /* do nothing */ }

Module.register("EXT-GooglePhotos", {
  defaults: {
    debug: true,
    useGooglePhotosAPI: false,
    displayType: "none",
    displayDelay: 10 * 1000,
    displayInfos: true,
    albums: [],
    sort: "new", // "old", "random"
    hiResolution: true,
    timeFormat: "DD/MM/YYYY HH:mm",
    moduleHeight: 300,
    moduleWidth: 300,
  },

  start: function () {
    if (this.config.debug) logGP = (...args) => { console.log("[GPHOTOS]", ...args) }
    this.config.LoadingText= this.translate("LOADING")
    this.config.GPAlbumName= this.translate("GPAlbumName")
    this.GPhotos= {
      updateTimer: null,
      albums: null,
      scanned: [],
      index: 0,
      needMorePicsFlag: true,
      warning: 0
    }
    this.photos= { //@todo : display photos response array 
      displayed: false,
      position: 0,
      urls: null,
      length: 0
    }
  },

  getScripts: function() {
    return [ ]
  },

  getStyles: function () {
    return [
      "EXT-GooglePhotos.css",
      "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
    ]
  },

  getDom: function() {
    /** GPhotos Module mode**/
    if (this.config.useGooglePhotosAPI && this.config.displayType == "Module") {
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
      if (!this.config.displayInfos) GPhotosInfo.classList.add("hidden")

      GPhotos.appendChild(GPhotosBack)
      GPhotos.appendChild(GPhotosCurrent)
      GPhotos.appendChild(GPhotosInfo)
      return GPhotos
    }
    else {
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
        if (this.config.displayType == "Background" || this.config.displayType == "Module") {
          setTimeout(() => {
            if (this.config.useGooglePhotosAPI) this.showBackgroundGooglePhotoAPI()
            else {
              //this.Informations("warning", {message: "GPhotosNotActivated"})
              console.log("Warn: GPhotos not activated")
            }
          }, 10000)
        }
        this.sendNotification("EXT_HELLO", this.name)
        break
      case "EXT-GooglePhotos-Start": // @todo better (check api and after recipe)
        if (this.config.displayType == "Recipe" && this.config.useGooglePhotosAPI)
          this.showGooglePhotos()
        break
      case "EXT-GooglePhotos-Stop":
        if (this.config.displayType == "Recipe" && this.config.useGooglePhotosAPI)
          this.hideGooglePhotoAPI()
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
          //this.Informations("information", {message: "GPReceive", values: payload.length })
          console.log("GPReceive", payload.length)
        }
        break
      case "GPhotos_INIT":
        this.GPhotos.albums = payload
        break
    }    
  },

  resume: function() {
    if (this.config.displayType == "Background" && this.config.useGooglePhotosAPI) {
      var GPhotos = document.getElementById("EXT_GPHOTO")
      GPhotos.classList.remove("hidden")
      logGP("GPhotos is resumed.")
    }
  },

  suspend: function() {
    if (this.config.displayType == "Background" && this.config.useGooglePhotosAPI) {
      var GPhotos = document.getElementById("EXT_GPHOTO")
      GPhotos.classList.add("hidden")
      logGP("GPhotos is suspended.")
    }
  },

  prepare: function() {
    /** Create a popup for external photo display **/
    /** @to see maybe recipe using structure ? **/
    var photo = document.createElement("img")
    photo.id = "EXT_PHOTO"
    photo.classList.add("hidden")
    document.body.appendChild(photo)

    /** Create a Fake module for Background using **/
    if (this.config.displayType == "Background") {
      if (!this.config.useGooglePhotosAPI) return
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

    /** create a popup for Recipe using **/
    if (this.config.displayType == "Recipe") {
      var GPhotos = document.createElement("div")
      GPhotos.id = "EXT_GPHOTO"
      GPhotos.classList.add("hidden")
      GPhotos.classList.add("popup")
      var GPhotosBack = document.createElement("div")
      GPhotosBack.id = "EXT_GPHOTO_BACK"
      var GPhotosCurrent = document.createElement("div")
      GPhotosCurrent.id = "EXT_GPHOTO_CURRENT"
      GPhotosCurrent.addEventListener('animationend', ()=>{
        GPhotosCurrent.classList.remove("animated")
      })
      var GPhotosInfo = document.createElement("div")
      GPhotosInfo.id = "EXT_GPHOTO_INFO"
      GPhotosInfo.innerHTML = this.config.LoadingText
      if (!this.config.displayInfos) GPhotosInfo.classList.add("hidden")

      GPhotos.appendChild(GPhotosBack)
      GPhotos.appendChild(GPhotosCurrent)
      GPhotos.appendChild(GPhotosInfo)
      document.body.appendChild(GPhotos)
    }
  },

  /** GPhotos API **/
  updatePhotos: function () {
    if (this.GPhotos.scanned.length == 0) { // To see there bug
      console.log("!!! GPhotos debug: " + this.GPhotos.scanned.length)
      this.sendSocketNotification("GP_MORE_PICTS")
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
      //if (this.config.displayType == "Recipe") this.hideGooglePhotoAPI()
    }
    if (this.GPhotos.needMorePicsFlag) {
      this.sendSocketNotification("GP_MORE_PICTS")
    }
  },

  ready: function(url, target) {
    var hidden = document.createElement("img")
    hidden.onerror = () => {
      console.log("[GPHOTOS] Failed to Load Image.")
      //this.Informations({message: "GPFailedOpenURL" })
      this.sendSocketNotification("GP_LOAD_FAIL", url)
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
      logGP("GPHOTOS: Image loaded ["+ this.GPhotos.index + "/" + this.GPhotos.scanned.length + "]:", url)
      this.sendSocketNotification("GP_LOADED", url)
    }
    hidden.src = url
  },

  showGooglePhotoAPI: function () {
    if (this.GPhotos.scanned.length == 0) {
      clearTimeout(this.GPhotos.updateTimer)
      this.GPhotos.updateTimer = null
      //this.Informations({message: "GPNoPhotoFound" })
      this.sendSocketNotification("GP_MORE_PICTS")
      this.GPhotos.warning++
      if (this.GPhotos.warning >= 5) {
        //this.Warning({message: "GPError" })
        console.log("GP Error")
        this.GPhotos.warning = 0
        return
      }
      this.GPhotos.updateTimer = setInterval(()=>{
        this.showGooglePhotoAPI()
      }, 15000)
    } else {
      //this.Informations({message: "GPOpen" })
      clearTimeout(this.GPhotos.updateTimer)
      this.GPhotos.updateTimer = null
      //this.EXTLock()
      this.photos.displayed = true
      this.showDisplay()
      this.updatePhotos()

      this.GPhotos.updateTimer = setInterval(()=>{
        this.updatePhotos()
      }, this.config.displayDelay)
    }
  },

  hideGooglePhotoAPI: function () {
    this.stopGooglePhotoAPI()
    //this.EXTUnlock()
    this.photos.displayed = false
    this.hideDisplay()
  },

  showBackgroundGooglePhotoAPI: function () {
    if (this.GPhotos.scanned.length == 0) {
      clearTimeout(this.GPhotos.updateTimer)
      this.GPhotos.updateTimer = null
      //this.Informations({message: "GPNoPhotoFound" })
      this.sendSocketNotification("GP_MORE_PICTS")
      this.GPhotos.warning++
      if (this.GPhotos.warning >= 5) {
        //this.Warning({message: "GPError" })
        console.log("GP Error")
        this.GPhotos.warning = 0
        return
      }
      this.GPhotos.updateTimer = setInterval(()=>{
        this.showBackgroundGooglePhotoAPI()
      }, 15000)
    } else {
      //if (this.GPhotos.albums) this.Informations({message: "GPOpen" })
      clearTimeout(this.GPhotos.updateTimer)
      this.GPhotos.updateTimer = null
      this.updatePhotos()

      this.GPhotos.updateTimer = setInterval(()=>{
        this.updatePhotos()
      }, this.config.displayDelay)
    }
  },

  stopGooglePhotoAPI: function () {
    //this.Informations({message: "GPClose" })
    clearInterval(this.GPhotos.updateTimer)
    this.GPhotos.updateTimer = null
  },

  showGooglePhotos: function() {
    /*
    if (!this.config.useGooglePhotosAPI) return this.Informations("warning", { message: "GPhotosNotActivated" })
    if (this.config.displayType == "Background") return this.Informations("warning", { message: "GPhotosBckGrndActivated" })
    if (this.config.displayType == "Module") return this.Informations("warning", { message: "GPhotosModuleActivated" })
    if (this.config.displayType != "Recipe") return this.Informations("warning", { message: "GPhotosRecipeNotActivated" })
    */
    this.showGooglePhotoAPI()
  },

  showDisplay: function () {
    var dom = document.getElementById("EXT_GPHOTO")
    dom.classList.remove("hidden")
    MM.getModules().exceptModule(this).enumerate((module)=> {
      module.hide(100, {lockString: "EXT_LOCKED"})
    })
  },

  hideDisplay: function () {
    var dom = document.getElementById("EXT_GPHOTO")
    dom.classList.add("hidden")
    MM.getModules().exceptModule(this).enumerate((module)=> {
      module.show(100, {lockString: "EXT_LOCKED"})
    })
  }
})
