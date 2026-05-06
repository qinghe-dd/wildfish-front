// pages/settings/settings.js
const auth = require('../../utils/auth.js')
const apiConfig = require('../../config/api.js')

Page({
  data: {
    cacheSize: '0MB',
    // 距离校验配置
    distanceCheckEnabled: true,
    distanceRadius: 1.0,
    configLoading: false,
    // 权限相关
    isAdmin: false,
    userId: '',
    // 封禁用户相关
    showBanDialog: false,
    banUserId: '',
    banType: 'all',
    banDuration: '',
    banReason: '',
    // 封禁记录
    showBanRecords: false,
    banRecords: [],
    // 微信群二维码
    showWechatQRDialog: false,
    currentWechatQR: '',
    newWechatQR: '',
    uploadingWechatQR: false,
    // 电工检测配置
    showElectricianConfigDialog: false,
    electricianConfig: {
      min_reports_per_spot: 5,
      min_suspicious_spots: 2
    },
    // 电工嫌疑人
    showSuspectsDialog: false,
    suspects: [],
    // 支付配置
    showPaymentConfigDialog: false,
    paymentConfig: {
      enabled_modes: ['direct'],
      platform_qr_code: '',
      default_mode: 'direct'  // 默认为直接付给发布者
    },
    newPlatformQR: '',
    uploadingPlatformQR: false
  },

  onLoad(options) {
    const userId = auth.getUserId() || ''
    this.setData({ userId })

    this.getCacheSize()
    this.checkAdminPermission()
  },

  // 检查管理员权限
  checkAdminPermission() {
    const { userId } = this.data
    if (!userId) {
      this.setData({ isAdmin: false })
      return
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/admin/check`,
      method: 'GET',
      data: { user_id: userId },
      success: (res) => {
        if (res.statusCode === 200 && res.data.is_admin) {
          this.setData({ isAdmin: true })
          // 如果是管理员，加载配置
          this.loadDistanceConfig()
          this.loadPaymentConfig()
        } else {
          this.setData({ isAdmin: false })
        }
      },
      fail: () => {
        this.setData({ isAdmin: false })
      }
    })
  },

  // 加载距离校验配置
  loadDistanceConfig() {
    const { userId } = this.data

    this.setData({ configLoading: true })

    wx.request({
      url: `${apiConfig.BASE_URL}/config/spot-distance/check`,
      method: 'GET',
      data: { user_id: userId },
      success: (res) => {
        console.log('配置加载:', res)
        if (res.statusCode === 200) {
          this.setData({
            distanceCheckEnabled: res.data.enabled,
            distanceRadius: res.data.radius_km,
            configLoading: false
          })
        } else {
          this.setData({ configLoading: false })
        }
      },
      fail: () => {
        this.setData({ configLoading: false })
      }
    })
  },

  // 切换距离校验开关
  toggleDistanceCheck(e) {
    this.setData({
      distanceCheckEnabled: e.detail.value
    })
  },

  // 输入半径值
  onRadiusInput(e) {
    this.setData({
      distanceRadius: parseFloat(e.detail.value) || 1.0
    })
  },

  // 保存距离校验配置
  saveDistanceConfig() {
    const { distanceCheckEnabled, distanceRadius, userId } = this.data

    if (distanceRadius <= 0) {
      wx.showToast({
        title: '半径必须大于0',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    wx.request({
      url: `${apiConfig.BASE_URL}/config/spot-distance/check`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        value: {
          enabled: distanceCheckEnabled,
          radius_km: distanceRadius
        },
        user_id: userId
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: res.data.detail || '保存失败',
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

  // 复制 OpenID
  copyOpenid() {
    const openid = auth.getUserId() || ''

    if (!openid) {
      wx.showToast({
        title: '未找到 OpenID，请先登录',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: openid,
      success: () => {
        wx.showToast({
          title: 'OpenID 已复制',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 获取缓存大小
  getCacheSize() {
    try {
      const res = wx.getStorageInfoSync()
      const size = (res.currentSize / 1024).toFixed(2)
      this.setData({
        cacheSize: size + 'MB'
      })
    } catch (e) {
      console.error('获取缓存大小失败', e)
    }
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清理缓存吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync()
            wx.showToast({
              title: '清理成功',
              icon: 'success'
            })
            this.getCacheSize()
          } catch (e) {
            wx.showToast({
              title: '清理失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 检查更新
  checkUpdate() {
    wx.showModal({
      title: '提示',
      content: '当前已是最新版本',
      showCancel: false
    })
  },

  // 关于我们
  about() {
    wx.showModal({
      title: '关于我们',
      content: '野钓小程序\n\n致力于为钓鱼爱好者提供最好的钓点分享平台',
      showCancel: false
    })
  },

  // 意见反馈
  feedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请通过以下方式联系我们：\n\n邮箱：feedback@example.com',
      showCancel: false
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 使用auth工具退出登录
          auth.logout()

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })

          // 返回首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 1500)
        }
      }
    })
  },

  // ========== 封禁用户相关 ==========
  showBanUserDialog() {
    this.setData({
      showBanDialog: true,
      banUserId: '',
      banType: 'all',
      banDuration: '',
      banReason: ''
    })
  },

  hideBanDialog() {
    this.setData({ showBanDialog: false })
  },

  onBanUserIdInput(e) {
    this.setData({ banUserId: e.detail.value })
  },

  onBanTypeChange(e) {
    this.setData({ banType: e.detail.value })
  },

  onBanDurationInput(e) {
    this.setData({ banDuration: e.detail.value })
  },

  onBanReasonInput(e) {
    this.setData({ banReason: e.detail.value })
  },

  confirmBanUser() {
    const { userId, banUserId, banType, banDuration, banReason } = this.data

    if (!banUserId) {
      wx.showToast({
        title: '请输入用户OpenID',
        icon: 'none'
      })
      return
    }

    if (!banReason) {
      wx.showToast({
        title: '请输入封禁原因',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '封禁中...' })

    const requestData = {
      user_id: banUserId,
      ban_type: banType,
      reason: banReason
    }

    if (banDuration) {
      requestData.duration_days = parseInt(banDuration)
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/admin/bans?admin_id=${userId}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '封禁成功',
            icon: 'success'
          })
          this.hideBanDialog()
        } else {
          wx.showToast({
            title: res.data.detail || '封禁失败',
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

  // 查看封禁记录
  viewBanRecords() {
    const { userId } = this.data

    wx.showLoading({ title: '加载中...' })

    wx.request({
      url: `${apiConfig.BASE_URL}/admin/bans?user_id=${userId}&active_only=false`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          const records = res.data.bans.map(item => ({
            ...item,
            ban_type_text: this.getBanTypeText(item.ban_type),
            banned_at: this.formatDate(item.banned_at),
            expires_at: item.expires_at ? this.formatDate(item.expires_at) : null
          }))
          this.setData({
            banRecords: records,
            showBanRecords: true
          })
        } else {
          wx.showToast({
            title: '加载失败',
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

  hideBanRecords() {
    this.setData({ showBanRecords: false })
  },

  unbanUser(e) {
    const { userId } = this.data
    const banId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认解封',
      content: '确定要解封该用户吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '解封中...' })

          wx.request({
            url: `${apiConfig.BASE_URL}/admin/bans/${banId}/unban?admin_id=${userId}`,
            method: 'PUT',
            success: (res) => {
              wx.hideLoading()
              if (res.statusCode === 200) {
                wx.showToast({
                  title: '解封成功',
                  icon: 'success'
                })
                // 刷新记录
                this.viewBanRecords()
              } else {
                wx.showToast({
                  title: res.data.detail || '解封失败',
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
        }
      }
    })
  },

  getBanTypeText(type) {
    const typeMap = {
      'all': '禁止所有',
      'paid': '禁止收费',
      'free': '禁止免费'
    }
    return typeMap[type] || type
  },

  formatDate(dateStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  preventScroll() {
    // 阻止事件冒泡
  },

  // ========== 微信群二维码相关 ==========
  showWechatQRDialog() {
    this.setData({
      showWechatQRDialog: true,
      newWechatQR: ''
    })
    this.loadCurrentWechatQR()
  },

  hideWechatQRDialog() {
    this.setData({
      showWechatQRDialog: false,
      newWechatQR: ''
    })
  },

  loadCurrentWechatQR() {
    wx.request({
      url: `${apiConfig.BASE_URL}/config/wechat_group_qr`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.value) {
          let qrCodeUrl = res.data.value.qr_code_url || ''
          // 如果是相对路径，需要拼接 BASE_URL
          if (qrCodeUrl && !qrCodeUrl.startsWith('http')) {
            qrCodeUrl = apiConfig.BASE_URL + qrCodeUrl
          }
          this.setData({
            currentWechatQR: qrCodeUrl
          })
        }
      },
      fail: () => {
        console.log('获取微信群二维码失败')
      }
    })
  },

  chooseWechatQR() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0]
        that.uploadWechatQR(tempFilePath)
      }
    })
  },

  uploadWechatQR(filePath) {
    const that = this
    that.setData({ uploadingWechatQR: true })

    wx.uploadFile({
      url: `${apiConfig.BASE_URL}/upload/image`,
      filePath: filePath,
      name: 'file',
      success(res) {
        const data = JSON.parse(res.data)
        if (data.url) {
          // data.url 是相对路径，需要拼接 BASE_URL
          const qrCodeUrl = data.url.startsWith('http') ? data.url : (apiConfig.BASE_URL + data.url)
          that.setData({
            newWechatQR: qrCodeUrl,
            uploadingWechatQR: false
          })
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          })
        } else {
          that.setData({ uploadingWechatQR: false })
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      },
      fail() {
        that.setData({ uploadingWechatQR: false })
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    })
  },

  saveWechatQR() {
    const { userId, newWechatQR } = this.data

    if (!newWechatQR) {
      wx.showToast({
        title: '请先上传二维码',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    wx.request({
      url: `${apiConfig.BASE_URL}/config/wechat_group_qr?user_id=${userId}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        value: {
          qr_code_url: newWechatQR
        }
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          this.setData({
            currentWechatQR: newWechatQR,
            newWechatQR: ''
          })
          setTimeout(() => {
            this.hideWechatQRDialog()
          }, 1000)
        } else {
          wx.showToast({
            title: res.data.detail || '保存失败',
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

  // ========== 电工检测配置相关 ==========
  showElectricianConfigDialog() {
    this.setData({
      showElectricianConfigDialog: true
    })
    this.loadElectricianConfig()
  },

  hideElectricianConfigDialog() {
    this.setData({
      showElectricianConfigDialog: false
    })
  },

  loadElectricianConfig() {
    const { userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/config/electrician_detection?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            electricianConfig: res.data
          })
        }
      },
      fail: () => {
        console.log('获取电工检测配置失败')
      }
    })
  },

  onMinReportsInput(e) {
    const value = parseInt(e.detail.value) || 5
    this.setData({
      'electricianConfig.min_reports_per_spot': value
    })
  },

  onMinSpotsInput(e) {
    const value = parseInt(e.detail.value) || 2
    this.setData({
      'electricianConfig.min_suspicious_spots': value
    })
  },

  saveElectricianConfig() {
    const { userId, electricianConfig } = this.data

    if (electricianConfig.min_reports_per_spot < 2) {
      wx.showToast({
        title: '每个钓点至少需要2个举报',
        icon: 'none'
      })
      return
    }

    if (electricianConfig.min_suspicious_spots < 1) {
      wx.showToast({
        title: '至少需要在1个钓点付费',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    wx.request({
      url: `${apiConfig.BASE_URL}/config/electrician_detection`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        value: electricianConfig,
        user_id: userId
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          this.hideElectricianConfigDialog()
        } else {
          wx.showToast({
            title: res.data.detail || '保存失败',
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

  // ========== 电工嫌疑人相关 ==========
  viewElectricianSuspects() {
    const { userId } = this.data

    wx.showLoading({ title: '加载中...' })

    wx.request({
      url: `${apiConfig.BASE_URL}/admin/electrician-suspects?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          this.setData({
            suspects: res.data.suspects || [],
            showSuspectsDialog: true
          })
        } else {
          wx.showToast({
            title: '加载失败',
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

  hideSuspectsDialog() {
    this.setData({
      showSuspectsDialog: false
    })
  },

  banSuspect(e) {
    const userId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认封禁',
      content: `确定要封禁用户 ${userId} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.showBanUserDialog()
          // 预填用户ID
          this.setData({
            banUserId: userId,
            banType: 'all',
            banReason: '系统识别为电工嫌疑人'
          })
          this.hideSuspectsDialog()
        }
      }
    })
  },

  copySuspectId(e) {
    const userId = e.currentTarget.dataset.id

    wx.setClipboardData({
      data: userId,
      success: () => {
        wx.showToast({
          title: '用户ID已复制',
          icon: 'success'
        })
      }
    })
  },

  // ========== 约钓支付配置相关 ==========
  showPaymentConfigDialog() {
    this.setData({
      showPaymentConfigDialog: true,
      newPlatformQR: ''
    })
    this.loadPaymentConfig()
  },

  hidePaymentConfigDialog() {
    this.setData({
      showPaymentConfigDialog: false,
      newPlatformQR: ''
    })
  },

  loadPaymentConfig() {
    const { userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/config/team-payment`,
      method: 'GET',
      data: { user_id: userId },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            paymentConfig: res.data
          })
        }
      },
      fail: () => {
        console.log('获取支付配置失败')
      }
    })
  },

  // 切换支付方式开关
  togglePaymentMode(e) {
    const mode = e.currentTarget.dataset.mode
    const { paymentConfig } = this.data
    const { enabled_modes } = paymentConfig

    if (enabled_modes.includes(mode)) {
      // 关闭该支付方式
      // 如果只有一个支付方式，不允许关闭
      if (enabled_modes.length <= 1) {
        wx.showToast({
          title: '至少需要保留一种支付方式',
          icon: 'none'
        })
        return
      }
      paymentConfig.enabled_modes = enabled_modes.filter(m => m !== mode)
    } else {
      // 开启该支付方式
      paymentConfig.enabled_modes = [...enabled_modes, mode]
    }

    // 如果当前默认支付方式被关闭了，设置为第一个可用的
    if (!paymentConfig.enabled_modes.includes(paymentConfig.default_mode)) {
      paymentConfig.default_mode = paymentConfig.enabled_modes[0]
    }

    this.setData({ paymentConfig })
  },

  // 支付方式改变（radio-group）
  onPaymentModeChange(e) {
    const mode = e.detail.value
    this.setData({
      'paymentConfig.default_mode': mode,
      'paymentConfig.enabled_modes': [mode]
    })
  },

  // 设置默认支付方式
  setDefaultPaymentMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      'paymentConfig.default_mode': mode
    })
  },

  // 默认支付方式改变事件（radio-group）
  onDefaultPaymentModeChange(e) {
    const mode = e.detail.value
    this.setData({
      'paymentConfig.default_mode': mode
    })
  },

  // 上传平台收款码
  choosePlatformQR() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0]
        that.uploadPlatformQR(tempFilePath)
      }
    })
  },

  uploadPlatformQR(filePath) {
    const that = this
    that.setData({ uploadingPlatformQR: true })

    wx.uploadFile({
      url: `${apiConfig.BASE_URL}/upload/`,
      filePath: filePath,
      name: 'file',
      success(res) {
        try {
          console.log('上传响应:', res.data)
          const data = JSON.parse(res.data)
          if (data.url) {
            // data.url 是相对路径，需要拼接 BASE_URL
            const imageUrl = data.url.startsWith('http') ? data.url : (apiConfig.BASE_URL + data.url)
            that.setData({
              newPlatformQR: imageUrl,
              uploadingPlatformQR: false
            })
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            })
          } else {
            that.setData({ uploadingPlatformQR: false })
            console.error('上传响应中没有url字段:', data)
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        } catch (e) {
          that.setData({ uploadingPlatformQR: false })
          console.error('解析上传响应失败', e, res.data)
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      },
      fail(err) {
        that.setData({ uploadingPlatformQR: false })
        console.error('上传请求失败', err)
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    })
  },

  // 保存支付配置
  savePaymentConfig() {
    const { userId, paymentConfig, newPlatformQR } = this.data

    // 如果启用了平台托管，检查是否有平台收款码
    if (paymentConfig.default_mode === 'platform') {
      const qrCode = newPlatformQR || paymentConfig.platform_qr_code
      if (!qrCode) {
        wx.showToast({
          title: '请上传平台收款码',
          icon: 'none'
        })
        return
      }
    }

    wx.showLoading({ title: '保存中...' })

    const finalConfig = {
      enabled_modes: [paymentConfig.default_mode],  // 只包含选中的支付方式
      platform_qr_code: newPlatformQR || paymentConfig.platform_qr_code,
      default_mode: paymentConfig.default_mode
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/config/team-payment`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        value: finalConfig,
        user_id: userId
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          this.setData({
            paymentConfig: finalConfig,
            newPlatformQR: ''
          })
          setTimeout(() => {
            this.hidePaymentConfigDialog()
          }, 1000)
        } else {
          wx.showToast({
            title: res.data.detail || '保存失败',
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
  }
})
