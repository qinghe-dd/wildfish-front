// pages/weather/weather.js
const apiConfig = require('../../config/api.js')

Page({
  data: {
    loading: true,
    error: null,
    cityName: '定位中...',
    updateTime: '',
    currentWeather: null,
    fishingIndex: null,
    otherIndices: [],
    forecast: [],
    locationId: '101010100', // 默认北京
    // 搜索相关
    showSearch: false,
    searchKeyword: '',
    searchResults: [],
    searching: false
  },

  onLoad(options) {
    // 检查是否有传入的城市ID参数（从城市搜索页面跳转过来）
    if (options.cityId) {
      console.log('使用传入的城市ID:', options.cityId)
      const cityName = options.cityName || '查询城市'
      this.setData({
        cityName: cityName,
        locationId: options.cityId
      })
      this.loadWeather()
    } else {
      // 没有传入城市ID，使用GPS定位
      this.getLocation()
    }
  },

  onPullDownRefresh() {
    this.loadWeather()
    wx.stopPullDownRefresh()
  },

  // 获取用户位置
  getLocation() {
    this.setData({ loading: true, error: null })

    // 先请求位置权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          // 没有授权，请求授权
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.getActualLocation()
            },
            fail: () => {
              // 用户拒绝授权，引导到设置页面
              wx.showModal({
                title: '需要位置权限',
                content: '需要获取您的位置信息来显示当地天气，请在设置中开启权限',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.userLocation']) {
                          this.getActualLocation()
                        } else {
                          this.useDefaultCity()
                        }
                      }
                    })
                  } else {
                    this.useDefaultCity()
                  }
                }
              })
            }
          })
        } else {
          // 已授权，直接获取位置
          this.getActualLocation()
        }
      }
    })
  },

  // 实际获取位置
  getActualLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 获取到经纬度后，转换为城市ID
        this.getCityByLocation(res.latitude, res.longitude)
      },
      fail: () => {
        // 定位失败，使用默认城市（北京）
        console.log('定位失败，使用默认城市')
        this.useDefaultCity()
      }
    })
  },

  // 使用默认城市
  useDefaultCity() {
    this.setData({
      cityName: '北京',
      locationId: '101010100'
    })
    this.loadWeather()
  },

  // 通过经纬度获取城市ID（使用和风天气的城市查询API）
  getCityByLocation(latitude, longitude) {
    console.log('开始城市查询，经纬度:', longitude, latitude)

    wx.request({
      url: `${apiConfig.BASE_URL}/api/weather/city/`,
      data: {
        location: `${longitude},${latitude}`
      },
      success: (res) => {
        console.log('=== 城市查询API响应 ===')
        console.log('statusCode:', res.statusCode)
        console.log('data:', res.data)

        if (res.statusCode === 200 && res.data.code === '200' && res.data.location && res.data.location.length > 0) {
          const city = res.data.location[0]
          console.log('✅ 城市查询成功:', city.name, city.id)
          // 优先显示行政区，如果没有则显示城市
          const cityName = city.adm2 || city.adm1 || city.name
          this.setData({
            cityName: cityName,
            locationId: city.id
          })
          this.loadWeather()
        } else {
          console.log('❌ 城市查询失败，使用经纬度直接查询天气')
          // 城市查询失败，直接使用经纬度查询天气
          // 格式化经纬度为小数点后两位（和风天气API要求）
          const formattedLon = parseFloat(longitude).toFixed(2)
          const formattedLat = parseFloat(latitude).toFixed(2)
          console.log('使用经纬度查询天气:', formattedLon, formattedLat)

          this.setData({
            cityName: '定位中...',
            locationId: `${formattedLon},${formattedLat}`
          })
          // 先加载天气，稍后更新城市名
          this.loadWeather(true) // 传入true表示需要逆地理编码
        }
      },
      fail: (err) => {
        console.error('❌ 城市查询API调用失败，使用经纬度直接查询天气:', err)
        // API调用失败，直接使用经纬度查询天气
        const formattedLon = parseFloat(longitude).toFixed(2)
        const formattedLat = parseFloat(latitude).toFixed(2)
        console.log('使用经纬度查询天气:', formattedLon, formattedLat)

        this.setData({
          cityName: '定位中...',
          locationId: `${formattedLon},${formattedLat}`
        })
        this.loadWeather(true)
      }
    })
  },

  // 通过经纬度反向获取城市名（使用和风天气GeoAPI）
  reverseGeocode(locationId) {
    const [lng, lat] = locationId.split(',')

    wx.request({
      url: `${apiConfig.BASE_URL}/api/weather/reverse-geo/`,
      data: {
        location: `${lng},${lat}`
      },
      success: (res) => {
        console.log('=== 逆地理编码响应 ===')
        console.log('data:', res.data)

        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          const geo = res.data[0]
          // 优先显示区级，其次城市，最后省份
          const cityName = geo.district || geo.city || geo.province || '当前位置'
          console.log('✅ 获取城市名成功:', cityName)
          this.setData({ cityName })
        } else {
          // 如果逆地理编码也失败，使用天气API返回的基本信息
          this.setData({ cityName: '当前位置' })
        }
      },
      fail: (err) => {
        console.log('逆地理编码失败，使用当前位置')
        this.setData({ cityName: '当前位置' })
      }
    })
  },

  // 加载天气数据
  loadWeather(needReverseGeo = false) {
    const { locationId } = this.data

    // 并行请求多个API
    Promise.all([
      this.getCurrentWeather(locationId),
      this.getFishingIndex(locationId),
      this.getForecast(locationId)
    ]).then(() => {
      this.setData({
        loading: false,
        updateTime: this.formatTime(new Date())
      })

      // 如果需要逆地理编码获取城市名
      if (needReverseGeo && locationId.includes(',')) {
        this.reverseGeocode(locationId)
      }
    }).catch((err) => {
      console.error('加载天气失败:', err)
      this.setData({
        loading: false,
        error: '加载天气信息失败，请重试'
      })
    })
  },

  // 获取实时天气
  getCurrentWeather(locationId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${apiConfig.BASE_URL}/api/weather/now/`,
        data: {
          location: locationId
        },
        success: (res) => {
          console.log('实时天气响应:', res)
          if (res.statusCode === 200 && res.data.code === '200') {
            const now = res.data.now
            this.setData({
              currentWeather: {
                temp: now.temp,
                feelsLike: now.feelsLike,
                text: now.text,
                icon: this.getWeatherIcon(now.icon),
                windDir: now.windDir,
                windScale: now.windScale,
                humidity: now.humidity,
                pressure: now.pressure,
                vis: now.vis
              }
            })
            resolve()
          } else {
            reject(new Error('获取实时天气失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 获取钓鱼指数
  getFishingIndex(locationId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${apiConfig.BASE_URL}/api/weather/indices/`,
        data: {
          location: locationId,
          type: '3' // 3表示钓鱼指数
        },
        success: (res) => {
          console.log('钓鱼指数响应:', res)
          if (res.statusCode === 200 && res.data.code === '200') {
            const indices = res.data.daily || []
            const fishing = indices.find(item => item.type === '3')
            const other = indices.filter(item => item.type !== '3').slice(0, 4)

            this.setData({
              fishingIndex: fishing ? {
                category: fishing.category,
                text: fishing.text
              } : null,
              otherIndices: other.map(item => ({
                name: this.getIndexName(item.type),
                category: item.category
              }))
            })
            resolve()
          } else {
            reject(new Error('获取钓鱼指数失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 获取3天预报
  getForecast(locationId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${apiConfig.BASE_URL}/api/weather/forecast/`,
        data: {
          location: locationId
        },
        success: (res) => {
          console.log('天气预报响应:', res)
          if (res.statusCode === 200 && res.data.code === '200') {
            const daily = res.data.daily || []
            this.setData({
              forecast: daily.slice(0, 3).map(item => ({
                dateText: this.formatDate(item.fxDate),
                icon: this.getWeatherIcon(item.iconDay),
                textDay: item.textDay,
                tempMax: item.tempMax,
                tempMin: item.tempMin
              }))
            })
            resolve()
          } else {
            reject(new Error('获取天气预报失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 获取天气图标
  getWeatherIcon(code) {
    // 返回本地图标路径（需要下载和风天气图标到本地）
    // 或者使用emoji代替
    return this.getWeatherEmoji(code)
  },

  // 获取天气emoji
  getWeatherEmoji(code) {
    const emojiMap = {
      // 晴
      '100': '☀️',
      '150': '🌤️',
      // 多云
      '101': '☁️',
      '102': '☁️',
      '103': '⛅',
      '104': '☁️',
      // 阴
      '200': '🌥️',
      '201': '🌥️',
      '202': '🌥️',
      // 雨
      '300': '🌦️',
      '301': '🌧️',
      '302': '⛈️',
      '303': '⛈️',
      '304': '⛈️',
      '305': '🌧️',
      '306': '🌧️',
      '307': '🌧️',
      '308': '🌧️',
      '309': '🌧️',
      '310': '🌧️',
      '311': '🌧️',
      '312': '🌧️',
      '313': '🌧️',
      '314': '🌧️',
      '315': '🌧️',
      '316': '🌧️',
      '317': '🌧️',
      '318': '🌧️',
      '399': '🌧️',
      // 雪
      '400': '🌨️',
      '401': '🌨️',
      '402': '🌨️',
      '403': '🌨️',
      '404': '🌨️',
      '405': '🌨️',
      '406': '🌨️',
      '407': '🌨️',
      '408': '🌨️',
      '409': '🌨️',
      '410': '🌨️',
      '499': '🌨️',
      // 雾霾等
      '500': '🌫️',
      '501': '🌫️',
      '502': '🌫️',
      '503': '🌫️',
      '504': '🌫️',
      '507': '🌫️',
      '508': '🌫️',
      '509': '🌫️',
      '510': '🌫️',
      '511': '🌫️',
      '512': '🌫️',
      '513': '🌫️',
      '514': '🌫️',
      '515': '🌫️',
      '900': '🌡️',
      '901': '🌡️',
      '999': '🌡️'
    }
    return emojiMap[code] || '🌤️'
  },

  // 格式化时间
  formatTime(date) {
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${hour}:${minute} 更新`
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const dayAfterTomorrow = new Date(today)
    dayAfterTomorrow.setDate(today.getDate() + 2)

    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '明天'
    } else if (date.toDateString() === dayAfterTomorrow.toDateString()) {
      return '后天'
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${month}/${day}`
    }
  },

  // 获取指数名称
  getIndexName(type) {
    const indexMap = {
      '1': '运动指数',
      '2': '洗车指数',
      '4': '穿衣指数',
      '5': '紫外线指数',
      '6': '旅游指数',
      '7': '感冒指数',
      '8': '空气污染扩散条件指数',
      '9': '空调开启指数',
      '10': '雨伞指数'
    }
    return indexMap[type] || '生活指数'
  },

  // ========== 城市搜索相关方法 ==========

  // 显示搜索弹窗
  showSearchModal() {
    this.setData({
      showSearch: true,
      searchKeyword: '',
      searchResults: []
    })
  },

  // 隐藏搜索弹窗
  hideSearchModal() {
    this.setData({
      showSearch: false,
      searchKeyword: '',
      searchResults: []
    })
  },

  // 输入搜索关键词
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 搜索城市
  searchCity() {
    const keyword = this.data.searchKeyword.trim()

    if (!keyword) {
      return wx.showToast({
        title: '请输入城市名称',
        icon: 'none'
      })
    }

    this.setData({ searching: true })

    wx.request({
      url: `${apiConfig.BASE_URL}/api/weather/search-city/`,
      data: {
        location: keyword
      },
      success: (res) => {
        this.setData({ searching: false })
        console.log('城市搜索结果:', res)

        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          this.setData({
            searchResults: res.data
          })
        } else {
          wx.showToast({
            title: '未找到该城市',
            icon: 'none'
          })
          this.setData({ searchResults: [] })
        }
      },
      fail: (err) => {
        this.setData({ searching: false })
        console.error('搜索城市失败:', err)
        wx.showToast({
          title: '搜索失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 选择城市
  selectCity(e) {
    const city = e.currentTarget.dataset.city

    console.log('选择城市:', city)

    // 隐藏搜索弹窗
    this.hideSearchModal()

    // 跳转到天气页面，传入城市ID和名称
    wx.redirectTo({
      url: `/pages/weather/weather?cityId=${city.id}&cityName=${city.name}`,
      fail: () => {
        // 如果跳转失败（可能是页面栈问题），直接在当前页更新
        console.log('跳转失败，直接在当前页更新')
        this.setData({
          cityName: city.name,
          locationId: city.id
        })
        this.loadWeather()
      }
    })
  },

  // 快速选择热门城市
  quickSelectCity(e) {
    const cityName = e.currentTarget.dataset.city

    console.log('快速选择城市:', cityName)

    // 搜索该城市
    this.setData({
      searchKeyword: cityName
    })

    this.searchCity()
  }
})
