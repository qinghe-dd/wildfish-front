// pages/mall/mall.js
Page({
  data: {

  },

  onLoad(options) {
    // 跳转到动态列表页面
    wx.redirectTo({
      url: '/pages/posts-list/posts-list'
    })
  }
})
