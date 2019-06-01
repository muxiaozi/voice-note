// miniprogram/pages/schedule/schedule.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    schedules: [
      {
        content: '你是一个大傻瓜',
        time: '2019-01-01 10:10',
        state: '已过期'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  /**
   * 长按日程事件
   */
  onLongTapSchedule(event) {
    wx.showActionSheet({
      itemList: ['语音播报', '修改内容', '修改日期', '删除'],
      itemColor: '#1296db',
      success(res) {
        if (res.tapIndex === 0) {

        } else if (res.tapIndex === 1) {
          wx.navigateTo({
            url: '/pages/voice/voice',
          })
        } else if (res.tapIndex === 2) {

        } else if( res.tapIndex === 3) {

        }
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})