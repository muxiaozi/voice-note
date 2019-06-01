const app = getApp()
const xunfei = require('../../utils/xunfei.js')

// 笔记缓存
let schedules_cache = []

Page({

  /**
   * 页面的初始数据
   */
  data: {
    schedules: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.updateSchedulesFromDatabase()
  },

  /**
   * 长按日程事件
   */
  onLongTapSchedule(event) {
    let that = this
    wx.showActionSheet({
      itemList: ['语音播报', '修改内容', '删除'],
      itemColor: '#1296db',
      success(res) {
        if (res.tapIndex === 0) { // 语音播报
          that.readContent(event.currentTarget.dataset.content)
        } else if (res.tapIndex === 1) {  // 修改内容
          wx.navigateTo({
            url: '/pages/edit/edit?id=' + event.currentTarget.dataset.id + '&content=' + event.currentTarget.dataset.content,
          })
        } else if( res.tapIndex === 2) {  // 删除
          that.deleteSchedule(event.currentTarget.dataset.id)
          schedules_cache = schedules_cache.filter(node => node.id != event.currentTarget.dataset.id)
          that.updateScheduleList()
        }
      }
    })
  },

  /**
   * 更新日程列表
   */
  updateScheduleList(){
    this.setData({
      schedules: schedules_cache
    })
  },

  /**
   * 语音事件
   */
  onSpeak(e) {
    const { content, err, tempFilePath } = e.detail
    if (err) {
      console.error(err)
      return
    }

    this.uploadVoice(tempFilePath)     // 上传音频文件
      .then(fileID => this.addSchedule(content, fileID)) // 上传数据库
      .then(res => {
        // 添加新数据到界面
        schedules_cache.unshift(res)
        this.updateScheduleList()
      })
      .catch(err => {
        console.error(err)
      })
  },

  /**
   * 修改值回调
   */
  editCallback(id, content) {
    this.updateSchedule(id, content)
    schedules_cache.forEach(node => {
      if (node.id === id) {
        node.content = content
      }
    })
    this.updateScheduleList()
  },

  /**
   * 获取数据库中的数据
   */
  updateSchedulesFromDatabase() {
    this.getScheduleList()
      .then(res => {
        schedules_cache = res
          .map(node => {  // 构造
            return {
              id: node._id,
              time: this.formatTime(node.time),
              content: node.content,
            }
          })
          .reverse()  // 反转（逆序）

        this.updateScheduleList()
        wx.stopPullDownRefresh()
      })
      .catch(err => {
        console.error(err)
        wx.stopPullDownRefresh()
      })
  },

  /**
   * 添加笔记
   */
  addSchedule(content, fileID) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      const time = Date.now()

      db.collection('schedule').add({
        data: {
          time,
          content,
          voice_file_id: fileID
        },
        success: res => {
          resolve({
            id: res._id,
            content,
            time: this.formatTime(time),
            state: null
          })
        },
        fail: reject
      })
    })
  },

  /**
   * 修改笔记
   */
  updateSchedule(scheduleId, content) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()

      db.collection('schedule')
        .doc(scheduleId)
        .update({
          data: {
            content
          },
          success: resolve,
          fail: reject
        })
    })
  },

  /**
   * 更新日程时间
   */
  updateScheduleTime(scheduleId, time) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()

      db.collection('schedule')
        .doc(scheduleId)
        .update({
          data: {
            time
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
  getScheduleList() {
    return new Promise((resolve, reject) => {
      const openid = app.globalData.openid
      const db = wx.cloud.database();
      const MAX_LIMIT = 20

      // 先取出集合记录总数
      db.collection('schedule')
        .where({ _openid: openid })
        .count()
        .then(countResult => countResult.total)
        .then(total => {
          // 计算需分几次取
          const batchTimes = Math.ceil(total / MAX_LIMIT)
          // 承载所有读操作的 promise 的数组
          const tasks = []
          for (let i = 0; i < batchTimes; i++) {
            const promise = db.collection('schedule')
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
  getSchedule(scheduleId) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      db.collection('schedule').doc(scheduleId).get({
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
  deleteSchedule(nodeId) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      db.collection('schedule').doc(nodeId).remove({
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
  uploadVoice(filePath) {
    if (!app.globalData.openid) {
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
   * 日期选择
   */
  onPickerChange(e){
    const { id, dateString } = e.detail

    // 更新数据库
    const time = new Date(dateString).getTime()
    this.updateScheduleTime(id, time)
  },

  /**
  * 时间格式化
  */
  formatTime(timestamp) {
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
    this.updateSchedulesFromDatabase();
  }
})