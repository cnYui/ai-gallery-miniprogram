// result.ts
import { Toast } from 'tdesign-miniprogram';

Page({
  data: {
    prompt: '',
    negativePrompt: '',
    imageUrl: 'https://picsum.photos/800/800?random=100',
    isLoading: true,
    isPublishing: false,
  },

  onLoad(options: any) {
    if (options.prompt) {
      this.setData({
        prompt: decodeURIComponent(options.prompt),
        negativePrompt: options.negativePrompt ? decodeURIComponent(options.negativePrompt) : '',
      });
    }

    // 模拟加载图片
    setTimeout(() => {
      this.setData({
        isLoading: false,
      });
    }, 1500);
  },

  previewImage() {
    wx.previewImage({
      urls: [this.data.imageUrl],
      current: this.data.imageUrl,
    });
  },

  onRegenerateTap() {
    this.setData({
      isLoading: true,
    });

    // 模拟重新生成图片
    setTimeout(() => {
      // 随机生成一个新的图片URL
      const randomNum = Math.floor(Math.random() * 1000);
      this.setData({
        imageUrl: `https://picsum.photos/800/800?random=${randomNum}`,
        isLoading: false,
      });
    }, 2000);
  },

  async onPublishTap() {
    this.setData({
      isPublishing: true,
    });

    Toast({
      context: this,
      selector: '#t-toast',
      message: '发布中...',
      theme: 'loading',
      direction: 'column',
      duration: 0,
    });

    try {
      // 获取用户openid
      const loginRes = await wx.cloud.callFunction({
        name: 'login'
      });
      
      const result = loginRes.result as any;
      if (!result || !result.openid) {
        wx.hideToast();
        Toast({
          context: this,
          selector: '#t-toast',
          message: '请先登录',
          theme: 'error',
        });
        this.setData({ isPublishing: false });
        return;
      }

      // 保存作品到云数据库
      const db = wx.cloud.database();
      await db.collection('user_images').add({
        data: {
          openid: result.openid,
          imageUrl: this.data.imageUrl,
          prompt: this.data.prompt,
          negativePrompt: this.data.negativePrompt,
          createTime: new Date(),
          isPublic: true
        }
      });

      wx.hideToast();
      Toast({
        context: this,
        selector: '#t-toast',
        message: '发布成功',
        theme: 'success',
        direction: 'column',
      });

      // 发布成功后，返回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index',
        });
      }, 1500);
    } catch (error) {
      console.error('发布失败:', error);
      wx.hideToast();
      Toast({
        context: this,
        selector: '#t-toast',
        message: '发布失败，请重试',
        theme: 'error',
      });
      this.setData({ isPublishing: false });
    }
  },
});