// pages/my-spots/my-spots.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    loading: true,
    spots: [],
    userId: ''
  },

  onLoad(options) {
    // 使用auth工具获取用户ID
    const userId = auth.getUserId()
    this.setData({ userId })

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      this.loadMySpots()
    }
  },

  // 加载我标记的钓点
  loadMySpots() {
    const { userId } = this.data

    if (!userId) {
      this.setData({
        loading: false,
        spots: []
      })
      return
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-spots/`,
      success: (res) => {
        console.log('钓点列表:', res)
        if (res.statusCode === 200) {
          let allSpots = res.data || []
          if (!Array.isArray(allSpots)) {
            allSpots = []
          }
          // 后端不支持 owner_id 过滤，前端按 owner_id 筛选
          const mySpots = allSpots.filter(spot => spot.owner_id === userId)
          const spots = mySpots.map(item => ({
            ...item,
            created_at: this.formatDate(item.created_at)
          }))
          this.setData({
            spots: spots,
            loading: false
          })
        } else {
          this.setData({
            spots: [],
            loading: false
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({
          spots: [],
          loading: false
        })
      }
    })
  },

  // 跳转到钓点详情
  goToSpotDetail(e) {
    const spotId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/spotdetail/spotdetail?id=${spotId}`
    })
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')

    return `${year}-${month}-${day}`
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMySpots()
    wx.stopPullDownRefresh()
  }
})
