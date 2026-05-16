// pages/spotDetail/spotDetail.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    spotId: null,          // 钓点ID
    spotDetail: null,      // 钓点详情数据
    loading: true,         // 加载状态
    error: null,           // 错误信息
    isEdit: false,         // 是否处于编辑模式
    isFavorited: false,    // 是否已收藏
    userId: '',            // 用户ID
    editForm: {            // 编辑表单数据
      name: '',
      water_depth: '',
      description: ''
    },
    waterDepthOptions: ['1-2米', '3-5米', '6-8米', '8-11米', '11米以上'], // 水深选项
    waterDepthIndex: 0,    // 当前选中的水深索引
    showPasswordInput: false,  // 是否显示密码输入框
    inputPassword: "",     // 用户输入的密码
    paidBannerClosed: false,  // 付费横幅是否已关闭
    showPaymentModal: false,  // 是否显示付费弹窗
    // 评价相关
    reviews: [],           // 评价列表
    reviewsLoading: false, // 评价加载状态
    showReviewModal: false, // 是否显示评价弹窗
    reviewForm: {          // 评价表单
      rating: 5,           // 默认5星
      comment: '',         // 评价内容
      images: []           // 评价图片
    },
    // 举报相关
    showReportModal: false,  // 是否显示举报弹窗
    reportType: 'electrician',  // 举报类型
    reportDescription: '',  // 举报描述
    reportEvidenceImages: []  // 举报证据图片
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({ spotId: options.id })
      this.loadSpotDetail()
      this.loadReviews()  // 加载评价列表
    } else {
      this.setData({
        loading: false,
        error: '缺少钓点ID参数'
      })
    }
  },

  /**
   * 加载钓点详情
   * @param {Function} callback - 加载完成后的回调函数
   */
  loadSpotDetail(callback) {
    if (!this.data.spotId) {
      return
    }

    this.setData({ loading: true, error: null })

    // 直接从本地存储读取 userId，没有就用空字符串（只看公开信息）
    const userId = auth.getUserId()
    this.setData({ userId })
    this._doLoadSpotDetail(userId, callback)
  },

  _doLoadSpotDetail(userId, callback) {

    wx.request({
      url: apiConfig.BASE_URL + '/fishing-spots/' + this.data.spotId + '/?user_id=' + userId,
      method: 'GET',
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          const detail = res.data

          // 处理图片URL
          if (detail.image_url && !detail.image_url.startsWith('/images')) {
            detail.image = apiConfig.BASE_URL + detail.image_url
          } else {
            detail.image = '/images/hero-images/fish.jpeg'
          }

          // 处理收款码URL（拼接完整URL）
          if (detail.payment_qr_code_url && !detail.payment_qr_code_url.startsWith('http')) {
            detail.payment_qr_code_url = apiConfig.BASE_URL + detail.payment_qr_code_url
          }

          // 处理钓法数组
          if (detail.fishing_methods) {
            if (typeof detail.fishing_methods === 'string') {
              detail.fishing_methods = detail.fishing_methods.split(',').filter(m => m.trim())
            }
          } else {
            detail.fishing_methods = []
          }

          // 格式化时间
          if (detail.created_at) {
            detail.created_at = this.formatDate(detail.created_at)
          }

          this.setData({
            spotDetail: detail,
            loading: false
          }, () => {
            // 检查是否已收藏
            this.checkFavoriteStatus()
          })

          console.log('钓点详情加载成功:', detail)
          console.log('收款码URL:', detail.payment_qr_code_url)
          console.log('has_paid状态:', detail.has_paid)
          console.log('is_paid_spot状态:', detail.is_paid_spot)
          console.log('require_password状态:', detail.require_password)
          console.log('请求使用的user_id:', userId)
          console.log('是否能评价按钮显示条件:', !this.data.isEdit && (detail.has_paid || !detail.is_paid_spot))

          // 执行回调函数
          if (callback && typeof callback === 'function') {
            callback(detail)
          }
        } else {
          this.setData({
            loading: false,
            error: '加载失败，请重试'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('请求失败:', err)
        this.setData({
          loading: false,
          error: '网络错误，请检查网络连接'
        })
      }
    })
  },

  /**
   * 格式化日期时间
   */
  formatDate(dateString) {
    if (!dateString) return '未知'

    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  /**
   * 图片加载失败处理
   */
  onImageError(e) {
    const spotDetail = this.data.spotDetail
    if (spotDetail && spotDetail.image !== '/images/hero-images/fish.jpeg') {
      spotDetail.image = '/images/hero-images/fish.jpeg'
      this.setData({ spotDetail })
    }
  },

  /**
   * 导航到钓点位置
   */
  navigateToSpot() {
    const { spotDetail } = this.data
    if (!spotDetail || !spotDetail.latitude || !spotDetail.longitude) {
      return wx.showToast({
        title: '位置信息不完整',
        icon: 'none'
      })
    }

    wx.openLocation({
      latitude: parseFloat(spotDetail.latitude),
      longitude: parseFloat(spotDetail.longitude),
      name: spotDetail.name || '钓点',
      address: spotDetail.address || '',
      scale: 18
    })
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 切换编辑模式
   */
  toggleEdit() {
    const { spotDetail } = this.data
    if (!spotDetail) return

    // 初始化编辑表单数据
    this.setData({
      isEdit: true,
      editForm: {
        name: spotDetail.name || '',
        water_depth: spotDetail.water_depth || '',
        description: spotDetail.description || ''
      },
      // 设置水深选择器的当前选中值
      waterDepthIndex: this.data.waterDepthOptions.indexOf(spotDetail.water_depth) >= 0
        ? this.data.waterDepthOptions.indexOf(spotDetail.water_depth)
        : 0
    })
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    this.setData({
      isEdit: false,
      editForm: {
        name: '',
        water_depth: '',
        description: ''
      }
    })
  },

  /**
   * 输入钓点名称
   */
  onNameInput(e) {
    this.setData({
      'editForm.name': e.detail.value
    })
  },

  /**
   * 输入钓点描述
   */
  onDescriptionInput(e) {
    this.setData({
      'editForm.description': e.detail.value
    })
  },

  /**
   * 选择水深
   */
  onWaterDepthChange(e) {
    const index = e.detail.value
    this.setData({
      waterDepthIndex: index,
      'editForm.water_depth': this.data.waterDepthOptions[index]
    })
  },

  /**
   * 保存编辑
   */
  saveEdit() {
    const { editForm, spotId } = this.data

    // 校验必填项
    if (!editForm.name || editForm.name.trim() === '') {
      return wx.showToast({
        title: '请输入钓点名称',
        icon: 'none'
      })
    }

    wx.showLoading({ title: '保存中...' })

    // 提交修改
    wx.request({
      url: apiConfig.BASE_URL + '/fishing-spots/' + spotId + '/',
      method: 'PUT',
      data: {
        name: editForm.name,
        water_depth: editForm.water_depth,
        description: editForm.description
      },
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })

          // 更新本地数据
          const updatedSpot = Object.assign({}, this.data.spotDetail)
          updatedSpot.name = editForm.name
          updatedSpot.water_depth = editForm.water_depth
          updatedSpot.description = editForm.description

          this.setData({
            spotDetail: updatedSpot,
            isEdit: false
          })
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'error'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('保存失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        })
      }
    })
  },

  /**
   * 显示密码输入框
   */
  showPasswordInputModal() {
    this.setData({ showPasswordInput: true });
  },

  /**
   * 隐藏密码输入框
   */
  hidePasswordInputModal() {
    this.setData({ showPasswordInput: false });
  },

  /**
   * 关闭付费横幅
   */
  closePaidBanner() {
    this.setData({ paidBannerClosed: true });
  },

  /**
   * 显示付费弹窗
   */
  showPaymentModal() {
    this.setData({ showPaymentModal: true });
  },

  /**
   * 隐藏付费弹窗
   */
  hidePaymentModal() {
    this.setData({ showPaymentModal: false });
  },

  /**
   * 输入密码
   */
  onPasswordInputChange(e) {
    this.setData({ inputPassword: e.detail.value });
  },

  /**
   * 复制发布者ID
   */
  copyPublisherId() {
    const { spotDetail } = this.data;

    if (!spotDetail.owner_id) {
      return wx.showToast({ title: "发布者ID不存在", icon: "none" });
    }

    wx.setClipboardData({
      data: spotDetail.owner_id,
      success: () => {
        wx.showModal({
          title: 'ID已复制',
          content: `发布者ID: ${spotDetail.owner_id}\n\n请前往微信搜索该ID并添加好友，然后向其索取6位数查看密码`,
          confirmText: '我知道了',
          showCancel: false
        });
      }
    });
  },

  /**
   * 联系发布者
   */
  contactPublisher() {
    const { spotDetail } = this.data;

    if (!spotDetail.owner_nickname) {
      return wx.showToast({ title: "发布者信息不完整", icon: "none" });
    }

    wx.showModal({
      title: '联系发布者',
      content: `付款后请联系发布者"${spotDetail.owner_nickname}"索取查看密码\n\n提示：请确保已经完成付款`,
      confirmText: '我知道了',
      showCancel: false
    });
  },

  /**
   * 验证密码并查看详情
   */
  verifyPasswordAndUnlock() {
    const { spotId, inputPassword } = this.data;

    // 使用 auth 工具获取用户ID
    const userId = auth.getUserId()

    if (!userId) {
      return wx.showToast({ title: "请先登录", icon: "none" });
    }

    if (!inputPassword || inputPassword.length !== 6) {
      return wx.showToast({ title: "请输入6位数密码", icon: "none" });
    }

    wx.showLoading({ title: "验证中..." });

    wx.request({
      url: apiConfig.BASE_URL + `/fishing-spots/${spotId}/verify-password/`,
      method: "POST",
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        password: inputPassword,
        user_id: userId
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          console.log('✅ 密码验证成功，响应数据:', res.data);

          wx.showToast({ title: "验证成功！", icon: "success" });

          // 重新加载钓点详情，传入回调函数在加载完成后隐藏密码输入框和付费弹窗
          this.loadSpotDetail((detail) => {
            console.log('📥 重新加载完成，has_paid:', detail.has_paid);

            // 只有在确认 has_paid 为 true 时才隐藏密码输入框和付费弹窗
            if (detail.has_paid) {
              this.setData({
                showPasswordInput: false,
                showPaymentModal: false  // 同时隐藏付费弹窗
              });
              console.log('✅ 密码验证成功，钓点详情已解锁');
            } else {
              console.error('⚠️ 验证成功但 has_paid 仍为 false，后端逻辑可能有问题');
              wx.showToast({
                title: "验证成功但数据未更新",
                icon: "none"
              });
            }
          });
        } else {
          wx.showToast({ title: res.data.detail || "密码错误", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("验证失败:", err);
        wx.showToast({ title: "验证失败", icon: "error" });
      }
    });
  },

  /**
   * 确认已支付（已废弃，所有付费钓点必须输入密码）
   */
  confirmPayment() {
    // 所有付费钓点都必须输入密码才能查看
    wx.showModal({
      title: '请输入密码',
      content: '此钓点设置了查看密码，请输入6位数密码后才能查看详情',
      showCancel: false,
      success: () => {
        this.showPasswordInputModal()
      }
    })
  },

  // ============ 评价相关函数 ============

  /**
   * 加载钓点评价列表
   */
  loadReviews() {
    if (!this.data.spotId) {
      return
    }

    this.setData({ reviewsLoading: true })

    wx.request({
      url: apiConfig.BASE_URL + `/fishing-spots/${this.data.spotId}/reviews/`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const reviews = res.data.data || []
          // 格式化评价时间和图片URL
          const formattedReviews = reviews.map(review => {
            // 处理图片URL - 拼接完整URL
            let processedImages = []
            if (review.images && Array.isArray(review.images)) {
              processedImages = review.images.map(imgUrl => {
                if (imgUrl && !imgUrl.startsWith('http')) {
                  return apiConfig.BASE_URL + imgUrl
                }
                return imgUrl
              })
            }

            return {
              ...review,
              images: processedImages,
              created_at: this.formatDate(review.created_at)
            }
          })

          this.setData({
            reviews: formattedReviews,
            reviewsLoading: false
          })

          console.log('评价列表加载成功:', formattedReviews.length)
          console.log('第一张图片URL:', formattedReviews[0]?.images?.[0])
        } else {
          this.setData({ reviewsLoading: false })
          console.error('加载评价失败:', res.data)
        }
      },
      fail: (err) => {
        this.setData({ reviewsLoading: false })
        console.error('加载评价失败:', err)
      }
    })
  },

  /**
   * 显示评价弹窗
   */
  showReviewModal() {
    console.log('=== showReviewModal 被调用 ===')
    console.log('打开前的reviewForm:', this.data.reviewForm)

    // 检查用户是否已登录
    const userId = auth.getUserId()
    if (!userId) {
      return wx.showToast({ title: '请先登录', icon: 'none' })
    }

    // 先初始化数据，再显示弹窗
    this.setData({
      'reviewForm.rating': 5,
      'reviewForm.comment': '',
      'reviewForm.images': []
    }, () => {
      console.log('第一步：reviewForm已重置')
      console.log('当前reviewForm.rating:', this.data.reviewForm.rating, '类型:', typeof this.data.reviewForm.rating)

      // 然后显示弹窗
      this.setData({
        showReviewModal: true
      }, () => {
        console.log('第二步：弹窗已显示')
        console.log('最终reviewForm.rating:', this.data.reviewForm.rating, '类型:', typeof this.data.reviewForm.rating)
      })
    })
  },

  /**
   * 隐藏评价弹窗
   */
  hideReviewModal() {
    this.setData({ showReviewModal: false })
  },

  /**
   * 选择评分
   */
  selectRating(e) {
    console.log('=== 选择评分 ===')

    // 尝试从currentTarget获取
    let datasetRating = e.currentTarget.dataset.rating

    // 如果currentTarget没有，尝试从target获取
    if (!datasetRating && e.target) {
      datasetRating = e.target.dataset.rating
    }

    console.log('获取到的rating值:', datasetRating, '类型:', typeof datasetRating)

    // 转换为数字
    let rating = Number(datasetRating)

    // 验证
    if (isNaN(rating) || rating < 1 || rating > 5) {
      console.error('无效的评分:', datasetRating, '转换后:', rating)
      wx.showToast({ title: '评分选择失败', icon: 'none' })
      return
    }

    console.log('最终rating值:', rating)

    this.setData({
      'reviewForm.rating': rating
    }, () => {
      console.log('✅ 评分已更新为:', this.data.reviewForm.rating)
    })
  },

  /**
   * 输入评价内容
   */
  onCommentInput(e) {
    this.setData({
      'reviewForm.comment': e.detail.value
    })
  },

  /**
   * 选择评价图片
   */
  chooseReviewImage() {
    const currentImages = this.data.reviewForm.images
    const remainCount = 9 - currentImages.length

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath)
        this.setData({
          'reviewForm.images': currentImages.concat(newImages)
        })
        console.log('添加了', newImages.length, '张图片，当前共', this.data.reviewForm.images.length, '张')
      }
    })
  },

  /**
   * 删除评价图片
   */
  deleteReviewImage(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    console.log('删除第', index, '张图片')

    const images = this.data.reviewForm.images
    images.splice(index, 1)

    this.setData({
      'reviewForm.images': images
    })

    console.log('删除后剩余', images.length, '张图片')
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls || [url]

    wx.previewImage({
      current: url,
      urls: urls
    })
  },

  /**
   * 提交评价
   */
  submitReview() {
    const { spotId, reviewForm } = this.data
    const userId = auth.getUserId()
    const userNickname = wx.getStorageSync('userNickname') || '钓鱼达人'

    if (!userId) {
      return wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
    }

    // 验证评价内容
    if (!reviewForm.comment || reviewForm.comment.trim() === '') {
      return wx.showToast({
        title: '请输入评价内容',
        icon: 'none'
      })
    }

    if (reviewForm.comment.length < 10) {
      return wx.showToast({
        title: '评价内容至少10个字',
        icon: 'none'
      })
    }

    // 验证评分
    console.log('提交前检查 - reviewForm.rating:', reviewForm.rating, '类型:', typeof reviewForm.rating)
    if (!reviewForm.rating || isNaN(reviewForm.rating) || reviewForm.rating < 1 || reviewForm.rating > 5) {
      console.error('评分无效:', reviewForm.rating)
      return wx.showToast({
        title: '请选择评分',
        icon: 'none'
      })
    }

    wx.showLoading({ title: '提交中...' })

    // 上传图片（如果有）
    const uploadPromises = reviewForm.images.map(filePath => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: apiConfig.BASE_URL + '/upload/',
          filePath: filePath,
          name: 'file',
          success: (res) => {
            console.log('图片上传响应:', res)
            try {
              const data = JSON.parse(res.data)
              if (data.url) {
                console.log('✅ 图片上传成功:', data.url)
                resolve(data.url)
              } else {
                console.error('❌ 上传响应中没有url:', data)
                reject(new Error('上传响应中没有url'))
              }
            } catch (err) {
              console.error('❌ 解析上传响应失败:', err, '原始数据:', res.data)
              reject(err)
            }
          },
          fail: (err) => {
            console.error('❌ 图片上传失败:', err)
            reject(err)
          }
        })
      })
    })

    // 等待所有图片上传完成
    Promise.all(uploadPromises)
      .then(imageUrls => {
        console.log('=== 图片上传完成 ===')
        console.log('上传的图片URLs:', imageUrls)
        console.log('imageUrls类型:', typeof imageUrls)
        console.log('是否为数组:', Array.isArray(imageUrls))

        // 提交评价 - 添加NaN检查
        const parsedSpotId = parseInt(spotId)
        const parsedRating = parseInt(reviewForm.rating)

        console.log('=== 提交评价数据 ===')
        console.log('原始spotId:', spotId, '类型:', typeof spotId)
        console.log('原始rating:', reviewForm.rating, '类型:', typeof reviewForm.rating)
        console.log('解析后spotId:', parsedSpotId, '是否NaN:', isNaN(parsedSpotId))
        console.log('解析后rating:', parsedRating, '是否NaN:', isNaN(parsedRating))

        // 验证解析结果
        if (isNaN(parsedSpotId)) {
          console.error('spotId解析失败:', spotId)
          wx.hideLoading()
          return wx.showToast({ title: '钓点ID错误', icon: 'none' })
        }

        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
          console.error('rating解析失败:', reviewForm.rating)
          wx.hideLoading()
          return wx.showToast({ title: '评分错误', icon: 'none' })
        }

        // 确保userId是有效的字符串
        const userIdStr = userId && typeof userId === 'string' ? userId : String(userId || '')
        const userNicknameStr = userNickname && typeof userNickname === 'string' ? userNickname : '匿名用户'
        const commentStr = reviewForm.comment && typeof reviewForm.comment === 'string' ? reviewForm.comment : ''

        // 确保imageUrls是有效的数组
        const finalImageUrls = Array.isArray(imageUrls) ? imageUrls : []

        const reviewData = {
          spot_id: parsedSpotId,
          user_id: userIdStr,
          user_nickname: userNicknameStr,
          rating: parsedRating,
          comment: commentStr,
          images: finalImageUrls
        }

        console.log('=== 最终评价数据 ===')
        console.log('spot_id:', reviewData.spot_id, '类型:', typeof reviewData.spot_id)
        console.log('user_id:', reviewData.user_id, '类型:', typeof reviewData.user_id)
        console.log('user_nickname:', reviewData.user_nickname, '类型:', typeof reviewData.user_nickname)
        console.log('rating:', reviewData.rating, '类型:', typeof reviewData.rating)
        console.log('comment:', reviewData.comment, '类型:', typeof reviewData.comment, '长度:', reviewData.comment.length)
        console.log('images:', reviewData.images, '类型:', typeof reviewData.images, '数量:', reviewData.images.length)

        wx.request({
          url: apiConfig.BASE_URL + `/fishing-spots/${spotId}/reviews/`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: reviewData,
          success: (res) => {
            console.log('=== 评价提交响应 ===')
            console.log('状态码:', res.statusCode)
            console.log('响应数据:', res.data)

            wx.hideLoading()
            if (res.statusCode === 200 && res.data.success) {
              wx.showToast({
                title: '评价提交成功',
                icon: 'success'
              })
              // 隐藏弹窗
              this.hideReviewModal()
              // 重新加载评价列表
              this.loadReviews()
            } else {
              // 处理422验证错误
              let errorMsg = res.data.message || '提交失败'
              if (res.statusCode === 422 && res.data.detail) {
                // Pydantic验证错误
                if (Array.isArray(res.data.detail)) {
                  errorMsg = res.data.detail.map(err => err.msg).join(', ')
                } else {
                  errorMsg = JSON.stringify(res.data.detail)
                }
              }
              console.error('评价提交失败:', errorMsg)
              wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 3000
              })
            }
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('提交评价失败:', err)
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            })
          }
        })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('图片上传失败:', err)
        wx.showToast({
          title: '图片上传失败',
          icon: 'none'
        })
      })
  },

  // ========== 举报相关 ==========
  showReportModal() {
    console.log('showReportModal 被调用')
    this.setData({
      showReportModal: true,
      reportType: 'electrician',
      reportDescription: '',
      reportEvidenceImages: []
    })
    console.log('showReportModal 设置后的状态:', this.data.showReportModal)
  },

  hideReportModal() {
    this.setData({
      showReportModal: false
    })
  },

  onReportTypeChange(e) {
    this.setData({
      reportType: e.detail.value
    })
  },

  onReportDescriptionInput(e) {
    this.setData({
      reportDescription: e.detail.value
    })
  },

  chooseEvidenceImages() {
    const that = this
    const currentCount = that.data.reportEvidenceImages.length
    const maxCount = 3

    wx.chooseImage({
      count: maxCount - currentCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths
        that.setData({
          reportEvidenceImages: that.data.reportEvidenceImages.concat(tempFilePaths)
        })
      }
    })
  },

  removeEvidence(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.reportEvidenceImages
    images.splice(index, 1)
    this.setData({
      reportEvidenceImages: images
    })
  },

  previewEvidence(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.reportEvidenceImages
    })
  },

  submitReport() {
    const auth = require('../../utils/auth.js')
    const reporterId = auth.getUserId()

    if (!reporterId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    const { spotId, reportType, reportDescription, reportEvidenceImages } = this.data

    if (!reportDescription) {
      wx.showToast({
        title: '请填写举报描述',
        icon: 'none'
      })
      return
    }

    // 必须上传至少1张图片
    if (reportEvidenceImages.length === 0) {
      wx.showToast({
        title: '请上传至少1张图片证明',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '提交中...' })

    // 上传证据图片
    const uploadPromises = reportEvidenceImages.map(filePath => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${apiConfig.BASE_URL}/upload/`,
          filePath: filePath,
          name: 'file',
          success(res) {
            const data = JSON.parse(res.data)
            if (data.url) {
              resolve(data.url)
            } else {
              reject(new Error('上传失败'))
            }
          },
          fail(err) {
            reject(err)
          }
        })
      })
    })

    Promise.all(uploadPromises)
      .then(imageUrls => {
        // 提交举报
        const evidenceImagesJson = JSON.stringify(imageUrls)
        wx.request({
          url: `${apiConfig.BASE_URL}/reports?reporter_id=${reporterId}`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            spot_id: spotId,
            report_type: reportType,
            description: reportDescription,
            evidence_images: evidenceImagesJson
          },
          success: (res) => {
            wx.hideLoading()
            if (res.statusCode === 200) {
              // 先关闭弹窗
              this.hideReportModal()
              // 然后显示成功提示
              setTimeout(() => {
                wx.showToast({
                  title: '举报提交成功',
                  icon: 'success',
                  duration: 2000
                })
              }, 100)
            } else {
              wx.showToast({
                title: res.data.detail || '举报失败',
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
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '图片上传失败',
          icon: 'none'
        })
      })
  },

  // 阻止弹窗滚动穿透
  preventScroll() {
    return false
  },

  /**
   * 检查用户是否已收藏该钓点
   */
  checkFavoriteStatus() {
    const { spotId, userId } = this.data
    if (!userId) {
      return
    }

    wx.request({
      url: `${apiConfig.BASE_URL}/favorites/`,
      method: 'GET',
      data: {
        user_id: userId
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const favorites = res.data
          const favorited = favorites.some(f => f.spot_id === parseInt(spotId))
          this.setData({ isFavorited: favorited })
        }
      }
    })
  },

  /**
   * 切换收藏状态
   */
  toggleFavorite() {
    const { isFavorited, spotId, userId } = this.data

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (isFavorited) {
      // 取消收藏
      wx.showModal({
        title: '取消收藏',
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
                this.setData({ isFavorited: false })
                wx.showToast({
                  title: '已取消收藏',
                  icon: 'success'
                })
              },
              fail: () => {
                wx.showToast({
                  title: '操作失败',
                  icon: 'none'
                })
              }
            })
          }
        }
      })
    } else {
      // 添加收藏
      wx.request({
        url: `${apiConfig.BASE_URL}/favorites/`,
        method: 'POST',
        data: {
          spot_id: parseInt(spotId),
          user_id: userId
        },
        success: () => {
          this.setData({ isFavorited: true })
          wx.showToast({
            title: '收藏成功',
            icon: 'success'
          })
        },
        fail: () => {
          wx.showToast({
            title: '收藏失败',
            icon: 'none'
          })
        }
      })
    }
  }
})
