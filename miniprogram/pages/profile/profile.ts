// profile.ts
import { Toast } from 'tdesign-miniprogram';

Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatarUrl: '',
      nickName: '',
      openid: '',
    },
    creationCount: 0,
    myImages: [] as Array<{
      id: string;
      imageUrl: string;
      prompt: string;
      createTime: Date;
    }>,
  },

  onLoad() {
    // 检查是否已登录
    this.checkLoginStatus();
  },

  onShow() {
    // 如果已登录，刷新用户作品
    if (this.data.isLoggedIn) {
      this.loadUserImages();
    }
  },

  checkLoginStatus() {
    // 检查云开发登录状态
    wx.cloud.callFunction({
      name: 'login',
      success: (res: any) => {
        if (res.result && res.result.openid) {
          // 用户已登录，获取用户信息
          this.getUserInfo(res.result.openid);
        } else {
          this.setData({
            isLoggedIn: false,
          });
        }
      },
      fail: (err) => {
        console.error('检查登录状态失败', err);
        this.setData({
          isLoggedIn: false,
        });
      }
    });
  },

  // 获取用户信息
  getUserInfo(openid: string) {
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: openid
    }).get({
      success: (res) => {
        if (res.data.length > 0) {
          const userInfo = res.data[0];
          this.setData({
            isLoggedIn: true,
            userInfo: {
              avatarUrl: userInfo.avatarUrl,
              nickName: userInfo.nickName,
              openid: openid
            }
          });
          this.loadUserImages();
        } else {
          // 用户信息不存在，需要注册
          this.setData({
            isLoggedIn: false,
          });
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        this.setData({
          isLoggedIn: false,
        });
      }
    });
  },

  onLoginTap() {
    // 微信授权登录
    Toast({
      context: this,
      selector: '#t-toast',
      message: '登录中...',
      theme: 'loading',
      direction: 'column',
    });

    // 获取用户信息授权
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        
        // 调用云函数进行登录
        wx.cloud.callFunction({
          name: 'login',
          success: (loginRes: any) => {
            if (loginRes.result && loginRes.result.openid) {
              const openid = loginRes.result.openid;
              
              // 将用户信息保存到云数据库
              this.saveUserInfo(openid, userInfo);
            } else {
              Toast({
                context: this,
                selector: '#t-toast',
                message: '登录失败，请重试',
                theme: 'error',
                direction: 'column',
              });
            }
          },
          fail: (err) => {
            console.error('云函数调用失败', err);
            Toast({
              context: this,
              selector: '#t-toast',
              message: '登录失败，请重试',
              theme: 'error',
              direction: 'column',
            });
          }
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        Toast({
          context: this,
          selector: '#t-toast',
          message: '需要授权才能使用完整功能',
          theme: 'warning',
          direction: 'column',
        });
      }
    });
  },

  // 保存用户信息到云数据库
  saveUserInfo(openid: string, userInfo: any) {
    const db = wx.cloud.database();
    
    // 先检查用户是否已存在
    db.collection('users').where({
      _openid: openid
    }).get({
      success: (res) => {
        if (res.data.length > 0) {
          // 用户已存在，更新信息
          db.collection('users').doc(res.data[0]._id).update({
            data: {
              avatarUrl: userInfo.avatarUrl,
              nickName: userInfo.nickName,
              updateTime: new Date()
            },
            success: () => {
              this.loginSuccess(openid, userInfo);
            },
            fail: (err) => {
              console.error('更新用户信息失败', err);
              Toast({
                context: this,
                selector: '#t-toast',
                message: '登录失败，请重试',
                theme: 'error',
                direction: 'column',
              });
            }
          });
        } else {
          // 新用户，创建记录
          db.collection('users').add({
            data: {
              avatarUrl: userInfo.avatarUrl,
              nickName: userInfo.nickName,
              createTime: new Date(),
              updateTime: new Date()
            },
            success: () => {
              this.loginSuccess(openid, userInfo);
            },
            fail: (err) => {
              console.error('创建用户信息失败', err);
              Toast({
                context: this,
                selector: '#t-toast',
                message: '登录失败，请重试',
                theme: 'error',
                direction: 'column',
              });
            }
          });
        }
      },
      fail: (err) => {
        console.error('查询用户信息失败', err);
        Toast({
          context: this,
          selector: '#t-toast',
          message: '登录失败，请重试',
          theme: 'error',
          direction: 'column',
        });
      }
    });
  },

  // 登录成功处理
  loginSuccess(openid: string, userInfo: any) {
    this.setData({
      isLoggedIn: true,
      userInfo: {
        avatarUrl: userInfo.avatarUrl,
        nickName: userInfo.nickName,
        openid: openid
      }
    });
    
    Toast({
      context: this,
      selector: '#t-toast',
      message: '登录成功',
      theme: 'success',
      direction: 'column',
    });
    
    this.loadUserImages();
  },

  loadUserImages() {
    if (!this.data.userInfo.openid) return;
    
    // 从云数据库加载用户作品
    const db = wx.cloud.database();
    
    db.collection('images').where({
      _openid: this.data.userInfo.openid
    })
    .orderBy('createTime', 'desc')
    .limit(20) // 限制返回数量，提升性能
    .get({
      success: (res) => {
        const images = res.data.map((item: any) => ({
          id: item._id,
          imageUrl: item.imageUrl,
          prompt: item.prompt,
          createTime: item.createTime
        }));
        
        this.setData({
          myImages: images,
          creationCount: images.length,
        });
      },
      fail: (err) => {
        console.error('加载用户作品失败', err);
        Toast({
          context: this,
          selector: '#t-toast',
          message: '加载作品失败，请重试',
          theme: 'error',
          direction: 'column',
        });
        // 如果加载失败，显示空列表
        this.setData({
          myImages: [],
          creationCount: 0,
        });
      }
    });
  },

  onCreateTap() {
    wx.navigateTo({
      url: '/pages/create/create'
    });
  },

  // 退出登录
  onLogoutTap() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            isLoggedIn: false,
            userInfo: {
              avatarUrl: '',
              nickName: '',
              openid: '',
            },
            myImages: [],
            creationCount: 0,
          });
          
          Toast({
            context: this,
            selector: '#t-toast',
            message: '已退出登录',
            theme: 'success',
            direction: 'column',
          });
        }
      }
    });
  },

  // 编辑头像
  onEditAvatarTap() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadAvatar(tempFilePath);
      },
      fail: (err) => {
        // 用户取消选择不显示错误提示
        if (err.errMsg !== 'chooseMedia:fail cancel') {
          console.error('选择图片失败', err);
          Toast({
            context: this,
            selector: '#t-toast',
            message: '选择图片失败',
            theme: 'error',
          });
        }
      }
    });
  },

  // 编辑昵称
  onEditNicknameTap() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newNickname = res.content.trim();
          this.updateUserNickname(newNickname);
        }
      }
    });
  },

  // 上传头像到云存储
  uploadAvatar(tempFilePath: string) {
    Toast({
      context: this,
      selector: '#t-toast',
      message: '上传中...',
      theme: 'loading',
      duration: 0,
    });

    const openid = this.data.userInfo.openid;
    const cloudPath = `avatars/${openid}.jpg`;

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath,
      success: (uploadRes) => {
        console.log('头像上传成功', uploadRes);
        this.updateUserAvatar(uploadRes.fileID);
      },
      fail: (err) => {
        console.error('头像上传失败', err);
        wx.hideToast();
        Toast({
          context: this,
          selector: '#t-toast',
          message: '上传失败，请重试',
          theme: 'error',
        });
      }
    });
  },

  // 更新用户头像信息
  updateUserAvatar(fileID: string) {
    const db = wx.cloud.database();
    const openid = this.data.userInfo.openid;

    db.collection('users').where({
      _openid: openid
    }).get({
      success: (res) => {
        if (res.data.length > 0) {
          const userId = res.data[0]._id;
          
          db.collection('users').doc(userId).update({
            data: {
              avatarUrl: fileID,
              updateTime: new Date()
            },
            success: () => {
              // 更新本地数据
              this.setData({
                'userInfo.avatarUrl': fileID
              });
              
              wx.hideToast();
              Toast({
                context: this,
                selector: '#t-toast',
                message: '头像更新成功',
                theme: 'success',
              });
            },
            fail: (err) => {
              console.error('更新头像信息失败', err);
              wx.hideToast();
              Toast({
                context: this,
                selector: '#t-toast',
                message: '更新失败，请重试',
                theme: 'error',
              });
            }
          });
        }
      },
      fail: (err) => {
        console.error('查询用户信息失败', err);
        wx.hideToast();
        Toast({
          context: this,
          selector: '#t-toast',
          message: '更新失败，请重试',
          theme: 'error',
        });
      }
    });
  },

  // 更新用户昵称
  updateUserNickname(newNickname: string) {
    Toast({
      context: this,
      selector: '#t-toast',
      message: '更新中...',
      theme: 'loading',
      duration: 0,
    });

    const db = wx.cloud.database();
    const openid = this.data.userInfo.openid;

    db.collection('users').where({
      _openid: openid
    }).get({
      success: (res) => {
        if (res.data.length > 0) {
          const userId = res.data[0]._id;
          
          db.collection('users').doc(userId).update({
            data: {
              nickName: newNickname,
              updateTime: new Date()
            },
            success: () => {
              // 更新本地数据
              this.setData({
                'userInfo.nickName': newNickname
              });
              
              wx.hideToast();
              Toast({
                context: this,
                selector: '#t-toast',
                message: '昵称更新成功',
                theme: 'success',
              });
            },
            fail: (err) => {
              console.error('更新昵称失败', err);
              wx.hideToast();
              Toast({
                context: this,
                selector: '#t-toast',
                message: '更新失败，请重试',
                theme: 'error',
              });
            }
          });
        }
      },
      fail: (err) => {
        console.error('查询用户信息失败', err);
        wx.hideToast();
        Toast({
          context: this,
          selector: '#t-toast',
          message: '更新失败，请重试',
          theme: 'error',
        });
      }
    });
  }
});