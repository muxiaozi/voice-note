//index.js
const app = getApp()
const xunfei = require('../../utils/xunfei.js')

// 笔记缓存
let notes_cache = []

Page({
  data: {
    notes: [],
    inputShowed: false,
    inputVal: ""
  },

  showInput: function () {
    this.setData({
      inputShowed: true
    });
  },

  hideInput: function () {
    this.setData({
      inputVal: "",
      inputShowed: false
    });
    this.updateNoteList()
  },

  clearInput: function () {
    this.setData({
      inputVal: ""
    });
    this.updateNoteList()
  },
  
  inputTyping: function (e) {
    this.setData({
      inputVal: e.detail.value
    });
    this.updateNoteList(e.detail.value)
  },

  /**
   * 语音事件
   */
  onSpeak(e) {
    const { content, err, tempFilePath } = e.detail
    if(err){
      console.error(err)
      return
    }

    // 在搜索状态
    if (this.data.inputShowed){
      let inputVal = content.replace('。', '')
      this.setData({
        inputVal
      })
      this.updateNoteList(inputVal)
    }else{ // 在记事本状态
      this.uploadVoice(tempFilePath)     // 上传音频文件
        .then(fileID => this.addNote(content, fileID)) // 上传数据库
        .then(res => {
          // 添加新数据到界面
          notes_cache.unshift(res)
          this.updateNoteList()
        })
        .catch(err => console.error)
    }
  },

  /**
   * 长按事件
   */
  onLongTapNote(event){
    let that = this
    wx.showActionSheet({
      itemList: ['语音播报', '修改内容', '删除'],
      itemColor: '#1296db',
      success(res) {
        if(res.tapIndex === 0){ // 语音播报
          that.readContent(event.currentTarget.dataset.content)
        }else if(res.tapIndex === 1){ // 修改内容
          wx.navigateTo({
            url: '/pages/edit/edit?id=' + event.currentTarget.dataset.id + '&content=' + event.currentTarget.dataset.content,
          })
        }else if(res.tapIndex === 2){ // 删除
          that.deleteNote(event.currentTarget.dataset.id)
          notes_cache = notes_cache.filter(node => node.id != event.currentTarget.dataset.id)
          that.updateNoteList()
        }
      }
    })
  },

  /**
   * 初始化
   */
  onLoad: function() {
    if (!wx.cloud) {
      console.error('您的版本不支持云函数，请更新到2.2.3');
      return
    }

    // 更新数据库
    this.updateNotesFromDatabase()
  },

  /**
   * 修改值回调
   */
  editCallback(id, content) {
    this.updateNote(id, content)
    notes_cache.forEach(node => {
      if(node.id === id){
        node.content = content
      }
    })
    this.updateNoteList()
  },

  /**
   * 获取数据库中的数据
   */
  updateNotesFromDatabase(){
    this.getNoteList()
      .then(res => {
        notes_cache = res
          .map(node => {  // 构造
            return {
              id: node._id,
              time: this.formatTime(node.time),
              content: node.content,
            }
          })
          .reverse()  // 反转（逆序）

        this.updateNoteList()
        wx.stopPullDownRefresh()
      })
      .catch(err => {
        console.error(err)
        wx.stopPullDownRefresh()
      })
  },

  /**
   * 根据输入的状态来更新列表
   */
  updateNoteList(input = ''){
    let notes = notes_cache
      .filter(node => node.content.indexOf(input) !== -1) // 筛选

    this.setData({
      notes
    })
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
            id: res._id,
            content,
            time: this.formatTime(time)
          })
        },
        fail: reject
      })
    })
  },

  /**
   * 修改笔记
   */
  updateNote(noteId, content){
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      const time = Date.now()

      db.collection('notes')
        .doc(noteId)
        .update({
          data: {
            time,
            content
          },
          success: resolve,
          fail: reject
        })
    })
  },

  /**
   * 查询笔记
   * 小程序一次最多查询20条数据，所以需要分多次拼接
   */
  getNoteList(){
    return new Promise((resolve, reject) => {
      const openid = app.globalData.openid
      const db = wx.cloud.database();
      const MAX_LIMIT = 20

      // 先取出集合记录总数
      db.collection('notes')
        .where({ _openid: openid })
        .count()
        .then(countResult => countResult.total)
        .then(total => {
          // 计算需分几次取
          const batchTimes = Math.ceil(total / MAX_LIMIT)
          // 承载所有读操作的 promise 的数组
          const tasks = []
          for (let i = 0; i < batchTimes; i++) {
            const promise = db.collection('notes')
              .where({ _openid: openid })
              .skip(i * MAX_LIMIT)
              .limit(MAX_LIMIT)
              .get()
            tasks.push(promise)
          }
          return Promise.all(tasks)
        })
        .then(res => {
          let all = res.reduce((acc, cur) => {
            return {
              data: acc.data.concat(cur.data),
              errMsg: acc.errMsg,
            }
          })
          resolve(all.data)
        })
        .catch(err => reject)
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
   * 删除笔记
   */
  deleteNote(nodeId){
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      db.collection('notes').doc(nodeId).remove({
        success: resolve,
        fail: reject
      })
    })
  },

  /**
   * 语音合成
   */
  readContent(content) {
    xunfei.tts(content)
      .then(tempFilePath => {
        // 播放tempFilePath
        const innerAudioContext = wx.createInnerAudioContext()
        innerAudioContext.autoplay = true
        innerAudioContext.src = tempFilePath
        innerAudioContext.onPlay(() => {
          console.log('开始播放', tempFilePath)
        })
        innerAudioContext.onError(res => console.error)
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
      let cloudPath = String(Date.now()) + '.aac';

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
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.updateNotesFromDatabase();
  }
})
