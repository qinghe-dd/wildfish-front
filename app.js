// app.js
const auth = require('./utils/auth.js')

App({
  onLaunch() {
    // 小程序启动时静默登录
    this.silentLogin()
  },

  // 静默登录
  silentLogin() {
    const openid = auth.checkLogin()

    if (openid) {
      // 已登录，无需重复登录
      console.log('✅ 用户已登录，openid:', openid)
    } else {
      // 未登录，执行静默登录（只获取openid，不获取用户信息）
      auth.login().then((openid) => {
        console.log('✅ 静默登录成功，openid:', openid)
      }).catch((err) => {
        console.error('❌ 静默登录失败:', err)
      })
    }
  }
})
