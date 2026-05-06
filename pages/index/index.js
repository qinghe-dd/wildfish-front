// pages/index/index.js
const apiConfig = require('../../config/api.js')

Page({
  data: {
    currentTab: 0,
    currentTabBar: 0,
    spotList: [],
    userLocation: null,  // 用户当前位置信息
    wechatGroupQrCode: '',  // 微信群二维码
    selectMode: false,  // 选择模式
    // 筛选相关
    showFilterModal: false,
    filterCity: '',
    filterDistance: null,
    hasActiveFilter: false,
    filterStatusText: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取微信群二维码
    this.getWechatGroupQR()

    // 获取用户位置
    this.getUserLocation()

    // onShow 会加载钓点列表，这里不再重复加载
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次页面显示时重新加载钓点列表
    const spotTypes = ['河流', '湖库', '野塘']
    this.loadFishingSpots(spotTypes[this.data.currentTab])
  },

  /**
   * 获取用户当前位置
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
        console.log('获取用户位置成功:', this.data.userLocation)

        // 如果已有钓点列表，重新计算距离
        if (this.data.spotList.length > 0) {
          this.refreshDistances()
        }
      },
      fail: (err) => {
        console.log('获取用户位置失败:', err)
        // 不显示错误提示，避免打扰用户
      }
    })
  },

  /**
   * 刷新钓点列表中的距离显示
   */
  refreshDistances() {
    const updatedList = this.data.spotList.map(item => {
      const newItem = Object.assign({}, item)
      newItem.distance = this.calculateDistance(item.longitude, item.latitude)
      return newItem
    })
    this.setData({ spotList: updatedList })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // ========== 原有页面所有绑定事件方法 ==========
  // 钓点地图 点击事件
  goMap() {
    wx.showToast({
      title: '钓点地图功能开发中',
      icon: 'none'
    })
  },

  // ✅ 重点：标记钓点 点击事件【跳转标记钓点页面】
  markPoint() {
    wx.navigateTo({
      url: "/pages/markspot/markspot"
    })
  },

  // 拍照识鱼 点击事件
  photoIdentify() {
    wx.showToast({
      title: '拍照识鱼功能开发中',
      icon: 'none'
    })
  },

  // 约钓组队 点击事件
  goToTeamsList() {
    wx.navigateTo({
      url: '/pages/teams-list/teams-list'
    })
  },

  // 鱼类图鉴 点击事件
  fishAlbum() {
    wx.showToast({
      title: '鱼类图鉴功能开发中',
      icon: 'none'
    })
  },

  // 天气查询 点击事件
  weatherQuery() {
    wx.navigateTo({
      url: '/pages/weather/weather'
    })
  },

  // 筛选标签切换：河流/湖库/野塘
  switchTab(e) {
    let tabIndex = e.currentTarget.dataset.tab

    // 定义钓点类型映射
    const spotTypes = ['河流', '湖库', '野塘']

    this.setData({
      currentTab: tabIndex
    })

    // 调用后端 API 获取对应类型的钓点列表
    this.loadFishingSpots(spotTypes[tabIndex])
  },

  // 加载钓点列表
  loadFishingSpots(spotType) {
    console.log('loadFishingSpots 调用, spotType:', spotType)

    wx.showLoading({ title: '加载中...' })

    // 构建请求参数
    const requestData = {
      spot_type: spotType
    }

    // 添加城市筛选
    if (this.data.filterCity) {
      requestData.city = this.data.filterCity
    }

    // 添加距离筛选（需要用户位置）
    if (this.data.filterDistance && this.data.userLocation) {
      requestData.max_distance = this.data.filterDistance
      requestData.user_lat = this.data.userLocation.latitude
      requestData.user_lon = this.data.userLocation.longitude
    }

    console.log('请求参数:', requestData)
    console.log('请求URL:', apiConfig.BASE_URL + '/fishing-spots/')

    wx.request({
      url: apiConfig.BASE_URL + '/fishing-spots/',
      method: 'GET',
      data: requestData,
      success: (res) => {
        console.log('API响应 statusCode:', res.statusCode)
        console.log('API响应 data类型:', typeof res.data, Array.isArray(res.data))
        console.log('API响应 data:', res.data)
        wx.hideLoading()
        if (res.statusCode === 200) {
          // 后端直接返回数组 list[FishingSpotResponse]
          let spots = res.data || []
          if (!Array.isArray(spots)) {
            console.error('钓点数据格式异常:', typeof spots, spots)
            spots = []
          }

          console.log('获取到钓点数量:', spots.length)

          // 格式化钓点数据
          const formattedList = spots.map(item => {
            // 处理图片URL
            let imageUrl = '/images/hero-images/fish.jpeg'

            if (item.image_url) {
              const url = item.image_url

              if (url.startsWith('http://') || url.startsWith('https://')) {
                if (url.includes('localhost') || url.includes('0.0.0.0')) {
                  const urlObj = new URL(url)
                  imageUrl = apiConfig.BASE_URL + urlObj.pathname
                } else {
                  imageUrl = url
                }
              } else if (url.startsWith('/') && !url.startsWith('/images')) {
                imageUrl = apiConfig.BASE_URL + url
              }
            }

            return {
              id: item.id,
              name: item.name || item.spot_type + '钓点',
              desc: item.description || '暂无描述',
              image: imageUrl,
              hasImage: imageUrl !== '/images/hero-images/fish.jpeg',
              distance: this.calculateDistance(item.longitude, item.latitude),
              spotType: item.spot_type,
              waterDepth: item.water_depth,
              is_paid_spot: item.is_paid_spot || false,
              price: item.price || 0,
              has_paid: item.has_paid || false,
              // 新增字段
              address: item.address || '',
              longitude: item.longitude || null,
              latitude: item.latitude || null
            }
          })

          this.setData({ spotList: formattedList })
        } else {
          wx.showToast({ title: '加载失败', icon: 'error' })
        }
      },
      fail: (err) => {
        console.error('API请求失败:', err)
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'error' })
      }
    })
  },

  // 计算距离（使用 Haversine 公式计算两点之间的真实距离）
  calculateDistance(lon, lat) {
    if (!lon || !lat) return '未知距离'

    // 如果没有获取到用户位置，返回未知
    if (!this.data.userLocation || !this.data.userLocation.longitude || !this.data.userLocation.latitude) {
      return '未知距离'
    }

    const userLon = parseFloat(this.data.userLocation.longitude)
    const userLat = parseFloat(this.data.userLocation.latitude)
    const spotLon = parseFloat(lon)
    const spotLat = parseFloat(lat)

    // Haversine 公式计算球面距离
    const R = 6371 // 地球半径，单位：公里
    const dLat = this.toRadians(spotLat - userLat)
    const dLon = this.toRadians(spotLon - userLon)

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(userLat)) * Math.cos(this.toRadians(spotLat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // 距离，单位：公里

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

  // 跳转到钓点详情
  goSpotDetail(e) {
    const spotId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/spotDetail/spotDetail?id=${spotId}`
    })
  },

  // 搜索框输入事件
  onSearchInput(e) {
    // 可后续补充搜索逻辑
    let searchVal = e.detail.value
    console.log('搜索内容：', searchVal)
  },

  // 定位图标点击事件 (页面筛选栏右侧的定位按钮)
  getLocation() {
    wx.showLoading({
      title: '定位中...',
    })
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        wx.hideLoading()
        wx.showToast({
          title: '定位成功',
          icon: 'success'
        })
        console.log('当前定位经纬度：', res.longitude, res.latitude)

        // 更新用户位置
        this.setData({
          userLocation: {
            longitude: res.longitude,
            latitude: res.latitude
          }
        })

        // 重新计算所有钓点的距离
        if (this.data.spotList.length > 0) {
          this.refreshDistances()
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({
          title: '请开启定位权限',
          icon: 'error'
        })
      }
    })
  },

  // 图片加载失败时使用占位图
  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const spotList = this.data.spotList
    const placeholder = '/images/hero-images/fish.jpeg'

    // 如果图片加载失败且当前不是占位图，则替换为占位图
    if (spotList[index].image !== placeholder) {
      spotList[index].image = placeholder
      this.setData({
        spotList: spotList
      })
    }
  },

  // 图片加载成功
  onImageLoad(e) {
    const index = e.currentTarget.dataset.index
    const spotList = this.data.spotList
    console.log('✅ 图片加载成功:', index)
    console.log('  钓点名称:', spotList[index].name)
    console.log('  图片URL:', spotList[index].image)
  },

  // 底部Tab栏切换：野钓/动态/我的
  switchTabBar(e) {
    let tabIndex = e.currentTarget.dataset.tab
    this.setData({
      currentTabBar: tabIndex
    })
  },

  // ========== 微信群相关 ==========
  getWechatGroupQR() {
    const that = this
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
          that.setData({
            wechatGroupQrCode: qrCodeUrl
          })
        }
      },
      fail: () => {
        console.log('获取微信群二维码失败')
      }
    })
  },

  // 预览微信群二维码
  previewQRCode() {
    if (!this.data.wechatGroupQrCode) {
      return
    }
    wx.previewImage({
      current: this.data.wechatGroupQrCode,
      urls: [this.data.wechatGroupQrCode]
    })
  },

  preventScroll() {
    // 阻止事件冒泡
  },

  // ========== 筛选相关方法 ==========

  // 显示筛选弹窗
  showFilterModal() {
    this.setData({
      showFilterModal: true
    })
  },

  // 隐藏筛选弹窗
  hideFilterModal() {
    this.setData({
      showFilterModal: false
    })
  },

  // 选择城市
  selectCity(e) {
    const city = e.currentTarget.dataset.city
    this.setData({
      filterCity: city
    })
  },

  // 选择距离
  selectDistance(e) {
    const distance = e.currentTarget.dataset.distance
    this.setData({
      filterDistance: distance === '' ? null : parseInt(distance)
    })
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      filterCity: '',
      filterDistance: null
    })
  },

  // 应用筛选
  applyFilter() {
    const { filterCity, filterDistance } = this.data

    // 检查是否有激活的筛选条件
    const hasActiveFilter = filterCity !== '' || filterDistance !== null

    // 构建状态文本
    let statusText = []
    if (filterCity) {
      statusText.push(filterCity)
    }
    if (filterDistance !== null) {
      statusText.push(`${filterDistance}公里内`)
    }

    this.setData({
      hasActiveFilter: hasActiveFilter,
      filterStatusText: statusText.join(' · '),
      showFilterModal: false
    })

    // 重新加载钓点列表
    const spotTypes = ['河流', '湖库', '野塘']
    this.loadFishingSpots(spotTypes[this.data.currentTab])
  },

  // 清除筛选
  clearFilter() {
    this.setData({
      filterCity: '',
      filterDistance: null,
      hasActiveFilter: false,
      filterStatusText: ''
    })

    // 重新加载钓点列表
    const spotTypes = ['河流', '湖库', '野塘']
    this.loadFishingSpots(spotTypes[this.data.currentTab])
  }
})