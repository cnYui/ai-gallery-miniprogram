// create.ts
import { Toast } from 'tdesign-miniprogram';

Page({
  data: {
    prompt: '',
    negativePrompt: '',
    isGenerating: false,
    theme: 'light' as 'light' | 'dark',
    commonTags: ['写实', '动漫', '电影感', '梦幻', '科幻', '水彩', '赛博朋克', '油画'],
  },

  onLoad() {
    // 初始化主题
    const app = getApp();
    this.setData({ theme: app.globalData.theme });
  },

  onPromptChange(e: any) {
    this.setData({
      prompt: e.detail.value
    });
  },

  onNegativePromptChange(e: any) {
    this.setData({
      negativePrompt: e.detail.value
    });
  },

  onTagTap(e: any) {
    const tag = e.currentTarget.dataset.tag;
    // 将标签添加到提示词中
    this.setData({
      prompt: this.data.prompt ? `${this.data.prompt}，${tag}` : tag
    });
  },

  showInspirationDialog() {
    // 这里可以实现灵感提示功能
    // 例如显示一些示例提示词及其生成的图片
    Toast({
      context: this,
      selector: '#t-toast',
      message: '灵感功能开发中...',
    });
  },

  async onGenerateTap() {
    if (!this.data.prompt) {
      Toast({
        context: this,
        selector: '#t-toast',
        message: '请输入提示词',
        theme: 'error',
      });
      return;
    }

    this.setData({ isGenerating: true });

    Toast({
      context: this,
      selector: '#t-toast',
      message: '正在创建生成任务...',
      theme: 'loading',
      direction: 'column',
      duration: 0,
    });

    try {
      // 调用云函数创建文生图任务
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
        const taskId = cloudResult.data?.taskId;
        if (taskId) {
          Toast({
            context: this,
            selector: '#t-toast',
            message: '任务创建成功，正在跳转...',
            theme: 'success',
          });

          // 跳转到结果页面，传递任务ID
          setTimeout(() => {
            wx.navigateTo({
              url: `/pages/result/result?taskId=${taskId}&prompt=${encodeURIComponent(this.data.prompt)}&negativePrompt=${encodeURIComponent(this.data.negativePrompt)}`,
              success: () => {
                this.setData({ isGenerating: false });
              }
            });
          }, 1000);
        } else {
          this.setData({ isGenerating: false });
          Toast({
            context: this,
            selector: '#t-toast',
            message: '任务ID获取失败',
            theme: 'error',
          });
        }
      } else {
        this.setData({ isGenerating: false });
        Toast({
          context: this,
          selector: '#t-toast',
          message: cloudResult?.error || '创建任务失败',
          theme: 'error',
        });
      }
    } catch (error) {
      console.error('调用云函数失败:', error);
      wx.hideToast();
      this.setData({ isGenerating: false });
      
      // 显示具体错误信息
      let errorMessage = '网络错误，请重试';
      try {
        const cloudResult = (error as any)?.result;
        if (cloudResult && cloudResult.error) {
          errorMessage = cloudResult.error;
        }
      } catch (e) {
        // 忽略解析错误
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
  }
});