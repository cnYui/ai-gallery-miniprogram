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
    fabButton: {
      theme: 'primary',
      size: 'large',
    },
  },

  onLoad() {
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

    // 模拟API请求
    setTimeout(() => {
      // 模拟数据
      const mockImages = [
        { id: `${this.data.page}-1`, imageUrl: 'https://picsum.photos/400/400?random=1', prompt: '梦幻森林中的小精灵，魔幻风格' },
        { id: `${this.data.page}-2`, imageUrl: 'https://picsum.photos/400/400?random=2', prompt: '未来城市夜景，赛博朋克风格' },
        { id: `${this.data.page}-3`, imageUrl: 'https://picsum.photos/400/400?random=3', prompt: '海边日落，写实风格' },
        { id: `${this.data.page}-4`, imageUrl: 'https://picsum.photos/400/400?random=4', prompt: '太空中的宇航员，科幻风格' },
        { id: `${this.data.page}-5`, imageUrl: 'https://picsum.photos/400/400?random=5', prompt: '古代中国宫殿，水墨画风格' },
        { id: `${this.data.page}-6`, imageUrl: 'https://picsum.photos/400/400?random=6', prompt: '雨中的城市街道，电影感' },
      ];

      // 更新数据
      this.setData({
        imageList: [...this.data.imageList, ...mockImages],
        page: this.data.page + 1,
        isLoading: false,
        hasMore: this.data.page < 3, // 模拟只有3页数据
      });

      callback?.();
    }, 1000);
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
  }
});
