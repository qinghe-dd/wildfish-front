// pages/markSpot/markSpot.js
const apiConfig = require('../../config/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    address: "", // 当前定位地址
    longitude: "", // 经度
    latitude: "", // 纬度
    spotName: "", // 钓点名称
    spotType: "", // 钓点类型
    waterDepth: "", // 水深
    fishingMethods: [], // 适合钓法（多选）
    desc: "", // 鱼情描述
    imageUrl: "", // 钓点图片临时路径
    tempFilePath: "", // 钓点图片临时文件路径
    isPublishDynamic: true,
    privacy: "全部可见",
    isPaidSpot: false, // 是否为付费钓点
    paymentCodeUrl: "", // 收款码图片临时路径
    paymentCodeTempFilePath: "", // 收款码临时文件路径
    paymentPassword: "", // 查看密码（6位数）
    showPasswordModal: false // 控制密码弹窗显示
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 1. 选择位置（微信内置地图）
  getCurrentLocation() {
    // === 开发测试用假数据（开发时取消注释使用） ===
    const useFakeData = false; // 设置为 true 使用假数据，false 使用真实定位
    //const useFakeData = true;
    if (useFakeData) {
      this.setData({
        address: "北京市朝阳区奥林匹克公园", // 假地址
        longitude: "116.391", // 假经度
        latitude: "39.992",  // 假纬度
        spotName: "奥林匹克公园钓点" // 假钓点名称
      });
      wx.showToast({ title: "已使用测试位置", icon: "success" });
      console.log("使用假定位数据:", this.data);
      return;
    }
    // === 假数据结束 ===

    wx.showLoading({ title: "正在定位..." });

    // 先获取用户当前位置，再打开地图选择
    wx.getLocation({
      type: 'gcj02',
      success: (locRes) => {
        wx.hideLoading();
        wx.showLoading({ title: "正在打开地图..." });

        wx.chooseLocation({
          latitude: locRes.latitude,
          longitude: locRes.longitude,
          success: (res) => {
            wx.hideLoading();
            // 获取用户选择的完整位置信息
            const { name, address, longitude, latitude } = res;
            this.setData({
              address: address || name, // 优先使用详细地址，没有则使用名称
              longitude,
              latitude,
              spotName: name || "" // 同时设置钓点名称
            });
            wx.showToast({ title: "位置选择成功", icon: "success" });
          },
          fail: (err) => {
            wx.hideLoading();

            // 如果用户取消选择，不显示错误
            if (err.errMsg.indexOf('cancel') !== -1) {
              return;
            }

            wx.showModal({
              title: '位置选择失败',
              content: '请在微信中开启位置权限后重试',
              showCancel: false
            });
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取定位失败:', err);

        // 定位失败时仍然打开地图，但无法定位到当前位置
        wx.chooseLocation({
          success: (res) => {
            const { name, address, longitude, latitude } = res;
            this.setData({
              address: address || name,
              longitude,
              latitude,
              spotName: name || ""
            });
            wx.showToast({ title: "位置选择成功", icon: "success" });
          },
          fail: (err) => {
            if (err.errMsg.indexOf('cancel') !== -1) {
              return;
            }
            wx.showModal({
              title: '位置选择失败',
              content: '请开启定位权限后重试',
              showCancel: false
            });
          }
        });
      }
    });
  },

  
  // 2. 选择钓点类型
  chooseType(e) {
    this.setData({ spotType: e.currentTarget.dataset.type });
  },

  // 3. 选择水深
  chooseDepth(e) {
    this.setData({ waterDepth: e.currentTarget.dataset.depth });
  },

  // 4. 选择钓法（多选）
  toggleFishingMethod(e) {
    const method = e.currentTarget.dataset.method;
    console.log('=== 开始 toggleFishingMethod ===');
    console.log('点击钓法:', method);
    console.log('data-method值:', e.currentTarget.dataset.method);
    console.log('当前钓法数组:', this.data.fishingMethods);

    let { fishingMethods } = this.data;

    // 创建新数组，确保触发视图更新
    if (fishingMethods.includes(method)) {
      fishingMethods = fishingMethods.filter(item => item !== method);
      console.log('取消选中, 新数组:', fishingMethods);
    } else {
      // 使用 concat 替代展开运算符
      fishingMethods = fishingMethods.concat(method);
      console.log('选中, 新数组:', fishingMethods);
    }
    this.setData({ fishingMethods });
    console.log('setData完成, fishingMethods:', fishingMethods);
    console.log('当前页面data中的fishingMethods:', this.data.fishingMethods);
  },

  // 判断钓法是否选中
  isSelected(method) {
    return this.data.fishingMethods.includes(method);
  },

  // 5. 输入钓点名称
  inputName(e) {
    this.setData({ spotName: e.detail.value });
  },

  // 6. 输入鱼情描述
  inputDesc(e) {
    this.setData({ desc: e.detail.value });
  },

  // 7. 选择并预览图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imageUrl: res.tempFiles[0].tempFilePath,
          tempFilePath: res.tempFiles[0].tempFilePath
        });
        wx.showToast({title:"图片选择成功",icon:"success"});
      }
    });
  },

  // 8. 是否发布动态 开关
  togglePublishDynamic(e) {
    this.setData({isPublishDynamic: e.detail.value});
  },

  // 9. 隐私权限选择
  choosePrivacy(e) {
    this.setData({privacy: e.detail.value});
  },

  // 兼容旧的changePrivacy函数名
  changePrivacy(e) {
    this.setData({privacy: e.detail.value});
  },

  // 10. 切换付费钓点开关
  togglePaidSpot(e) {
    const isChecked = e.detail.value;
    this.setData({ isPaidSpot: isChecked });

    // 取消勾选时清空收款码
    if (!isChecked) {
      this.setData({
        paymentCodeUrl: "",
        paymentCodeTempFilePath: ""
      });
    }
  },

  // 11. 选择并上传收款码截图
  choosePaymentCode() {
    if (!this.data.isPaidSpot) {
      return wx.showToast({
        title: "请先勾选'设为付费钓点'",
        icon: "none"
      });
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          paymentCodeUrl: res.tempFiles[0].tempFilePath,
          paymentCodeTempFilePath: res.tempFiles[0].tempFilePath
        });
        wx.showToast({ title: "收款码上传成功", icon: "success" });
      }
    });
  },

  // 11.1 生成随机6位数密码
  generatePassword() {
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    this.setData({ paymentPassword: password });
    wx.showToast({ title: `密码已生成：${password}`, icon: "none", duration: 2000 });
  },

  // 11.2 显示密码设置弹窗
  showPasswordModal() {
    this.setData({ showPasswordModal: true });
  },

  // 11.3 隐藏密码设置弹窗
  hidePasswordModal() {
    this.setData({ showPasswordModal: false });
  },

  // 11.4 输入密码
  onPasswordInput(e) {
    this.setData({ paymentPassword: e.detail.value });
  },

  // 11.5 确认密码
  confirmPassword() {
    const password = this.data.paymentPassword.trim();

    // 验证密码
    if (!password) {
      return wx.showToast({ title: "请输入6位数查看密码", icon: "none" });
    }

    if (!/^\d{6}$/.test(password)) {
      return wx.showToast({ title: "密码必须是6位数字", icon: "none" });
    }

    this.setData({ showPasswordModal: false });
    wx.showToast({ title: "密码设置成功，用户需要输入此密码才能查看钓点详情", icon: "success", duration: 3000 });
  },

  // 计算两个经纬度之间的距离（单位：公里）
  calculateDistance(lon1, lat1, lon2, lat2) {
    if (!lon1 || !lat1 || !lon2 || !lat2) return Infinity;

    const R = 6371; // 地球半径，单位：公里
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // 角度转弧度
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  },

  // 检查附近是否有已存在的钓点
  checkNearbySpots(callback) {
    const { longitude, latitude } = this.data;

    if (!longitude || !latitude) {
      return callback && callback();
    }

    wx.showLoading({ title: "检查附近钓点..." });

    wx.request({
      url: apiConfig.BASE_URL + "/fishing-spots/",
      method: "GET",
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          // 查找1公里内的钓点
          const nearbySpots = res.data.filter(spot => {
            if (!spot.longitude || !spot.latitude) return false;
            const distance = this.calculateDistance(
              parseFloat(longitude),
              parseFloat(latitude),
              parseFloat(spot.longitude),
              parseFloat(spot.latitude)
            );
            return distance <= 1; // 1公里以内
          });

          if (nearbySpots.length > 0) {
            // 有附近钓点，显示提示
            this.showNearbySpotsWarning(nearbySpots, callback);
          } else {
            // 没有附近钓点，继续提交
            callback && callback();
          }
        } else {
          callback && callback();
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("检查附近钓点失败:", err);
        // 检查失败也允许继续提交
        callback && callback();
      }
    });
  },

  // 显示附近钓点警告
  showNearbySpotsWarning(nearbySpots, callback) {
    const spotList = nearbySpots.slice(0, 3); // 最多显示3个
    let content = "检测到以下已存在的钓点在1公里以内：\n\n";

    spotList.forEach((spot, index) => {
      const distance = this.calculateDistance(
        parseFloat(this.data.longitude),
        parseFloat(this.data.latitude),
        parseFloat(spot.longitude),
        parseFloat(spot.latitude)
      );
      content += `${index + 1}. ${spot.name || spot.spot_type + '钓点'}\n`;
      content += `   距离: ${(distance * 1000).toFixed(0)}米\n`;
    });

    if (nearbySpots.length > 3) {
      content += `\n还有 ${nearbySpots.length - 3} 个钓点...`;
    }

    content += "\n\n为了保护原创，该位置附近已有钓点，请更换位置重新提交。";

    wx.showModal({
      title: "发现附近钓点",
      content: content,
      confirmText: "我知道了",
      showCancel: false,
      success: (res) => {
        // 不执行回调，阻止提交
        console.log("用户已了解附近钓点信息，提交被阻止");
      }
    });
  },

  // 12. 提交钓点到后端
  submitSpot() {
    // 校验必填项
    const { address, spotType, isPaidSpot, paymentCodeTempFilePath, paymentPassword, tempFilePath } = this.data;

    if (!address) {
      return wx.showToast({ title: "请先获取位置", icon: "error" });
    }
    if (!spotType) {
      return wx.showToast({ title: "请选择钓点类型", icon: "error" });
    }

    // 如果是付费钓点，必须上传收款码和密码
    if (isPaidSpot) {
      if (!paymentCodeTempFilePath) {
        return wx.showToast({ title: "请上传收款码截图", icon: "none" });
      }
      if (!paymentPassword || !/^\d{6}$/.test(paymentPassword)) {
        return wx.showToast({ title: "请设置6位数查看密码", icon: "none" });
      }
    }

    // 距离校验已关闭，直接提交
    this.doSubmitSpot(tempFilePath, paymentCodeTempFilePath);
  },

  // 执行提交钓点到后端
  doSubmitSpot(imagePath, paymentCodePath) {
    wx.showLoading({ title: "发布中..." });

    // 使用auth工具获取用户ID和昵称
    const userId = auth.getUserId()
    if (!userId) {
      wx.hideLoading()
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    const userInfo = auth.getUserInfo()
    const userNickname = userInfo.nickName || '钓鱼达人'
    const isPaidSpot = this.data.isPaidSpot
    const paymentPassword = this.data.paymentPassword

    console.log('✅ 使用真实用户ID:', userId)
    console.log('✅ 用户昵称:', userNickname)

    // 准备发送的数据
    const formData = {
      name: this.data.spotName || "",
      spot_type: this.data.spotType || "",
      water_depth: this.data.waterDepth || "",
      description: this.data.desc || "",
      longitude: this.data.longitude || "",
      latitude: this.data.latitude || "",
      address: this.data.address || "",
      fishing_methods: this.data.fishingMethods.join(",") || "",
      is_publish_dynamic: this.data.isPublishDynamic ? "true" : "false",
      privacy: this.data.privacy || "全部可见",
      is_paid_spot: isPaidSpot ? "true" : "false",
      price: "0",  // 价格在收款码中，这里设为0
      owner_id: userId,  // 发布者用户ID
      owner_nickname: userNickname,  // 发布者昵称
      payment_password: paymentPassword || ""  // 查看密码
    };

    console.log("📤 提交钓点数据:", formData);

    // 上传钓点图片和收款码
    this.uploadSpotWithImages(imagePath, paymentCodePath, formData);
  },

  // 上传钓点图片和收款码
  uploadSpotWithImages(imagePath, paymentCodePath, formData) {
    // 如果没有钓点图片，直接用 JSON 接口创建钓点
    if (!imagePath) {
      wx.request({
        url: apiConfig.BASE_URL + "/fishing-spots/json/",
        method: "POST",
        header: {
          'Content-Type': 'application/json'
        },
        data: formData,
        success: (res) => {
          if (res.statusCode === 200) {
            const spotId = res.data.id;

            // 如果有收款码，继续上传收款码
            if (paymentCodePath) {
              this.uploadPaymentCode(spotId, paymentCodePath);
            } else {
              wx.hideLoading();
              wx.showToast({ title: "钓点标记成功！", icon: "success" });
              setTimeout(() => {
                this.goBack();
              }, 1500);
            }
          } else {
            wx.hideLoading();
            console.error("创建失败:", res.data);
            // 解析并显示后端返回的详细错误信息
            let errorMsg = "发布失败";
            try {
              if (typeof res.data === 'string') {
                errorMsg = res.data;
              } else if (res.data?.detail) {
                errorMsg = res.data.detail;
              } else if (res.data?.message) {
                errorMsg = res.data.message;
              }
            } catch (e) {
              console.error("解析错误信息失败:", e);
            }
            wx.showModal({
              title: "发布失败",
              content: errorMsg,
              showCancel: false
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error("网络错误:", err);
          wx.showToast({ title: "网络错误", icon: "error" });
        }
      });
      return;
    }

    // 有钓点图片，先上传钓点图片
    wx.uploadFile({
      url: apiConfig.BASE_URL + "/fishing-spots/",
      filePath: imagePath,
      name: "image",
      formData: formData,
      success: (res) => {
        if (res.statusCode === 200) {
          const data = JSON.parse(res.data);
          const spotId = data.id;

          // 如果有收款码，继续上传收款码
          if (paymentCodePath) {
            this.uploadPaymentCode(spotId, paymentCodePath);
          } else {
            wx.hideLoading();
            wx.showToast({ title: "钓点标记成功！", icon: "success" });
            setTimeout(() => {
              this.goBack();
            }, 1500);
          }
        } else {
          wx.hideLoading();
          console.error("上传失败:", res.data);
          // 解析并显示后端返回的详细错误信息
          let errorMsg = "发布失败";
          try {
            // uploadFile 的 res.data 是字符串，需要解析
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            if (data?.detail) {
              errorMsg = data.detail;
            } else if (data?.message) {
              errorMsg = data.message;
            } else if (typeof res.data === 'string') {
              errorMsg = res.data;
            }
          } catch (e) {
            console.error("解析错误信息失败:", e);
            // 如果解析失败，尝试直接使用原始数据
            if (typeof res.data === 'string') {
              errorMsg = res.data;
            }
          }
          wx.showModal({
            title: "发布失败",
            content: errorMsg,
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("网络错误:", err);
        wx.showToast({ title: "网络错误", icon: "error" });
      }
    });
  },

  // 上传收款码
  uploadPaymentCode(spotId, paymentCodePath) {
    wx.uploadFile({
      url: apiConfig.BASE_URL + `/fishing-spots/${spotId}/payment-code/`,
      filePath: paymentCodePath,
      name: "payment_code",
      formData: { spot_id: String(spotId) },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.showToast({ title: "钓点标记成功！", icon: "success" });
          setTimeout(() => {
            this.goBack();
          }, 1500);
        } else {
          wx.showToast({ title: "收款码上传失败", icon: "error" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("收款码上传失败:", err);
        wx.showToast({ title: "收款码上传失败", icon: "error" });
      }
    });
  }
})