// index.ts
import { Toast } from 'tdesign-miniprogram';

Page({
  data: {
    imageList: [] as Array<{
      id: string;
      imageUrl: string;
      prompt: string;
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

    db.collection('images')
      .where({
        isPublic: true
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get({
        success: (res) => {
          console.log('数据库查询成功，返回数据:', res.data);
          console.log('数据条数:', res.data.length);
          
          const images = res.data.map((item: any) => ({
            id: item._id,
            imageUrl: item.imageUrl,
            prompt: item.prompt
          }));

          this.setData({
            imageList: [...this.data.imageList, ...images],
            page: this.data.page + 1,
            isLoading: false,
            hasMore: images.length === pageSize, // 如果返回的数据少于pageSize，说明没有更多数据了
          });
          
          console.log('更新后的imageList:', this.data.imageList);

          callback?.();
        },
        fail: (error) => {
          console.error('加载图片失败:', error);
          this.setData({ isLoading: false });
          
          Toast({
            context: this,
            selector: '#t-toast',
            message: '加载失败，请重试',
            theme: 'error',
          });

          callback?.();
        }
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
