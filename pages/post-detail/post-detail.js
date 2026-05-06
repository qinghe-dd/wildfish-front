// pages/post-detail/post-detail.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    loading: true,
    post: null,
    comments: [],
    commentText: '',
    userId: '',
    postId: null
  },

  onLoad(options) {
    const postId = parseInt(options.id)
    this.setData({
      postId: postId,
      userId: auth.getUserId() || ''
    })
    this.loadPostDetail()
    this.loadComments()
  },

  // 加载动态详情
  loadPostDetail() {
    const { postId, userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/posts/${postId}`,
      data: {
        current_user_id: userId
      },
      success: (res) => {
        console.log('动态详情:', res)
        if (res.statusCode === 200) {
          this.setData({
            post: {
              ...res.data,
              created_at: this.formatTime(res.data.created_at)
            },
            loading: false
          })
        } else {
          wx.showToast({
            title: '动态不存在',
            icon: 'none'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      },
      fail: () => {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 加载评论列表
  loadComments() {
    const { postId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/posts/${postId}/comments`,
      success: (res) => {
        console.log('评论列表:', res)
        if (res.statusCode === 200) {
          const comments = (res.data || []).map(item => ({
            ...item,
            created_at: this.formatTime(item.created_at)
          }))
          this.setData({ comments })
        }
      }
    })
  },

  // 切换点赞
  toggleLike() {
    const { post, userId } = this.data

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (post.is_liked) {
      // 取消点赞
      wx.request({
        url: `${apiConfig.BASE_URL}/likes/`,
        method: 'DELETE',
        data: {
          target_type: 'post',
          target_id: post.id,
          user_id: userId
        },
        success: () => {
          this.setData({
            'post.is_liked': false,
            'post.like_count': Math.max(0, post.like_count - 1)
          })
        }
      })
    } else {
      // 添加点赞
      wx.request({
        url: `${apiConfig.BASE_URL}/likes/`,
        method: 'POST',
        data: {
          target_type: 'post',
          target_id: post.id,
          user_id: userId
        },
        success: () => {
          this.setData({
            'post.is_liked': true,
            'post.like_count': post.like_count + 1
          })
        }
      })
    }
  },

  // 输入评论
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    })
  },

  // 提交评论
  submitComment() {
    const { postId, userId, commentText } = this.data

    console.log('提交评论 - postId:', postId)
    console.log('提交评论 - userId:', userId)
    console.log('提交评论 - content:', commentText)

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!commentText || commentText.trim() === '') {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    if (commentText.trim().length < 5) {
      wx.showToast({
        title: '评论内容至少5个字',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '发送中...' })

    // 获取用户信息
    const userInfo = auth.getUserInfo()
    const userNickname = userInfo.nickName || '钓友'

    const requestData = {
      post_id: postId,
      user_id: userId,
      user_nickname: userNickname,
      content: commentText.trim()
    }

    console.log('评论请求数据:', requestData)

    wx.request({
      url: `${apiConfig.BASE_URL}/posts/${postId}/comments/`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: (res) => {
        wx.hideLoading()
        console.log('评论响应:', res)

        if (res.statusCode === 200) {
          wx.showToast({
            title: '评论成功',
            icon: 'success'
          })
          // 清空输入框
          this.setData({ commentText: '' })
          // 重新加载评论
          this.loadComments()
          // 更新评论数
          this.setData({
            'post.comment_count': (this.data.post.comment_count || 0) + 1
          })
        } else {
          console.error('评论失败 - 响应:', res.data)
          wx.showToast({
            title: res.data.detail || res.data.message || '评论失败',
            icon: 'none',
            duration: 2000
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('评论请求失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls
    wx.previewImage({
      current: url,
      urls: urls
    })
  },

  // 格式化时间
  formatTime(dateStr) {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }

    // 小于1小时
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    }

    // 小于24小时
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前'
    }

    // 小于7天
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前'
    }

    // 超过7天显示具体日期
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}/${day}`
  }
})
