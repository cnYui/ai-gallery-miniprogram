// result.ts
import { Toast } from 'tdesign-miniprogram';

Page({
  data: {
    prompt: '',
    negativePrompt: '',
    taskId: '',
    imageUrl: '',
    isLoading: true,
    isRegenerating: false,
    isPublishing: false,
    taskStatus: '',
    errorMessage: '',
    pollTimer: null as any,
    theme: 'light' as 'light' | 'dark',
  },

  onLoad(options: any) {
    // 初始化主题
    const app = getApp();
    this.setData({ theme: app.globalData.theme });
    
    if (options.prompt) {
      this.setData({
        prompt: decodeURIComponent(options.prompt),
        negativePrompt: options.negativePrompt ? decodeURIComponent(options.negativePrompt) : '',
        taskId: options.taskId || '',
      });
    }

    // 开始查询任务结果
    if (this.data.taskId) {
      this.startPollingTaskResult();
    } else {
      this.setData({
        isLoading: false,
        errorMessage: '缺少任务ID'
      });
    }
  },

  onUnload() {
    // 页面卸载时清除定时器
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
    }
  },

  // 开始轮询任务结果
  startPollingTaskResult() {
    this.queryTaskResult();
    
    // 设置定时器，每3秒查询一次
    const timer = setInterval(() => {
      this.queryTaskResult();
    }, 3000);
    
    this.setData({ pollTimer: timer });
  },

  // 查询任务结果
  async queryTaskResult() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'text2image',
        data: {
          action: 'getResult',
          taskId: this.data.taskId
        }
      });

      // 类型安全检查
      const cloudResult = result.result as any;
      if (cloudResult && cloudResult.success) {
        const taskData = cloudResult.data;
        const status = taskData?.status;
        
        this.setData({ taskStatus: status || '' });

        if (status === 'SUCCEEDED') {
          // 任务成功，获取图片URL
          if (taskData?.imageUrls && taskData.imageUrls.length > 0) {
            this.setData({
              imageUrl: taskData.imageUrls[0] || '',
              isLoading: false,
              errorMessage: ''
            });
            
            // 清除定时器
            if (this.data.pollTimer) {
              clearInterval(this.data.pollTimer);
              this.setData({ pollTimer: null });
            }
          }
        } else if (status === 'FAILED') {
          // 任务失败
          this.setData({
            isLoading: false,
            errorMessage: '图片生成失败，请重试'
          });
          
          // 清除定时器
          if (this.data.pollTimer) {
            clearInterval(this.data.pollTimer);
            this.setData({ pollTimer: null });
          }
        } else if (status === 'PENDING' || status === 'RUNNING') {
          // 任务进行中，继续等待
          this.setData({
            isLoading: true,
            errorMessage: ''
          });
        }
      } else {
        const errorMsg = cloudResult?.error || '查询失败';
        console.error('查询任务结果失败:', errorMsg);
        this.setData({
          errorMessage: errorMsg
        });
      }
    } catch (error) {
      console.error('查询任务结果异常:', error);
      this.setData({
        errorMessage: '网络错误，请重试'
      });
    }
  },

  previewImage() {
    if (this.data.imageUrl) {
      wx.previewImage({
        urls: [this.data.imageUrl],
        current: this.data.imageUrl,
      });
    }
  },

  // 重新生成图片
  async onRegenerateTap() {
    this.setData({
      isRegenerating: true,
    });

    Toast({
      context: this,
      selector: '#t-toast',
      message: '正在创建新任务...',
      theme: 'loading',
      direction: 'column',
      duration: 0,
    });

    try {
      // 调用云函数创建新的文生图任务
      const result = await wx.cloud.callFunction({
        name: 'text2image',
        data: {
          action: 'createTask',
          prompt: this.data.prompt,
          negativePrompt: this.data.negativePrompt,
          size: '1024*1024',
          n: 1
        }
      });

      wx.hideToast();

      // 类型安全检查
      const cloudResult = result.result as any;
      if (cloudResult && cloudResult.success) {
        const taskData = cloudResult.data;
        
        if (taskData?.taskId) {
          // 清除旧的定时器
          if (this.data.pollTimer) {
            clearInterval(this.data.pollTimer);
          }
          
          // 更新任务ID并重新开始查询
          this.setData({
            taskId: taskData.taskId,
            isLoading: true,
            isRegenerating: false,
            imageUrl: '',
            errorMessage: ''
          });
          
          Toast({
            context: this,
            selector: '#t-toast',
            message: '新任务创建成功',
            theme: 'success',
          });
          
          // 开始查询新任务结果
          this.startPollingTaskResult();
        } else {
          this.setData({ isRegenerating: false });
          Toast({
            context: this,
            selector: '#t-toast',
            message: '任务ID获取失败',
            theme: 'error',
          });
        }
      } else {
        this.setData({ isRegenerating: false });
        Toast({
          context: this,
          selector: '#t-toast',
          message: cloudResult?.error || '重新生成失败',
          theme: 'error',
        });
      }
    } catch (error) {
      console.error('重新生成失败:', error);
      wx.hideToast();
      this.setData({ isRegenerating: false });
      
      Toast({
        context: this,
        selector: '#t-toast',
        message: '网络错误，请重试',
        theme: 'error',
      });
    }
  },

  // 发布到画廊
  async onPublishTap() {
    if (!this.data.imageUrl) {
      Toast({
        context: this,
        selector: '#t-toast',
        message: '没有可发布的图片',
        theme: 'error',
      });
      return;
    }

    this.setData({ isPublishing: true });

    Toast({
      context: this,
      selector: '#t-toast',
      message: '正在发布到画廊...',
      theme: 'loading',
      direction: 'column',
      duration: 0,
    });

    try {
      // 获取用户openid
      const loginResult = await wx.cloud.callFunction({
        name: 'login'
      });

      const openid = (loginResult.result as any)?.openid;
      if (!openid) {
        throw new Error('获取用户信息失败');
      }

      // 获取云数据库引用
      const db = wx.cloud.database();
      const imagesCollection = db.collection('images');

      // 保存到画廊数据库
      const publishData = {
        openid: openid,
        imageUrl: this.data.imageUrl,
        prompt: this.data.prompt,
        negativePrompt: this.data.negativePrompt || '',
        taskId: this.data.taskId,
        createTime: new Date(),
        isPublic: true,
        likes: 0,
        views: 0,
        status: 'published'
      };

      const addResult = await imagesCollection.add({
        data: publishData
      });

      wx.hideToast();
      this.setData({ isPublishing: false });

      if (addResult._id) {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '发布成功！',
          theme: 'success',
        });

        // 延迟跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        throw new Error('发布失败');
      }
    } catch (error) {
      console.error('发布失败:', error);
      wx.hideToast();
      this.setData({ isPublishing: false });

      Toast({
        context: this,
        selector: '#t-toast',
        message: (error as any)?.message || '发布失败，请重试',
        theme: 'error',
      });
    }
  },

  // 返回创作页面
  onBackToCreate() {
    wx.navigateBack();
  },

  // 主题切换
  onThemeToggle() {
    const app = getApp();
    app.toggleTheme();
  },

  // 主题变化回调
  onThemeChange(theme: 'light' | 'dark') {
    this.setData({ theme });
  },
});