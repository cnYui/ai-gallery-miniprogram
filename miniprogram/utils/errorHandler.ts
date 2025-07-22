// 错误处理工具
import { Toast } from 'tdesign-miniprogram';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'network',
  DATABASE = 'database',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// 错误信息接口
interface ErrorInfo {
  type: ErrorType;
  code?: number;
  message: string;
  originalError?: any;
  context?: string;
}

// 错误处理器类
class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // 处理错误
  handle(error: any, context?: string): void {
    const errorInfo = this.parseError(error, context);
    this.logError(errorInfo);
    this.showUserFriendlyMessage(errorInfo);
    this.reportError(errorInfo);
  }

  // 解析错误
  private parseError(error: any, context?: string): ErrorInfo {
    let errorInfo: ErrorInfo = {
      type: ErrorType.UNKNOWN,
      message: '未知错误',
      originalError: error,
      context
    };

    if (error.errCode !== undefined) {
      errorInfo.code = error.errCode;
      
      // 根据错误码判断错误类型
      switch (error.errCode) {
        case -1:
        case 600003:
          errorInfo.type = ErrorType.NETWORK;
          errorInfo.message = '网络连接失败，请检查网络设置';
          break;
        case 10004:
        case 10007:
          errorInfo.type = ErrorType.DATABASE;
          errorInfo.message = '数据库访问失败，请稍后重试';
          break;
        case 11000:
        case 11001:
          errorInfo.type = ErrorType.PERMISSION;
          errorInfo.message = '权限不足，请检查授权设置';
          break;
        default:
          errorInfo.message = error.errMsg || '操作失败，请重试';
      }
    } else if (error.message) {
      errorInfo.message = error.message;
    } else if (typeof error === 'string') {
      errorInfo.message = error;
    }

    return errorInfo;
  }

  // 记录错误日志
  private logError(errorInfo: ErrorInfo): void {
    console.error(`[${errorInfo.type.toUpperCase()}] ${errorInfo.context || 'Unknown Context'}:`, {
      message: errorInfo.message,
      code: errorInfo.code,
      originalError: errorInfo.originalError
    });

    // 保存到本地日志
    this.errorLog.push({
      ...errorInfo,
      timestamp: new Date().toISOString()
    } as any);

    // 限制日志数量
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }
  }

  // 显示用户友好的错误信息
  private showUserFriendlyMessage(errorInfo: ErrorInfo): void {
    const page = getCurrentPages().pop();
    if (!page) return;

    let theme: 'error' | 'warning' = 'error';
    let message = errorInfo.message;

    // 根据错误类型调整显示样式
    switch (errorInfo.type) {
      case ErrorType.NETWORK:
        theme = 'warning';
        break;
      case ErrorType.PERMISSION:
        theme = 'warning';
        break;
    }

    // 使用 Toast 显示错误信息
    Toast({
      context: page,
      selector: '#t-toast',
      message,
      theme,
      direction: 'column',
      duration: 3000
    });
  }

  // 上报错误到微信
  private reportError(errorInfo: ErrorInfo): void {
    try {
      // 使用 wx.reportPerformance 替代不存在的 wx.reportMonitor
      wx.reportPerformance(1002, errorInfo.code || 0);
    } catch (e) {
      console.warn('Failed to report error:', e);
    }
  }

  // 获取错误日志
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  // 清除错误日志
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // 处理网络错误
  handleNetworkError(error: any, context?: string): void {
    this.handle({ ...error, type: ErrorType.NETWORK }, context);
  }

  // 处理数据库错误
  handleDatabaseError(error: any, context?: string): void {
    this.handle({ ...error, type: ErrorType.DATABASE }, context);
  }

  // 处理权限错误
  handlePermissionError(error: any, context?: string): void {
    this.handle({ ...error, type: ErrorType.PERMISSION }, context);
  }

  // 处理验证错误
  handleValidationError(message: string, context?: string): void {
    this.handle({ type: ErrorType.VALIDATION, message }, context);
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 便捷函数
export const handleError = (error: any, context?: string) => errorHandler.handle(error, context);
export const handleNetworkError = (error: any, context?: string) => errorHandler.handleNetworkError(error, context);
export const handleDatabaseError = (error: any, context?: string) => errorHandler.handleDatabaseError(error, context);
export const handlePermissionError = (error: any, context?: string) => errorHandler.handlePermissionError(error, context);
export const handleValidationError = (message: string, context?: string) => errorHandler.handleValidationError(message, context);

// 全局错误处理装饰器
export function withErrorHandling(context: string) {
  return function(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        
        // 如果返回 Promise，处理异步错误
        if (result && typeof result.catch === 'function') {
          return result.catch((error: any) => {
            handleError(error, `${context}.${propertyKey}`);
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        handleError(error, `${context}.${propertyKey}`);
        throw error;
      }
    };

    return descriptor;
  };
}

// 异步函数错误处理包装器
export function safeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  }) as T;
}