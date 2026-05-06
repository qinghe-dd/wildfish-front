// pages/publish-post/publish-post.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    content: '',
    images: [],
    locationName: '',
    latitude: '',
    longitude: '',
    spotId: null,
    spotName: '',
    canPublish: false,
    // 钓点列表
    mySpots: [],
    spotIndex: -1
  },

  onLoad(options) {
    // 如果从钓点详情页跳转过来，会携带spotId参数
    if (options.spotId) {
      this.setData({
        spotId: parseInt(options.spotId),
        spotName: decodeURIComponent(options.spotName || '已关联钓点')
      })
    }

    // 加载用户发布的钓点列表
    this.loadMySpots()
  },

  // 输入内容
  onContentInput(e) {
    this.setData({
      content: e.detail.value,
      canPublish: e.detail.value.trim().length > 0 || this.data.images.length > 0
    })
  },

  // 选择图片
  chooseImage() {
    const remainCount = 9 - this.data.images.length
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        this.setData({
          images: [...this.data.images, ...tempFilePaths],
          canPublish: true
        })
      }
    })
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({
      images: images,
      canPublish: this.data.content.trim().length > 0 || images.length > 0
    })
  },

  // 加载用户发布的钓点列表
  loadMySpots() {
    const userId = auth.getUserId()
    if (!userId) {
      console.log('用户未登录')
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
          const formattedSpots = spots.map(spot => ({
            id: spot.id,
            name: spot.name || spot.spot_type + '钓点',
            address: spot.address || ''
          }))

          this.setData({
            mySpots: formattedSpots
          })
        }
      },
      fail: (err) => {
        console.error('加载钓点列表失败:', err)
      }
    })
  },

  // 选择钓点
  onSpotChange(e) {
    const index = e.detail.value
    if (index === '' || index === -1) {
      return
    }

    const spot = this.data.mySpots[index]
    this.setData({
      spotIndex: parseInt(index),
      spotId: spot.id,
      spotName: spot.name
    })
  },

  // 移除已选择的钓点
  removeSpot() {
    this.setData({
      spotId: null,
      spotName: '',
      spotIndex: -1
    })
  },

  // 选择位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          locationName: res.name,
          latitude: res.latitude,
          longitude: res.longitude
        })
        wx.showToast({
          title: '位置已选择',
          icon: 'success',
          duration: 1500
        })
      },
      fail: (err) => {
        console.error('选择位置失败:', err)
        // 判断是用户取消还是权限问题
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '位置权限',
            content: '需要获取您的位置权限，请在设置中开启',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.userLocation']) {
                      // 用户授权了，重新调用选择位置
                      this.chooseLocation()
                    }
                  }
                })
              }
            }
          })
        } else {
          wx.showToast({
            title: '取消选择位置',
            icon: 'none'
          })
        }
      }
    })
  },

  // 取消发布
  cancel() {
    if (this.data.content || this.data.images.length > 0) {
      wx.showModal({
        title: '提示',
        content: '确定要放弃编辑吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  // 发布动态
  async publish() {
    if (!this.data.canPublish) {
      return
    }

    const userId = auth.getUserId()
    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '发布中...' })

    try {
      // 上传图片
      const imageUrls = []
      for (let i = 0; i < this.data.images.length; i++) {
        const imagePath = this.data.images[i]
        console.log(`上传第 ${i + 1} 张图片`)
        try {
          const url = await this.uploadImage(imagePath)
          // 处理URL：如果是相对路径，拼接BASE_URL
          const fullUrl = url.startsWith('http') ? url : (apiConfig.BASE_URL + url)
          imageUrls.push(fullUrl)
          console.log(`图片 ${i + 1} 上传成功:`, fullUrl)
        } catch (error) {
          console.error(`图片 ${i + 1} 上传失败:`, error)
          throw new Error(`图片上传失败: ${error.message}`)
        }
      }

      console.log('所有图片上传完成，准备发布动态')

      // 准备发布数据
      const postData = {
        user_id: userId,
        content: this.data.content,
        images: imageUrls,
        spot_id: this.data.spotId || undefined,
        latitude: this.data.latitude || undefined,
        longitude: this.data.longitude || undefined,
        location_name: this.data.locationName || undefined
      }

      console.log('发布数据:', postData)

      // 发布动态
      wx.request({
        url: `${apiConfig.BASE_URL}/posts/`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: postData,
        success: (res) => {
          wx.hideLoading()
          console.log('发布响应:', res)

          if (res.statusCode === 200) {
            wx.showToast({
              title: '发布成功',
              icon: 'success'
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } else {
            console.error('发布失败:', res.data)
            wx.showToast({
              title: res.data.detail || '发布失败',
              icon: 'none',
              duration: 2000
            })
          }
        },
        fail: (err) => {
          wx.hideLoading()
          console.error('发布请求失败:', err)
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('发布过程出错:', error)
      wx.showToast({
        title: error.message || '发布失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 上传单张图片
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${apiConfig.BASE_URL}/upload/`,
        filePath: filePath,
        name: 'file',
        success: (res) => {
          console.log('上传响应:', res)
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data)
              if (data.url) {
                resolve(data.url)
              } else {
                reject(new Error('响应中没有URL'))
              }
            } catch (e) {
              reject(new Error('解析响应失败'))
            }
          } else {
            reject(new Error(`上传失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('上传请求失败:', err)
          reject(err)
        }
      })
    })
  }
})
