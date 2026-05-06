// pages/my-posts/my-posts.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    loading: true,
    posts: [],
    userId: ''
  },

  onLoad(options) {
    const userId = auth.getUserId()
    this.setData({ userId })

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      this.loadMyPosts()
    }
  },

  // 加载我的动态
  loadMyPosts() {
    const { userId } = this.data

    wx.request({
      url: `${apiConfig.BASE_URL}/posts/`,
      data: {
        user_id: userId,
        current_user_id: userId
      },
      success: (res) => {
        console.log('我的动态列表:', res)
        if (res.statusCode === 200) {
          const posts = (res.data || []).map(item => ({
            ...item,
            created_at: this.formatTime(item.created_at)
          }))
          this.setData({
            posts: posts,
            loading: false
          })
        } else {
          this.setData({
            posts: [],
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
          posts: [],
          loading: false
        })
      }
    })
  },

  // 跳转到动态详情
  goToPostDetail(e) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    })
  },

  // 切换点赞
  toggleLike(e) {
    const postId = e.currentTarget.dataset.id
    const liked = e.currentTarget.dataset.liked
    const userId = this.data.userId

    if (liked) {
      wx.request({
        url: `${apiConfig.BASE_URL}/likes/`,
        method: 'DELETE',
        data: {
          target_type: 'post',
          target_id: postId,
          user_id: userId
        },
        success: () => {
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
      wx.request({
        url: `${apiConfig.BASE_URL}/likes/`,
        method: 'POST',
        data: {
          target_type: 'post',
          target_id: postId,
          user_id: userId
        },
        success: () => {
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

  // 删除动态
  deletePost(e) {
    const postId = e.currentTarget.dataset.id
    const userId = this.data.userId

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条动态吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `${apiConfig.BASE_URL}/posts/${postId}`,
            method: 'DELETE',
            data: {
              user_id: userId
            },
            success: () => {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.loadMyPosts()
            }
          })
        }
      }
    })
  },

  // 格式化时间
  formatTime(dateStr) {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}/${day}`
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMyPosts()
    wx.stopPullDownRefresh()
  },

  // 跳转到发布页面
  goToPublish() {
    wx.navigateTo({
      url: '/pages/publish-post/publish-post'
    })
  }
})
