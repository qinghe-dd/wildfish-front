// utils/auth.js - 微信登录相关工具函数
const apiConfig = require('../config/api.js')

/**
 * 微信登录 - 获取openid
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 调用后端接口换取openid
          wx.request({
            url: `${apiConfig.BASE_URL}/auth/login/`,
            method: 'POST',
            data: {
              code: res.code
            },
            success: (loginRes) => {
              if (loginRes.data.openid) {
                // 保存openid到本地
                wx.setStorageSync('userId', loginRes.data.openid)
                console.log('✅ 登录成功，openid:', loginRes.data.openid)
                resolve(loginRes.data.openid)
              } else {
                reject(new Error('获取openid失败'))
              }
            },
            fail: (err) => {
              console.error('❌ 登录接口调用失败:', err)
              reject(err)
            }
          })
        } else {
          reject(new Error('wx.login()失败'))
        }
      },
      fail: (err) => {
        console.error('❌ wx.login()调用失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 获取用户信息（需要用户授权）
 * 使用wx.getUserProfile获取昵称和头像
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        console.log('✅ 获取用户信息成功:', userInfo)

        // 保存用户信息到本地
        wx.setStorageSync('userInfo', userInfo)

        // 调用后端接口更新用户信息
        const openid = wx.getStorageSync('userId')
        if (openid) {
          wx.request({
            url: `${apiConfig.BASE_URL}/auth/update-userinfo/`,
            method: 'POST',
            data: {
              openid: openid,
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl
            },
            success: () => {
              console.log('✅ 用户信息已同步到后端')
            },
            fail: (err) => {
              console.error('❌ 同步用户信息失败:', err)
            }
          })
        }

        resolve(userInfo)
      },
      fail: (err) => {
        console.error('❌ 获取用户信息失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 检查登录状态
 * @returns {string} openid 或 null
 */
function checkLogin() {
  const openid = wx.getStorageSync('userId')
  return openid || null
}

/**
 * 退出登录
 */
function logout() {
  wx.removeStorageSync('userId')
  wx.removeStorageSync('userInfo')
  console.log('✅ 已退出登录')
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  return wx.getStorageSync('userInfo') || {}
}

/**
 * 获取用户ID（openid）
 */
function getUserId() {
  return wx.getStorageSync('userId') || ''
}

/**
 * 确保已登录，如果没有登录则自动登录
 */
function ensureLogin() {
  return new Promise((resolve, reject) => {
    const openid = checkLogin()
    if (openid) {
      // 已登录，直接返回
      resolve(openid)
    } else {
      // 未登录，执行登录
      login().then(resolve).catch(reject)
    }
  })
}

module.exports = {
  login,
  getUserProfile,
  checkLogin,
  logout,
  getUserInfo,
  getUserId,
  ensureLogin
}
