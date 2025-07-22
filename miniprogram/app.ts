// app.ts

// 扩展全局数据类型
interface ICustomAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo;
    theme: 'light' | 'dark';
  };
  initTheme(): void;
  setTheme(theme: 'light' | 'dark'): void;
  toggleTheme(): void;
}

App<ICustomAppOption>({
  globalData: {
    theme: 'light' as 'light' | 'dark'
  },
  
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-6g4qsd2kcddd1be0', // 云开发环境ID
        traceUser: true,
      })
    }

    // 初始化主题
    this.initTheme();

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  
  // 初始化主题
  initTheme() {
    const savedTheme = wx.getStorageSync('theme') || 'light';
    this.globalData.theme = savedTheme;
    this.setTheme(savedTheme);
  },
  
  // 设置主题
  setTheme(theme: 'light' | 'dark') {
    this.globalData.theme = theme;
    wx.setStorageSync('theme', theme);
    
    // 设置系统导航栏样式
    if (theme === 'dark') {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: '#000000'
      });
    } else {
      wx.setNavigationBarColor({
        frontColor: '#000000',
        backgroundColor: '#ffffff'
      });
    }
  },
  
  // 切换主题
  toggleTheme() {
    const newTheme = this.globalData.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    
    // 通知所有页面更新主题
    const pages = getCurrentPages();
    pages.forEach((page: any) => {
      if (page.onThemeChange) {
        page.onThemeChange(newTheme);
      }
    });
  }
})