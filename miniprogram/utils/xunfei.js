/**
 * 语音识别
 * @param filepath 语音文件路径
 */
exports.iat = function(filePath){
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://api.muxiaozi.cn/voice/iat',
      filePath,
      name: 'file',
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 语音合成
 * @param content 合成内容
 */
exports.tts = function(content){
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: 'https://api.muxiaozi.cn/voice/tts?content=' + content,
      header: {},
      success: res => resolve(res.tempFilePath),
      fail: reject
    })
  })
}