// index.ts
import { Toast } from 'tdesign-miniprogram';

Page({
  data: {
    imageList: [] as Array<{
      id: string;
      imageUrl: string;
      prompt: string;
      showSaveHint?: boolean;
    }>,
    isLoading: false,
    hasMore: true,
    page: 1,
    theme: 'light' as 'light' | 'dark',
    fabButton: {
      theme: 'primary',
      size: 'large',
    },
  },

  onLoad() {
    // 初始化主题
    const app = getApp();
    this.setData({ theme: app.globalData.theme });
    this.updatePageTheme(app.globalData.theme);
    
    this.loadImages();
  },

  onPullDownRefresh() {
    this.setData({
      imageList: [],
      page: 1,
      hasMore: true,
    });
    this.loadImages(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadImages();
    }
  },

  loadImages(callback?: () => void) {
    if (this.data.isLoading || !this.data.hasMore) {
      callback?.();
      return;
    }

    this.setData({ isLoading: true });

    // 从云数据库加载公开的图片
    const db = wx.cloud.database();
    const pageSize = 6;
    const skip = (this.data.page - 1) * pageSize;

    // 添加超时处理
    const timeoutId = setTimeout(() => {
      console.error('加载图片超时');
      this.setData({ isLoading: false });
      Toast({
        context: this,
        selector: '#t-toast',
        message: '加载超时，请检查网络连接',
        theme: 'error',
      });
      callback?.();
    }, 10000); // 10秒超时

    db.collection('images')
      .where({
        isPublic: true
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get({
        success: (res) => {
          clearTimeout(timeoutId);
          console.log('数据库查询成功，返回数据:', res.data);
          console.log('数据条数:', res.data.length);
          
          const images = res.data.map((item: any) => ({
            id: item._id,
            imageUrl: item.imageUrl,
            prompt: item.prompt,
            createTime: item.createTime
          }));

          this.setData({
            imageList: [...this.data.imageList, ...images],
            page: this.data.page + 1,
            isLoading: false,
            hasMore: images.length === pageSize, // 如果返回的数据少于pageSize，说明没有更多数据了
          });
          
          console.log('更新后的imageList:', this.data.imageList);

          // 预加载图片以提升用户体验
          this.preloadImages(images);

          callback?.();
        },
        fail: (error) => {
          clearTimeout(timeoutId);
          console.error('加载图片失败:', error);
          this.setData({ isLoading: false });
          
          // 根据错误类型显示不同的提示信息
          let errorMessage = '加载失败，请重试';
          if ((error as any).errCode === -1) {
            errorMessage = '网络连接失败，请检查网络';
          } else if ((error as any).errCode === 10004) {
            errorMessage = '云数据库访问失败';
          }
          
          Toast({
            context: this,
            selector: '#t-toast',
            message: errorMessage,
            theme: 'error',
          });

          callback?.();
        }
      });
  },

  // 预加载图片
  preloadImages(images: Array<{ imageUrl: string }>) {
    images.forEach((image, index) => {
      // 延迟预加载，避免同时加载太多图片
      setTimeout(() => {
        wx.getImageInfo({
          src: image.imageUrl,
          success: () => {
            console.log('图片预加载成功:', image.imageUrl);
          },
          fail: (err) => {
            console.warn('图片预加载失败:', image.imageUrl, err);
          }
        });
      }, index * 100); // 每100ms预加载一张图片
    });
  },

  onCreateTap() {
    wx.navigateTo({
      url: '/pages/create/create'
    });
  },

  onImageTap(e: any) {
    const id = e.currentTarget.dataset.id;
    console.log('点击了图片:', id);
    // 可以跳转到图片详情页
  },

  // 长按保存图片
  async onImageLongPress(e: any) {
    const imageUrl = e.currentTarget.dataset.url;
    const prompt = e.currentTarget.dataset.prompt;
    
    if (!imageUrl) {
      Toast({
        context: this,
        selector: '#t-toast',
        message: '图片地址无效',
        theme: 'error',
      });
      return;
    }

    // 显示操作选项
    wx.showActionSheet({
      itemList: ['保存到相册', '预览图片'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          // 保存到相册
          await this.saveImageToAlbum(imageUrl, prompt);
        } else if (res.tapIndex === 1) {
          // 预览图片
          wx.previewImage({
            urls: [imageUrl],
            current: imageUrl,
          });
        }
      }
    });
  },

  // 保存图片到相册
  async saveImageToAlbum(imageUrl: string, _prompt: string) {
    Toast({
      context: this,
      selector: '#t-toast',
      message: '正在保存图片...',
      theme: 'loading',
      direction: 'column',
      duration: 0,
    });

    try {
      // 下载图片到临时文件
      const downloadResult = await new Promise<WechatMiniprogram.DownloadFileSuccessCallbackResult>((resolve, reject) => {
        wx.downloadFile({
          url: imageUrl,
          success: resolve,
          fail: reject
        });
      });

      if (downloadResult.statusCode === 200) {
        // 保存图片到相册
        await new Promise<WechatMiniprogram.GeneralCallbackResult>((resolve, reject) => {
          wx.saveImageToPhotosAlbum({
            filePath: downloadResult.tempFilePath,
            success: resolve,
            fail: reject
          });
        });

        wx.hideToast();

        Toast({
          context: this,
          selector: '#t-toast',
          message: '图片已保存到相册',
          theme: 'success',
        });
      } else {
        throw new Error('下载图片失败');
      }
    } catch (error: any) {
      console.error('保存图片失败:', error);
      wx.hideToast();

      let errorMessage = '保存失败，请重试';
      
      // 处理权限相关错误
      if (error.errMsg && error.errMsg.includes('auth')) {
        errorMessage = '请授权访问相册后重试';
        
        // 引导用户去设置页面开启权限
        wx.showModal({
          title: '需要相册权限',
          content: '保存图片需要访问您的相册，请在设置中开启权限',
          confirmText: '去设置',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
        return;
      }

      Toast({
        context: this,
        selector: '#t-toast',
        message: errorMessage,
        theme: 'error',
      });
    }
  },

  // 主题切换
  onThemeToggle() {
    const app = getApp();
    app.toggleTheme();
  },

  // 主题变化回调
  onThemeChange(theme: 'light' | 'dark') {
    this.setData({ theme });
    this.updatePageTheme(theme);
  },

  // 更新页面主题
  updatePageTheme(theme: 'light' | 'dark') {
    // 主题已经通过 data-theme 属性和 CSS 变量自动应用
    // 这里可以添加其他需要的主题相关逻辑
    console.log('页面主题已更新为:', theme);
  }
});
