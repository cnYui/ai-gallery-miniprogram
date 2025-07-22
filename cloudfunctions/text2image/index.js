const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 阿里云API配置
const DASHSCOPE_API_KEY = 'sk-3fe484a165de4b67965fde33e733a64c';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

// 云函数入口函数
exports.main = async (event, context) => {
  const { action } = event;
  
  try {
    switch (action) {
      case 'createTask':
        return await createImageTask(event);
      case 'getResult':
        return await getTaskResult(event);
      default:
        return {
          success: false,
          error: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

// 创建文生图任务
async function createImageTask(data) {
  const { prompt, negativePrompt, size = '1024*1024', n = 1 } = data;
  
  if (!prompt) {
    return {
      success: false,
      error: '提示词不能为空'
    };
  }
  
  try {
    const requestData = {
      model: 'wanx2.1-t2i-turbo',
      input: {
        prompt: prompt
      },
      parameters: {
        size: size,
        n: n
      }
    };
    
    // 添加反向提示词（如果提供）
    if (negativePrompt) {
      requestData.input.negative_prompt = negativePrompt;
    }
    
    const response = await axios.post(
      `${BASE_URL}/services/aigc/text2image/image-synthesis`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'X-DashScope-Async': 'enable'
        }
      }
    );
    
    if (response.data && response.data.output) {
      return {
        success: true,
        data: {
          taskId: response.data.output.task_id,
          task_status: response.data.output.task_status,
          request_id: response.data.request_id
        }
      };
    } else {
      return {
        success: false,
        error: '创建任务失败，响应格式异常'
      };
    }
  } catch (error) {
    console.error('创建任务失败:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || '创建任务失败'
    };
  }
}

// 查询任务结果
async function getTaskResult(data) {
  const { taskId } = data;
  
  if (!taskId) {
    return {
      success: false,
      error: '任务ID不能为空'
    };
  }
  
  try {
    const response = await axios.get(
      `${BASE_URL}/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
        }
      }
    );
    
    if (response.data && response.data.output) {
      const output = response.data.output;
      
      return {
          success: true,
          data: {
            taskId: output.task_id,
            status: output.task_status,
            submit_time: output.submit_time,
            scheduled_time: output.scheduled_time,
            end_time: output.end_time,
            imageUrls: output.results ? output.results.map(result => result.url) : [],
            message: output.message,
            task_metrics: output.task_metrics,
            request_id: response.data.request_id
          }
        };
    } else {
      return {
        success: false,
        error: '查询结果失败，响应格式异常'
      };
    }
  } catch (error) {
    console.error('查询任务结果失败:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || '查询任务结果失败'
    };
  }
}