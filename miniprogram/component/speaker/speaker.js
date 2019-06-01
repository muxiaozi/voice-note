// component/speaker/speaker.js
const xunfei = require('../../utils/xunfei.js')

Component({
  /**
   * 组件的属性列表
   */
  properties: {
  },

  /**
   * 组件的初始数据
   */
  data: {
  },

  /**
   * 组件生命周期函数-在组件布局完成后执行
   */
  ready() {
    const recorderManager = wx.getRecorderManager()

    recorderManager.onStart(() => {
      wx.showToast({
        title: '松开识别',
        image: '/images/voice.png',
        duration: 60000,
        mask: true
      })
    })

    recorderManager.onPause(() => {
    })

    recorderManager.onStop((res) => {

      // 录音时间不得小于1秒
      if(res.duration < 1000){
        wx.showToast({
          title: '录音时间太短',
          icon: 'none'
        })
        return
      }

      wx.showToast({
        title: '正在识别',
        icon: 'loading',
        duration: 60000,
        mask: true
      })

      // 讯飞语音识别
      const { tempFilePath } = res
      xunfei.iat(tempFilePath)
        .then(res => {
          wx.hideToast()
          let json = JSON.parse(res.data)
          if(json.code !== 0){
            this.triggerEvent('speak', { content: null, err: json.message, tempFilePath })
          }else{
            this.triggerEvent('speak', { content: json.data, err: null, tempFilePath })
          }
        })
        .catch(err => {
          wx.hideToast()
          this.triggerEvent('speak', { content: null, err, tempFilePath: null})
        })
    })
  },

  /**
   * 组件的方法列表
   */
  methods: {
    startSpeak(){
      const options = {
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 24000,
        format: 'aac',
        frameSize: 50
      }

      const recorderManager = wx.getRecorderManager()
      recorderManager.start(options)
    },

    stopSpeak(){
      setTimeout(() => {
        const recorderManager = wx.getRecorderManager()
        recorderManager.stop()
      }, 500)
    }
  }
})
