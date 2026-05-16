// pages/team-detail/team-detail.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    teamId: null,
    teamDetail: null,
    loading: true,
    userId: '',
    userLocation: null,  // 用户位置

    // 成员列表
    members: [],

    // 留言列表
    messages: [],
    messagesLoading: false,

    // 输入框
    inputMessage: '',

    // 付费弹窗
    showPaymentModal: false,
    verifyCode: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ teamId: options.id })

      // 获取用户ID
      const userId = auth.getUserId()
      this.setData({ userId })

      // 获取用户位置
      this.getUserLocation()

      // 加载数据
      this.loadTeamDetail()
      this.loadMembers()
      this.loadMessages()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
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
        // 如果已有团队详情，重新计算距离
        if (this.data.teamDetail) {
          this.calculateSpotDistance()
        }
      },
      fail: (err) => {
        console.log('获取用户位置失败:', err)
      }
    })
  },

  /**
   * 计算钓点距离
   */
  calculateSpotDistance() {
    const { teamDetail, userLocation } = this.data
    if (!teamDetail || !teamDetail.spot_longitude || !teamDetail.spot_latitude || !userLocation) {
      return
    }

    const distance = this.calculateDistance(
      teamDetail.spot_longitude,
      teamDetail.spot_latitude
    )

    this.setData({
      'teamDetail.spot_distance': distance
    })
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
   * 加载团队详情
   */
  loadTeamDetail() {
    const { teamId, userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/${teamId}`,
      data: {
        user_id: userId || ''
      },
      success: (res) => {
        console.log('团队详情:', res)
        if (res.statusCode === 200) {
          const detail = res.data

          // 格式化数据
          detail.fishingDateText = this.formatDateTime(detail.fishing_date)
          detail.created_at_text = this.formatDate(detail.created_at)

          const statusMap = {
            'recruiting': '招募中',
            'full': '已满员',
            'started': '已出发',
            'finished': '已结束',
            'cancelled': '已取消'
          }
          detail.statusText = statusMap[detail.status] || detail.status

          this.setData({
            teamDetail: detail,
            loading: false
          })

          // 计算距离
          this.calculateSpotDistance()
        } else {
          this.setData({ loading: false })
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 加载成员列表
   */
  loadMembers() {
    const { teamId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/${teamId}/members`,
      success: (res) => {
        if (res.statusCode === 200) {
          const members = res.data || []

          // 格式化成员状态
          const statusMap = {
            'pending': '待审核',
            'approved': '已加入',
            'rejected': '已拒绝',
            'paid': '已付费'
          }

          members.forEach(member => {
            member.statusText = statusMap[member.status] || member.status
            member.join_time_text = this.formatDateTime(member.join_time)
          })

          this.setData({ members })
        }
      }
    })
  },

  /**
   * 加载留言列表
   */
  loadMessages() {
    const { teamId } = this.data
    this.setData({ messagesLoading: true })

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/${teamId}/messages`,
      success: (res) => {
        this.setData({ messagesLoading: false })
        if (res.statusCode === 200) {
          const messages = res.data || []

          messages.forEach(msg => {
            msg.created_at_text = this.formatMessageTime(msg.created_at)
          })

          this.setData({ messages })
        }
      },
      fail: () => {
        this.setData({ messagesLoading: false })
      }
    })
  },

  /**
   * 加入团队
   */
  joinTeam() {
    const { teamDetail, userId } = this.data
    const userInfo = auth.getUserInfo()

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/join`,
      method: 'POST',
      data: {
        team_id: teamDetail.id,
        user_id: userId,
        user_nickname: userInfo.nickName || '钓友',
        user_avatar: userInfo.avatarUrl || ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '加入成功',
            icon: 'success'
          })
          // 重新加载数据
          this.loadTeamDetail()
          this.loadMembers()
        } else {
          wx.showToast({
            title: res.data.detail || '加入失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 显示付费弹窗
   */
  showPaymentModal() {
    this.setData({ showPaymentModal: true })
  },

  /**
   * 隐藏付费弹窗
   */
  hidePaymentModal() {
    this.setData({ showPaymentModal: false })
  },

  /**
   * 输入验证码
   */
  onVerifyCodeInput(e) {
    this.setData({
      verifyCode: e.detail.value
    })
  },

  /**
   * 确认加入（付费）
   */
  confirmJoin() {
    const { teamDetail, userId, verifyCode } = this.data
    const userInfo = auth.getUserInfo()

    if (!verifyCode || verifyCode.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none'
      })
      return
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/join`,
      method: 'POST',
      data: {
        team_id: teamDetail.id,
        user_id: userId,
        user_nickname: userInfo.nickName || '钓友',
        user_avatar: userInfo.avatarUrl || '',
        verify_code: verifyCode
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '加入成功',
            icon: 'success'
          })
          this.hidePaymentModal()
          // 重新加载数据
          this.loadTeamDetail()
          this.loadMembers()
        } else {
          wx.showToast({
            title: res.data.detail || '加入失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 审核成员
   */
  approveMember(e) {
    const { id, action } = e.currentTarget.dataset
    const { userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/approve`,
      method: 'POST',
      data: {
        member_id: id,
        action: action,
        user_id: userId
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: action === 'approve' ? '已通过' : '已拒绝',
            icon: 'success'
          })
          // 重新加载成员列表
          this.loadMembers()
          this.loadTeamDetail()
        } else {
          wx.showToast({
            title: res.data.detail || '操作失败',
            icon: 'none'
          })
        }
      }
    })
  },

  /**
   * 输入消息
   */
  onMessageInput(e) {
    this.setData({
      inputMessage: e.detail.value
    })
  },

  /**
   * 发送消息
   */
  sendMessage() {
    const { inputMessage, teamId, userId } = this.data
    const userInfo = auth.getUserInfo()

    if (!inputMessage.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/messages`,
      method: 'POST',
      data: {
        team_id: teamId,
        sender_id: userId,
        sender_nickname: userInfo.nickName || '钓友',
        sender_avatar: userInfo.avatarUrl || '',
        content: inputMessage.trim(),
        message_type: 'text'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ inputMessage: '' })
          this.loadMessages()
        } else {
          wx.showToast({
            title: '发送失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 选择图片
   */
  chooseImage() {
    const { teamId, userId } = this.data
    const userInfo = auth.getUserInfo()

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0]

        wx.showLoading({ title: '发送中...' })

        wx.uploadFile({
          url: `${apiConfig.BASE_URL}/upload/`,
          filePath: filePath,
          name: 'file',
          success: (uploadRes) => {
            const data = JSON.parse(uploadRes.data)
            if (data.file_path) {
              const imageUrl = apiConfig.BASE_URL + data.file_path

              wx.request({
                url: `${apiConfig.BASE_URL}/fishing-teams/messages`,
                method: 'POST',
                data: {
                  team_id: teamId,
                  sender_id: userId,
                  sender_nickname: userInfo.nickName || '钓友',
                  sender_avatar: userInfo.avatarUrl || '',
                  content: '[图片]',
                  image_url: imageUrl,
                  message_type: 'image'
                },
                success: () => {
                  wx.hideLoading()
                  this.loadMessages()
                },
                fail: () => {
                  wx.hideLoading()
                  wx.showToast({
                    title: '发送失败',
                    icon: 'none'
                  })
                }
              })
            }
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        })
      }
    })
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: [url]
    })
  },

  /**
   * 复制团队代码
   */
  copyTeamCode() {
    const { teamDetail } = this.data
    wx.setClipboardData({
      data: teamDetail.team_code,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  /**
   * 分享团队
   */
  shareTeam() {
    const { teamDetail } = this.data
    wx.showModal({
      title: '分享团队',
      content: `团队代码：${teamDetail.team_code}\n\n分享给好友，扫码即可加入`,
      confirmText: '复制代码',
      success: (res) => {
        if (res.confirm) {
          this.copyTeamCode()
        }
      }
    })
  },

  /**
   * 显示管理菜单
   */
  showManageMenu() {
    wx.showActionSheet({
      itemList: ['查看团队代码', '生成小程序码'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.copyTeamCode()
        } else if (res.tapIndex === 1) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 阻止滚动
   */
  preventScroll() {
    return false
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(dateStr) {
    if (!dateStr) return '待定'

    const date = new Date(dateStr)
    const now = new Date()
    const diff = date - now

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
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今天'
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${month}-${day}`
    }
  },

  /**
   * 格式化消息时间
   */
  formatMessageTime(dateStr) {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${month}-${day}`
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadTeamDetail()
    this.loadMembers()
    this.loadMessages()
    wx.stopPullDownRefresh()
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const { teamDetail } = this.data
    return {
      title: teamDetail.title,
      path: `/pages/team-detail/team-detail?id=${teamDetail.id}`,
      imageUrl: ''
    }
  }
})
