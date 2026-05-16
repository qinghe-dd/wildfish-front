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
    },
    showProfileEditor: false,
    editNickname: ''
  },

  onLoad(options) {
    this.checkAndLogin()
  },

  onShow() {
    this.refreshUserInfo()
    if (this.data.userId) {
      this.loadStats()
    }
  },

  // 检查登录状态，未登录直接弹出资料编辑弹窗
  checkAndLogin() {
    const openid = auth.checkLogin()

    if (openid) {
      this.setData({
        userId: openid,
        userInfo: auth.getUserInfo()
      })
      this.loadStats()
    } else {
      // 未登录 → 直接弹出资料编辑弹窗
      this.setData({
        showProfileEditor: true,
        editNickname: ''
      })
    }
  },

  // 显示资料编辑弹窗
  showProfileEditor() {
    this.setData({
      showProfileEditor: true,
      editNickname: this.data.userInfo.nickName || ''
    })
  },

  // 隐藏资料编辑弹窗
  hideProfileEditor() {
    this.setData({ showProfileEditor: false })
  },

  // 阻止事件冒泡（空操作）
  preventBubble() {
    // 空函数，仅用于 catchtap 阻止点击穿透到遮罩层
  },

  // 选择头像（通过 button open-type="chooseAvatar" 回调）
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    const userInfo = this.data.userInfo
    userInfo.avatarUrl = avatarUrl
    this.setData({ userInfo })
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value })
  },

  // 确认昵称（blur 时从 nickname input 组件获取微信昵称）
  onNicknameConfirm(e) {
    const nickName = e.detail.value
    if (nickName) {
      this.setData({ editNickname: nickName })
    }
  },

  // 保存资料 — 调用 loginWithProfile 一次性完成登录+存库
  saveProfile() {
    const { editNickname, userInfo } = this.data
    const nickName = editNickname || userInfo.nickName || '钓鱼达人'
    const avatarUrl = userInfo.avatarUrl || ''

    wx.showLoading({ title: '保存中...' })

    auth.loginWithProfile(avatarUrl, nickName).then((updatedInfo) => {
      wx.hideLoading()
      this.setData({
        userInfo: updatedInfo,
        userId: auth.getUserId(),
        showProfileEditor: false
      })
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      this.loadStats()
    }).catch((err) => {
      wx.hideLoading()
      console.error('保存资料失败:', err)
      wx.showToast({
        title: err.message || '保存失败',
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
      return
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-spots/`,
      success: (res) => {
        if (res.statusCode === 200) {
          let spots = res.data || []
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

    this.setData({
      'stats.myPostsCount': 0
    })

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
