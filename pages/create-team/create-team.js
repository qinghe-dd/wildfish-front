// pages/create-team/create-team.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    form: {
      title: '',                    // 活动标题
      spot_id: null,                // 钓点ID
      spot_name: '',                // 钓点名称
      spot_address: '',             // 钓点地址
      spot_distance: '',            // 钓点距离
      spot_longitude: null,         // 经度
      spot_latitude: null,          // 纬度
      location_name: '',            // 位置名称
      fishing_date: null,           // 约钓时间
      fishing_date_text: '',        // 时间文本
      min_members: 2,               // 最少人数
      max_members: 6,               // 最多人数
      is_paid_team: 0,              // 是否付费
      fee_amount: '',               // 费用金额
      payment_mode: 'direct',       // 支付方式：direct/platform
      payment_qr_code_url: '',      // 收款码URL
      require_approval: 0,          // 是否需要审核
      description: ''               // 活动描述
    },
    // 用户发布的钓点列表
    mySpots: [],
    spotIndex: -1,  // 选中的钓点索引
    // 日期选择器数据
    dateRange: [[], [], []],
    dateIndex: [0, 0, 0],
    dateRangeKey: 'name',
    // 支付配置
    paymentConfig: {
      enabled_modes: ['direct'],
      default_mode: 'direct'
    }
  },

  onLoad(options) {
    // 如果从钓点详情页跳转过来，预填钓点信息
    if (options.spotId) {
      this.setData({
        'form.spot_id': parseInt(options.spotId),
        'form.spot_name': options.spotName || '',
        'form.spot_address': options.spotAddress || '',
        'form.spot_distance': options.spotDistance || ''
      })
    }

    // 初始化日期选择器
    this.initDatePicker()

    // 加载用户发布的钓点列表
    this.loadMySpots()

    // 加载支付配置
    this.loadPaymentConfig()
  },

  /**
   * 加载支付配置
   */
  loadPaymentConfig() {
    wx.request({
      url: `${apiConfig.BASE_URL}/team-payment/public-config`,
      success: (res) => {
        if (res.statusCode === 200) {
          const config = res.data
          this.setData({
            paymentConfig: config,
            'form.payment_mode': config.default_mode || 'direct'
          })
        }
      },
      fail: () => {
        console.error('加载支付配置失败')
      }
    })
  },

  /**
   * 加载用户发布的钓点列表
   */
  loadMySpots() {
    const userId = auth.getUserId()

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-spots/`,
      data: {
        owner_id: userId
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const spots = res.data || []
          if (spots.length === 0) {
            this.setData({ mySpots: [] })
          } else {
            // 格式化钓点列表
            const formattedSpots = spots.map(spot => ({
              id: spot.id,
              name: spot.name || spot.spot_type + '钓点',
              address: spot.address || '',
              spot_type: spot.spot_type
            }))
            this.setData({ mySpots: formattedSpots })
          }
        }
      },
      fail: () => {
        console.error('加载钓点列表失败')
      }
    })
  },

  /**
   * 选择钓点
   */
  onSpotChange(e) {
    const index = e.detail.value
    if (index === '' || index === -1) {
      // 未选择
      this.setData({
        spotIndex: -1,
        'form.spot_id': null,
        'form.spot_name': '',
        'form.spot_address': ''
      })
      return
    }

    const spot = this.data.mySpots[index]
    this.setData({
      spotIndex: parseInt(index),
      'form.spot_id': spot.id,
      'form.spot_name': spot.name,
      'form.spot_address': spot.address,
      'form.location_name': ''  // 清空手动输入的位置（互斥）
    })
  },

  /**
   * 初始化日期选择器
   */
  initDatePicker() {
    const days = []
    const hours = []
    const minutes = []

    // 生成未来7天的日期
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]

      let name = ''
      if (i === 0) {
        name = '今天'
      } else if (i === 1) {
        name = '明天'
      } else {
        name = weekday
      }

      days.push({
        name: `${month}月${day}日 ${name}`,
        value: date.toISOString()
      })
    }

    // 生成小时（0-23）
    for (let i = 0; i < 24; i++) {
      hours.push({
        name: `${i.toString().padStart(2, '0')}:00`,
        value: i
      })
    }

    // 生成分钟（0, 15, 30, 45）
    const minuteValues = [0, 15, 30, 45]
    minuteValues.forEach(m => {
      minutes.push({
        name: m.toString().padStart(2, '0'),
        value: m
      })
    })

    this.setData({
      dateRange: [days, hours, minutes]
    })
  },

  /**
   * 输入标题
   */
  onTitleInput(e) {
    this.setData({
      'form.title': e.detail.value
    })
  },

  /**
   * 移除钓点
   */
  removeSpot() {
    wx.showModal({
      title: '确认移除',
      content: '确定要移除已选择的钓点吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            spotIndex: -1,
            'form.spot_id': null,
            'form.spot_name': '',
            'form.spot_address': '',
            'form.spot_distance': '',
            'form.spot_longitude': null,
            'form.spot_latitude': null,
            'form.location_name': ''  // 清空手动输入的位置
          })
        }
      }
    })
  },

  /**
   * 输入位置
   */
  onLocationInput(e) {
    this.setData({
      'form.location_name': e.detail.value,
      // 如果手动输入位置，清空已选择的钓点（互斥）
      'form.spot_id': null,
      'form.spot_name': '',
      'form.spot_address': '',
      'form.spot_distance': '',
      'form.spot_longitude': null,
      'form.spot_latitude': null,
      spotIndex: -1
    })
  },

  /**
   * 选择日期时间
   */
  onDateChange(e) {
    const index = e.detail.value
    const [dayIndex, hourIndex, minuteIndex] = index

    const day = this.data.dateRange[0][dayIndex]
    const hour = this.data.dateRange[1][hourIndex]
    const minute = this.data.dateRange[2][minuteIndex]

    // 构建日期对象
    const date = new Date(day.value)
    date.setHours(hour.value, minute.value, 0, 0)

    const dateText = `${day.name} ${hour.name}:${minute.name}`

    this.setData({
      dateIndex: index,
      'form.fishing_date': date.toISOString(),
      'form.fishing_date_text': dateText
    })
  },

  /**
   * 输入最少人数
   */
  onMinMembersInput(e) {
    let value = parseInt(e.detail.value) || 2
    if (value < 2) value = 2
    if (value > this.data.form.max_members) value = this.data.form.max_members

    this.setData({
      'form.min_members': value
    })
  },

  /**
   * 输入最多人数
   */
  onMaxMembersInput(e) {
    let value = parseInt(e.detail.value) || 6
    if (value < this.data.form.min_members) value = this.data.form.min_members
    if (value > 20) value = 20

    this.setData({
      'form.max_members': value
    })
  },

  /**
   * 设置费用类型
   */
  setFeeType(e) {
    const type = parseInt(e.currentTarget.dataset.type)
    this.setData({
      'form.is_paid_team': type
    })
  },

  /**
   * 输入费用金额
   */
  onFeeAmountInput(e) {
    this.setData({
      'form.fee_amount': e.detail.value
    })
  },

  /**
   * 上传收款码
   */
  uploadPaymentQr() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0]

        wx.showLoading({ title: '上传中...' })

        wx.uploadFile({
          url: `${apiConfig.BASE_URL}/upload/`,
          filePath: filePath,
          name: 'file',
          success: (uploadRes) => {
            try {
              console.log('收款码上传响应:', uploadRes.data)
              wx.hideLoading()
              const data = JSON.parse(uploadRes.data)
              if (data.url) {
                // data.url 是相对路径，需要拼接 BASE_URL
                const qrCodeUrl = data.url.startsWith('http') ? data.url : (apiConfig.BASE_URL + data.url)
                this.setData({
                  'form.payment_qr_code_url': qrCodeUrl
                })
                wx.showToast({
                  title: '上传成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '上传失败',
                  icon: 'none'
                })
              }
            } catch (e) {
              wx.hideLoading()
              console.error('解析上传响应失败', e)
              wx.showToast({
                title: '上传失败',
                icon: 'none'
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
   * 删除收款码
   */
  removePaymentQr() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除收款码吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'form.payment_qr_code_url': ''
          })
        }
      }
    })
  },

  /**
   * 是否需要审核
   */
  onApprovalChange(e) {
    this.setData({
      'form.require_approval': e.detail.value ? 1 : 0
    })
  },

  /**
   * 输入描述
   */
  onDescriptionInput(e) {
    this.setData({
      'form.description': e.detail.value
    })
  },

  /**
   * 发布团队
   */
  publishTeam() {
    const form = this.data.form

    // 验证必填项
    if (!form.title.trim()) {
      wx.showToast({
        title: '请输入活动标题',
        icon: 'none'
      })
      return
    }

    if (!form.fishing_date) {
      wx.showToast({
        title: '请选择约钓时间',
        icon: 'none'
      })
      return
    }

    if (form.is_paid_team === 1) {
      if (!form.fee_amount || parseFloat(form.fee_amount) <= 0) {
        wx.showToast({
          title: '请输入费用金额',
          icon: 'none'
        })
        return
      }

      // 只有直接支付模式才需要上传收款码
      if (form.payment_mode === 'direct' && !form.payment_qr_code_url) {
        wx.showToast({
          title: '请上传收款码',
          icon: 'none'
        })
        return
      }
    }

    if (!form.spot_id && !form.location_name.trim()) {
      wx.showToast({
        title: '请选择或输入钓点位置',
        icon: 'none'
      })
      return
    }

    // 获取用户信息
    const userId = auth.getUserId()
    const userInfo = auth.getUserInfo()

    // 构建请求数据
    const requestData = {
      title: form.title,
      description: form.description,
      spot_id: form.spot_id,
      spot_name: form.spot_name,
      location_name: form.location_name,
      fishing_date: form.fishing_date,
      min_members: form.min_members,
      max_members: form.max_members,
      is_paid_team: form.is_paid_team,
      fee_amount: form.is_paid_team === 1 ? parseFloat(form.fee_amount) : 0,
      payment_mode: form.payment_mode,
      payment_qr_code_url: form.payment_qr_code_url,
      require_approval: form.require_approval,
      captain_id: userId,
      captain_nickname: userInfo.nickName || '钓友',
      captain_avatar: userInfo.avatarUrl || ''
    }

    wx.showLoading({ title: '发布中...' })

    wx.request({
      url: `${apiConfig.BASE_URL}/fishing-teams/`,
      method: 'POST',
      data: requestData,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '发布成功',
            icon: 'success'
          })

          setTimeout(() => {
            wx.redirectTo({
              url: `/pages/team-detail/team-detail?id=${res.data.id}`
            })
          }, 1500)
        } else {
          wx.showToast({
            title: res.data.detail || '发布失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  }
})
