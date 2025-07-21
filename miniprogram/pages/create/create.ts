// create.ts
import { Toast } from 'tdesign-miniprogram';

Page({
  data: {
    prompt: '',
    negativePrompt: '',
    isGenerating: false,
    commonTags: ['写实', '动漫', '电影感', '梦幻', '科幻', '水彩', '赛博朋克', '油画'],
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

  onGenerateTap() {
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
      message: '正在生成图片...',
      theme: 'loading',
      direction: 'column',
      duration: 0,
    });

    // 模拟生成图片的过程
    setTimeout(() => {
      // 关闭Toast
      wx.hideToast();
      
      // 生成成功后，跳转到结果页面
      wx.navigateTo({
        url: `/pages/result/result?prompt=${encodeURIComponent(this.data.prompt)}&negativePrompt=${encodeURIComponent(this.data.negativePrompt)}`,
        success: () => {
          this.setData({ isGenerating: false });
        }
      });
    }, 3000);
  }
}); 