// API 配置文件
// 手机测试时，请将 BASE_URL 改为电脑的局域网IP地址
// 获取局域网IP方法：
// Windows: 在cmd中输入 ipconfig，查看 "IPv4 地址"
// Mac: 在终端输入 ifconfig 或按住Option键点击WiFi图标查看

const config = {
  // 🔴 手机测试时，请修改为你的电脑局域网IP，例如：'http://192.168.1.100:8000'
  // 电脑开发者工具测试时，可以使用 'http://localhost:8000' 或 'http://127.0.0.1:8000'

  // ⬇️ 电脑开发时使用 localhost（需要开启域名校验关闭）
  BASE_URL: 'http://localhost:8000',
  //BASE_URL: 'http://wildfish.site:8000',

  // ⬇️ 手机预览时：使用WiFi局域网IP（请替换为你的实际IP）
  //BASE_URL: 'http://192.168.101.44:8000',

  // 和风天气API配置
  QWEATHER_BASE_URL: 'https://devapi.qweather.com/v7',
  QWEATHER_GEO_URL: 'https://geoapi.qweather.com/v2',
  QWEATHER_API_KEY: '58987769564e4b2ea6fc860a3f2d8392'
}

module.exports = config
