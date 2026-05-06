//index.js
Component({
  data: {
    selected: 0,
    list: [
      {
        text: "野钓",
        pagePath: "/pages/index/index",
        iconPath: "/images/navBarImg/yediao.jpeg",
        selectedIconPath: "/images/navBarImg/yediao.jpeg"
      },
      // {
      //   text: "动态",
      //   pagePath: "/pages/mall/mall",
      //   iconPath: "/images/navBarImg/dongtai.jpeg",
      //   selectedIconPath: "/images/navBarImg/dongtai.jpeg"
      // },
      {
        text: "收费",
        pagePath: "/pages/cart/cart",
        iconPath: "/images/navBarImg/shoufei.jpeg",
        selectedIconPath: "/images/navBarImg/shoufei.jpeg"
      },
      {
        text: "我的",
        pagePath: "/pages/mine/mine",
        iconPath: "/images/navBarImg/my.jpeg",
        selectedIconPath: "/images/navBarImg/my.jpeg"
      }
  ]
  },
  attached() {
  },
  methods: {
    switchTab(e) {
      // console.log(e)
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url})
      this.setData({
        selected: data.index,
      })
    }
  }
})