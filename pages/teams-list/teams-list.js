// pages/teams-list/teams-list.js
const apiConfig = require('../../config/api.js')

Page({
  data: {
    activeTab: 'recruiting',  // 当前选中的tab
    teams: [],                // 团队列表
    loading: true,            // 加载状态
    userId: '',               // 用户ID
    userLocation: null        // 用户位置
  },

  onLoad(options) {
    // 获取用户ID
    const userId = wx.getStorageSync('userId')
    this.setData({ userId })

    // 获取用户位置
    this.getUserLocation()

    // 加载团队列表
    this.loadTeams()
  },

  /**
   * 获取用户位置
   */
  getUserLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        this.setData({
          userLocation: {
            longitude: res.longitude,
            latitude: res.latitude
          }
        })
        // 重新计算距离
        this.refreshDistances()
      },
      fail: (err) => {
        console.log('获取用户位置失败:', err)
      }
    })
  },

  /**
   * 刷新距离显示
   */
  refreshDistances() {
    if (!this.data.userLocation || this.data.teams.length === 0) return

    const updatedTeams = this.data.teams.map(team => {
      if (team.spot_longitude && team.spot_latitude) {
        team.spot_distance = this.calculateDistance(
          team.spot_longitude,
          team.spot_latitude
        )
      }
      return team
    })

    this.setData({ teams: updatedTeams })
  },

  /**
   * 计算距离（使用 Haversine 公式）
   */
  calculateDistance(lon, lat) {
    if (!lon || !lat || !this.data.userLocation) return '未知距离'

    const userLon = this.data.userLocation.longitude
    const userLat = this.data.userLocation.latitude
    const spotLon = parseFloat(lon)
    const spotLat = parseFloat(lat)

    const R = 6371 // 地球半径，单位：公里
    const dLat = this.toRadians(spotLat - userLat)
    const dLon = this.toRadians(spotLon - userLon)

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(userLat)) * Math.cos(this.toRadians(spotLat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    // 根据距离返回合适的显示格式
    if (distance < 1) {
      return Math.round(distance * 1000) + 'm'
    } else if (distance < 10) {
      return distance.toFixed(1) + 'km'
    } else {
      return Math.round(distance) + 'km'
    }
  },

  /**
   * 将角度转换为弧度
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180)
  },

  /**
   * 切换tab
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.loadTeams()
  },

  /**
   * 加载团队列表
   */
  loadTeams() {
    const { activeTab, userId } = this.data
    let status = 'recruiting'
    let url = `${apiConfig.BASE_URL}/fishing-teams/`
    let data = {
      user_id: userId || ''
    }

    // 根据tab设置status
    if (activeTab === 'recruiting') {
      status = 'recruiting'
    } else if (activeTab === 'full') {
      status = 'full'
    } else if (activeTab === 'my') {
      // 我的组队不过滤status，在前端筛选
      status = ''
    }

    if (status) {
      data.status = status
    }

    this.setData({ loading: true })

    wx.request({
      url: url,
      data: data,
      success: (res) => {
        console.log('团队列表:', res)
        if (res.statusCode === 200) {
          let teams = res.data || []

          // 格式化数据
          teams = teams.map(team => {
            // 格式化时间
            team.fishingDateText = this.formatDateTime(team.fishing_date)

            // 状态文本
            const statusMap = {
              'recruiting': '招募中',
              'full': '已满员',
              'started': '已出发',
              'finished': '已结束',
              'cancelled': '已取消'
            }
            team.statusText = statusMap[team.status] || team.status

            // 成员状态文本
            const memberStatusMap = {
              'pending': '待审核',
              'approved': '已加入',
              'rejected': '已拒绝',
              'paid': '已付费'
            }
            team.memberStatusText = memberStatusMap[team.member_status] || ''

            return team
          })

          // 如果是"我的组队"，筛选出用户相关的团队
          if (activeTab === 'my') {
            teams = teams.filter(team =>
              team.is_captain || team.is_member
            )
          }

          this.setData({
            teams: teams,
            loading: false
          })
        } else {
          this.setData({
            teams: [],
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
          teams: [],
          loading: false
        })
      }
    })
  },

  /**
   * 跳转到团队详情
   */
  goToTeamDetail(e) {
    const teamId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/team-detail/team-detail?id=${teamId}`
    })
  },

  /**
   * 跳转到创建团队页面
   */
  goToCreate() {
    wx.navigateTo({
      url: '/pages/create-team/create-team'
    })
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(dateStr) {
    if (!dateStr) return '待定'

    const date = new Date(dateStr)
    const now = new Date()
    const diff = date - now

    // 计算天数差
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    let dateText = `${month}月${day}日 ${hours}:${minutes}`

    if (days === 0) {
      dateText = `今天 ${hours}:${minutes}`
    } else if (days === 1) {
      dateText = `明天 ${hours}:${minutes}`
    } else if (days > 1 && days <= 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const weekday = weekdays[date.getDay()]
      dateText = `${weekday} ${hours}:${minutes}`
    }

    return dateText
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadTeams()
    wx.stopPullDownRefresh()
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '约钓组队 - 一起来钓鱼吧',
      path: '/pages/teams-list/teams-list'
    }
  }
})
