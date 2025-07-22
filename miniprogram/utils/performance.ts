// 性能监控工具

interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 开始计时
  start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now()
    });
  }

  // 结束计时
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // 上报性能数据
    this.reportPerformance(name, duration);
    
    console.log(`Performance [${name}]: ${duration}ms`);
    return duration;
  }

  // 上报性能数据到微信
  reportPerformance(_name: string, duration: number): void {
    try {
      wx.reportPerformance(1001, duration);
    } catch (error) {
      console.warn('Failed to report performance:', error);
    }
  }

  // 获取所有性能指标
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  // 清除指标
  clear(): void {
    this.metrics.clear();
  }

  // 获取平均加载时间
  getAverageLoadTime(): number {
    const loadMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.name.includes('load') && metric.duration)
      .map(metric => metric.duration!);
    
    if (loadMetrics.length === 0) return 0;
    
    return loadMetrics.reduce((sum, duration) => sum + duration, 0) / loadMetrics.length;
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 便捷函数
export const startPerformance = (name: string) => performanceMonitor.start(name);
export const endPerformance = (name: string) => performanceMonitor.end(name);

// 页面性能监控装饰器
export function monitorPagePerformance(pageName: string) {
  return function(target: any) {
    const originalOnLoad = target.onLoad;
    const originalOnReady = target.onReady;
    const originalOnShow = target.onShow;

    target.onLoad = function(options: any) {
      startPerformance(`${pageName}_load`);
      if (originalOnLoad) {
        originalOnLoad.call(this, options);
      }
    };

    target.onReady = function() {
      endPerformance(`${pageName}_load`);
      startPerformance(`${pageName}_ready`);
      if (originalOnReady) {
        originalOnReady.call(this);
      }
      endPerformance(`${pageName}_ready`);
    };

    target.onShow = function() {
      startPerformance(`${pageName}_show`);
      if (originalOnShow) {
        originalOnShow.call(this);
      }
      endPerformance(`${pageName}_show`);
    };

    return target;
  };
}

// 网络请求性能监控
export function monitorNetworkRequest(url: string, startTime: number) {
  const duration = Date.now() - startTime;
  performanceMonitor.reportPerformance(`network_${url}`, duration);
  return duration;
}

// 图片加载性能监控
export function monitorImageLoad(imageUrl: string) {
  const startTime = Date.now();
  
  return new Promise<number>((resolve, reject) => {
    wx.getImageInfo({
      src: imageUrl,
      success: () => {
        const duration = Date.now() - startTime;
        performanceMonitor.reportPerformance('image_load', duration);
        resolve(duration);
      },
      fail: (error) => {
        const duration = Date.now() - startTime;
        performanceMonitor.reportPerformance('image_load_failed', duration);
        reject(error);
      }
    });
  });
}