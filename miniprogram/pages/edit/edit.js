Page({
  data: {
    id: null,
    content: null
  },

  onLoad(option){
    let { id, content } = option
    this.setData({
      id,
      content
    })
  },

  onContentBlur(e){
    this.setData({
      content: e.detail.value
    })
  },

  submitContent(e){
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]

    let editCallback = prevPage.editCallback
    editCallback && editCallback(this.data.id, this.data.content)
    wx.navigateBack({
      delta: 1
    })
  }
})