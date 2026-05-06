// pages/posts-list/posts-list.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    loading: true,
    posts: [],
    page: 0,
    pageSize: 20,
    hasMore: true,
    userId: '',
    // 评论弹窗相关
    showCommentModal: false,
    currentPostId: null,
    commentContent: ''
  },

  onLoad(options) {
    this.setData({
      userId: auth.getUserId() || ''
    })
    this.loadPosts()
  },

  // 页面显示时自动刷新（从发布页面返回时）
  onShow() {
    // 如果页面已经加载过，则刷新数据
    if (this.data.posts.length > 0 || !this.data.loading) {
      this.loadPosts(true)
    }
  },

  // 加载动态列表
  loadPosts(refresh = false) {
    if (refresh) {
      this.setData({
        page: 0,
        posts: [],
        hasMore: true
      })
    }

    const { page, pageSize, userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/posts/`,
      data: {
        skip: page * pageSize,
        limit: pageSize,
        current_user_id: userId  // 传递当前用户ID，用于检查点赞状态
      },
      success: (res) => {
        console.log('动态列表:', res)
        if (res.statusCode === 200) {
          const newPosts = (res.data || []).map(item => ({
            ...item,
            created_at: this.formatTime(item.created_at)
          }))

          this.setData({
            posts: refresh ? newPosts : [...this.data.posts, ...newPosts],
            loading: false,
            hasMore: newPosts.length >= pageSize
          })
        } else {
          this.setData({ loading: false })
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

  // 加载更多
  loadMore() {
    if (this.data.hasMore) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadPosts()
    }
  },

  // 跳转到动态详情
  goToPostDetail(e) {
    const postId = e.currentTarget.dataset.id
    console.log('跳转到动态详情，postId:', postId)

    if (!postId) {
      wx.showToast({
        title: '动态ID不存在',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    })
  },

  // 显示评论弹窗
  openCommentModal(e) {
    const postId = e.currentTarget.dataset.id
    this.setData({
      showCommentModal: true,
      currentPostId: postId,
      commentContent: ''
    })
  },

  // 隐藏评论弹窗
  hideCommentModal() {
    this.setData({
      showCommentModal: false,
      currentPostId: null,
      commentContent: ''
    })
  },

  // 输入评论内容
  onCommentInput(e) {
    this.setData({
      commentContent: e.detail.value
    })
  },

  // 提交评论
  submitComment() {
    const { currentPostId, commentContent, userId } = this.data

    console.log('提交评论 - currentPostId:', currentPostId)
    console.log('提交评论 - userId:', userId)
    console.log('提交评论 - content:', commentContent)

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!commentContent || commentContent.trim() === '') {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    if (commentContent.length < 5) {
      wx.showToast({
        title: '评论内容至少5个字',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '提交中...' })

    // 获取用户信息
    const userInfo = auth.getUserInfo()
    const userNickname = userInfo.nickName || '钓友'

    const requestData = {
      post_id: currentPostId,
      user_id: userId,
      user_nickname: userNickname,
      content: commentContent
    }

    console.log('评论请求数据:', requestData)

    wx.request({
      url: `${apiConfig.BASE_URL}/posts/${currentPostId}/comments/`,
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
          this.hideCommentModal()
          // 重新加载列表以更新评论数
          this.loadPosts(true)
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

  // 切换点赞
  toggleLike(e) {
    const postId = e.currentTarget.dataset.id
    const liked = e.currentTarget.dataset.liked
    const userId = this.data.userId

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (liked) {
      // 取消点赞
      wx.request({
        url: `${apiConfig.BASE_URL}/likes/`,
        method: 'DELETE',
        data: {
          target_type: 'post',
          target_id: postId,
          user_id: userId
        },
        success: () => {
          // 更新本地数据
          const posts = this.data.posts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                is_liked: false,
                like_count: Math.max(0, post.like_count - 1)
              }
            }
            return post
          })
          this.setData({ posts })
        }
      })
    } else {
      // 添加点赞
      wx.request({
        url: `${apiConfig.BASE_URL}/likes/`,
        method: 'POST',
        data: {
          target_type: 'post',
          target_id: postId,
          user_id: userId
        },
        success: () => {
          // 更新本地数据
          const posts = this.data.posts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                is_liked: true,
                like_count: post.like_count + 1
              }
            }
            return post
          })
          this.setData({ posts })
        }
      })
    }
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
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadPosts(true)
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadMore()
  },

  // 跳转到发布页面
  goToPublish() {
    wx.navigateTo({
      url: '/pages/publish-post/publish-post'
    })
  },

  // 分享动态
  sharePost(e) {
    const postId = e.currentTarget.dataset.id

    console.log('分享动态，postId:', postId)

    // 直接触发分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    wx.showToast({
      title: '点击右上角···分享',
      icon: 'none',
      duration: 2000
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
    return false
  },

  // 阻止弹窗滚动穿透
  preventScroll() {
    return false
  },

  // 分享到好友
  onShareAppMessage() {
    return {
      title: '钓友分享了一个钓鱼动态',
      path: '/pages/posts-list/posts-list',
      imageUrl: '/images/hero-images/fish.jpeg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '钓友分享了一个钓鱼动态',
      query: '',
      imageUrl: '/images/hero-images/fish.jpeg'
    }
  }
})
