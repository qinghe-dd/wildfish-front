// pages/mine/mine.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    userInfo: {},
    userId: '',
    stats: {
      mySpotsCount: 0,
      myPostsCount: 0,
      favoriteCount: 0
    }
  },

  onLoad(options) {
    // 页面加载时检查登录状态
    this.checkAndLogin()
  },

  onShow() {
    // 页面显示时刷新用户信息和统计数据
    this.refreshUserInfo()
    if (this.data.userId) {
      this.loadStats()
    }
  },

  // 检查并登录
  checkAndLogin() {
    const openid = auth.checkLogin()

    if (openid) {
      // 已登录
      console.log('✅ 用户已登录:', openid)
      this.setData({
        userId: openid,
        userInfo: auth.getUserInfo()
      })
      this.loadStats()
    } else {
      // 未登录，执行登录
      console.log('📝 用户未登录，开始登录流程')
      this.performLogin()
    }
  },

  // 执行登录
  performLogin() {
    // 先调用wx.login获取openid
    auth.login().then((openid) => {
      this.setData({ userId: openid })

      // 提示用户授权获取昵称头像
      wx.showModal({
        title: '授权提示',
        content: '为了更好的使用体验，请授权获取您的昵称和头像',
        confirmText: '去授权',
        success: (res) => {
          if (res.confirm) {
            // 用户点击"去授权"
            this.getUserProfile()
          } else {
            // 用户拒绝授权，使用默认信息
            console.log('用户拒绝授权，使用默认信息')
            const defaultUserInfo = {
              nickName: '钓鱼达人',
              avatarUrl: ''
            }
            this.setData({ userInfo: defaultUserInfo })
            this.loadStats()
          }
        }
      })
    }).catch((err) => {
      console.error('❌ 登录失败:', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    })
  },

  // 获取用户信息（昵称头像）
  getUserProfile() {
    auth.getUserProfile().then((userInfo) => {
      console.log('✅ 获取用户信息成功:', userInfo)
      this.setData({ userInfo })
      wx.showToast({
        title: '授权成功',
        icon: 'success'
      })
    }).catch((err) => {
      console.error('❌ 获取用户信息失败:', err)
      wx.showToast({
        title: '授权失败',
        icon: 'none'
      })
    })
  },

  // 刷新用户信息
  refreshUserInfo() {
    const userInfo = auth.getUserInfo()
    const userId = auth.getUserId()

    this.setData({
      userInfo: userInfo,
      userId: userId
    })
  },

  // 加载统计数据
  loadStats() {
    const { userId } = this.data

    if (!userId) {
      console.log('未登录，无法加载统计数据')
      return
    }

    // 加载我标记的钓点数量
    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-spots/`,
      success: (res) => {
        console.log('钓点列表:', res)
        if (res.statusCode === 200) {
          let spots = res.data || []
          // 后端直接返回数组，前端按 owner_id 过滤
          const mySpots = spots.filter(spot => spot.owner_id === userId)
          this.setData({
            'stats.mySpotsCount': mySpots.length || 0
          })
        }
      },
      fail: (err) => {
        console.error('加载钓点数量失败:', err)
      }
    })

    // TODO: 加载动态数量（需要后端API支持）
    // 暂时设置为0
    this.setData({
      'stats.myPostsCount': 0
    })

    // TODO: 加载收藏数量（需要后端API支持）
    // 暂时设置为0
    this.setData({
      'stats.favoriteCount': 0
    })
  },

  // 跳转到我标记的钓点
  goToMySpots() {
    wx.navigateTo({
      url: '/pages/my-spots/my-spots'
    })
  },

  // 跳转到我发布的动态
  goToMyPosts() {
    wx.navigateTo({
      url: '/pages/my-posts/my-posts'
    })
  },

  // 跳转到收藏的钓点
  goToMyFavorites() {
    wx.navigateTo({
      url: '/pages/my-favorites/my-favorites'
    })
  },

  // 跳转到设置页面
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
})
