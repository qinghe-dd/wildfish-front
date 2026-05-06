// pages/my-favorites/my-favorites.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    loading: true,
    spots: [],
    userId: ''
  },

  onLoad(options) {
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
      this.loadFavorites()
    }
  },

  // 加载收藏的钓点
  loadFavorites() {
    const { userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/favorites/`,
      data: {
        user_id: userId
      },
      success: (res) => {
        console.log('收藏列表响应:', res.statusCode, res.data)
        if (res.statusCode === 200) {
          let favorites = res.data || []
          if (!Array.isArray(favorites)) {
            console.error('收藏数据格式异常:', typeof favorites, favorites)
            favorites = []
          }

          // 获取每个收藏钓点的详细信息
          if (favorites.length > 0) {
            this.loadSpotDetails(favorites)
          } else {
            this.setData({
              spots: [],
              loading: false
            })
          }
        } else {
          this.setData({
            spots: [],
            loading: false
          })
        }
      },
      fail: (err) => {
        console.error('收藏列表请求失败:', err)
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

  // 加载钓点详情
  loadSpotDetails(favorites) {
    const spotIds = favorites.map(f => f.spot_id)

    // 并行获取所有钓点信息
    const promises = spotIds.map(spotId => {
      return new Promise((resolve) => {
        wx.request({
          url: `${apiConfig.BASE_URL}/fishing-spots/${spotId}`,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              resolve(null)
            }
          },
          fail: () => resolve(null)
        })
      })
    })

    Promise.all(promises).then(spots => {
      const validSpots = spots.filter(s => s !== null).map(spot => ({
        ...spot,
        created_at: this.formatDate(spot.created_at)
      }))

      this.setData({
        spots: validSpots,
        loading: false
      })
    })
  },

  // 跳转到钓点详情
  goToSpotDetail(e) {
    const spotId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/spotDetail/spotDetail?id=${spotId}`
    })
  },

  // 取消收藏
  removeFavorite(e) {
    const spotId = e.currentTarget.dataset.id
    const userId = this.data.userId

    wx.showModal({
      title: '确认取消',
      content: '确定要取消收藏这个钓点吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `${apiConfig.BASE_URL}/favorites/${spotId}`,
            method: 'DELETE',
            data: {
              user_id: userId
            },
            success: () => {
              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              })
              this.loadFavorites()
            }
          })
        }
      }
    })
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}/${day}`
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  }
})
