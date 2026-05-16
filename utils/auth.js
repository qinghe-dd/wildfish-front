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
          wx.request({
            url: `${apiConfig.BASE_URL}/auth/login/`,
            method: 'POST',
            data: {
              code: res.code
            },
            success: (loginRes) => {
              if (loginRes.statusCode === 200 && loginRes.data.openid) {
                wx.setStorageSync('userId', loginRes.data.openid)
                console.log('登录成功，openid:', loginRes.data.openid)
                resolve(loginRes.data.openid)
              } else {
                const msg = loginRes.data.detail || loginRes.data.message || '获取openid失败'
                console.error('登录接口返回错误:', loginRes.statusCode, loginRes.data)
                reject(new Error(msg))
              }
            },
            fail: (err) => {
              console.error('登录接口网络错误:', err)
              reject(new Error('网络错误，无法连接服务器'))
            }
          })
        } else {
          reject(new Error('wx.login()失败'))
        }
      },
      fail: (err) => {
        console.error('wx.login()调用失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 一次性完成登录 + 资料保存
 * 流程：wx.login → 换openid → 上传头像 → 存库 → 本地存储
 * @param {string} avatarUrl - 用户选择的头像临时路径或URL
 * @param {string} nickName - 用户输入的昵称
 */
function loginWithProfile(avatarUrl, nickName) {
  return new Promise((resolve, reject) => {
    // 第一步：wx.login() 获取 code
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          return reject(new Error('wx.login()失败'))
        }

        // 第二步：POST /auth/login/ 用 code 换 openid
        wx.request({
          url: `${apiConfig.BASE_URL}/auth/login/`,
          method: 'POST',
          data: { code: loginRes.code },
          success: (authRes) => {
            if (authRes.statusCode !== 200 || !authRes.data.openid) {
              const msg = authRes.data.detail || authRes.data.message || '获取openid失败'
              return reject(new Error(msg))
            }

            const openid = authRes.data.openid
            wx.setStorageSync('userId', openid)
            console.log('登录成功，openid:', openid)

            // 第三步：上传头像（如果是临时文件）
            const userInfo = {
              nickName: nickName || '钓鱼达人',
              avatarUrl: avatarUrl || ''
            }

            const uploadPromise = (avatarUrl && (avatarUrl.startsWith('http://tmp') || avatarUrl.startsWith('wxfile://')))
              ? new Promise((resolveUpload) => {
                  wx.uploadFile({
                    url: `${apiConfig.BASE_URL}/upload/`,
                    filePath: avatarUrl,
                    name: 'file',
                    success: (res) => {
                      try {
                        const data = JSON.parse(res.data)
                        if (data.url) {
                          resolveUpload(apiConfig.BASE_URL + data.url)
                        } else {
                          resolveUpload(avatarUrl)
                        }
                      } catch (e) {
                        resolveUpload(avatarUrl)
                      }
                    },
                    fail: () => {
                      resolveUpload(avatarUrl)
                    }
                  })
                })
              : Promise.resolve(avatarUrl)

            uploadPromise.then((finalAvatarUrl) => {
              userInfo.avatarUrl = finalAvatarUrl

              // 第四步：POST /auth/update-userinfo/ 存库
              wx.request({
                url: `${apiConfig.BASE_URL}/auth/update-userinfo/`,
                method: 'POST',
                data: {
                  openid: openid,
                  nickName: userInfo.nickName,
                  avatarUrl: finalAvatarUrl
                },
                success: () => {
                  console.log('用户信息已同步到后端')
                },
                fail: (err) => {
                  console.error('同步用户信息失败:', err)
                }
              })

              // 第五步：本地存储
              wx.setStorageSync('userInfo', userInfo)
              resolve(userInfo)
            }).catch(reject)
          },
          fail: (err) => {
            console.error('登录接口网络错误:', err)
            reject(new Error('网络错误，无法连接服务器'))
          }
        })
      },
      fail: (err) => {
        console.error('wx.login()调用失败:', err)
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
  console.log('已退出登录')
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
 * 确保已登录 - 只检查本地存储
 * 未登录时返回空，不自动调后端
 */
function ensureLogin() {
  const openid = checkLogin()
  return openid ? Promise.resolve(openid) : Promise.resolve('')
}

module.exports = {
  login,
  loginWithProfile,
  checkLogin,
  logout,
  getUserInfo,
  getUserId,
  ensureLogin
}
