//index.js
const app = getApp()
const xunfei = require('../../utils/xunfei.js');

let recorderManager = null;

Page({
  data: {
    notes: []
  },

  onLoad: function() {
    if (!wx.cloud) {
      console.error('您的版本不支持云函数，请更新到2.2.3');
      return
    }

    // 初始化录音
    this.initRecorderManager();

    // 获取OpenID
    this.initOpenid();

    // 更新数据库
    this.updateNotesFromDatabase();

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              this.setData({
                avatarUrl: res.userInfo.avatarUrl,
                userInfo: res.userInfo
              })
            }
          })
        }
      }
    })
  },

  /**
   * 初始化录音
   */
  initRecorderManager() {
    recorderManager = wx.getRecorderManager();

    recorderManager.onStart(() => {
      console.log('recorder start')
    })
    recorderManager.onPause(() => {
      console.log('recorder pause')
    })
    recorderManager.onStop((res) => {
      console.log('recorder stop', res)
      const { tempFilePath } = res
      // 
      xunfei.iat(tempFilePath)
        .then(res => {
          let json = JSON.parse(res.data)
          return this.uploadVoice(tempFilePath)  // 上传音频文件
            .then(fileID => this.addNote(json.data, fileID)) // 上传数据库
        })
        .then(res => {
          // 添加新数据到界面
          let notes = this.data.notes;
          notes.push(res)
          this.setData({
            notes
          })

          console.log('添加记录成功', res)
        })
        .catch(err => {
          console.error(err)
        })
    })
    recorderManager.onFrameRecorded((res) => {
      const { frameBuffer } = res
      console.log('frameBuffer.byteLength', frameBuffer.byteLength)
    })
  },

  /**
   * 获取数据库中的数据
   */
  updateNotesFromDatabase(){
    this.getNoteList()
      .then(res => {
        res.forEach(res => {
          let notes = this.data.notes;
          notes.push({
            time: this.formatTime(res.time),
            content: res.content
          })
          this.setData({
            notes
          })
        })
      })
      .catch(err => console.error)
  },

  /**
   * 开始录音
   */
  startSpeak(){
    const options = {
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 24000,
      format: 'aac',
      frameSize: 50
    }

    recorderManager.start(options)
  },

  /**
   * 停止录音
   */
  stopSpeak() {
    recorderManager.stop();
  },

  /**
   * 添加笔记
   */
  addNote(content, fileID) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      const time = Date.now()

      db.collection('notes').add({
        data: {
          time,
          content,
          voice_file_id: fileID
        },
        success: res => {
          resolve({
            content,
            time: this.formatTime(time)
          })
        },
        fail: reject
      })
    })
  },

  /**
   * 查询笔记
   */
  getNoteList(){
    return new Promise((resolve, reject) => {
      const openid = app.globalData.openid
      const db = wx.cloud.database();
      db.collection('notes').where({
        _openid: openid
      }).get({
        success: res => resolve(res.data),
        fail: reject
      })
    })
  },

  /**
   * 获取笔记
   */
  getNote(noteId){
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      db.collection('notes').doc(noteId).get({
        success(res) {
          resolve(res.data)
        },
        fail: reject
      })
    })
  },

  /**
   * 获取OpenID
   */
  initOpenid() {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        app.globalData.openid = res.result.openid
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
        wx.showToast({
          title: '请先登录',
        })
      }
    })
  },

  /**
   * 语音合成
   */
  readContent(event) {
    let content = event.currentTarget.dataset.content;
    xunfei.tts(content)
      .then(tempFilePath => {
        // 播放tempFilePath
        const innerAudioContext = wx.createInnerAudioContext()
        innerAudioContext.autoplay = true
        innerAudioContext.src = tempFilePath
        innerAudioContext.onPlay(() => {
          console.log('开始播放', tempFilePath)
        })
        innerAudioContext.onError((res) => {
          console.log(res.errMsg)
          console.log(res.errCode)
        })
        innerAudioContext.play()
      })
      .catch(err => console.error)
  },

  /**
   * 上传音频文件到数据库
   */
  uploadVoice(filePath){
    if(!app.globalData.openid){
      wx.showToast({
        title: '请先登录',
      })
      return Promise.reject('请先登录')
    }

    return new Promise((resolve, reject) => {
      let cloudPath = 'voice-temp.aac';

      wx.cloud.uploadFile({
        filePath,
        cloudPath,
        success: res => resolve(res.fileID),
        fail: reject
      })
    })
  },

  /**
   * 下载音频文件
   */
  downloadVoice(fileID){
    return new Promise((resolve, reject) => {
      wx.cloud.downloadFile({
        fileID,
        success: res => resolve(res.tempFilePath),
        fail: reject
      })
    })
  },

  /**
   * 时间格式化
   */
  formatTime(timestamp){
    let time = new Date(timestamp)
    let year = time.getFullYear()
    let month = time.getMonth()
    let date = time.getDate()
    let hours = time.getHours()
    let minutes = time.getMinutes()
    let seconds = time.getSeconds()
    
    return `${year}/${month}/${date} ${hours}:${minutes}:${seconds}`
  }
})
