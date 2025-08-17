// 数学公式OCR API服务

interface ApiConfig {
  id: string;
  name: string;
  type: 'mathpix' | 'tencent' | 'baidu' | 'aliyun' | 'xfyun' | 'custom';
  apiKey: string;
  secretKey?: string;
  appId?: string; // 讯飞等服务的AppID
  endpoint?: string;
  enabled: boolean;
  priority: number;
  monthlyQuota?: number;
  usedThisMonth?: number;
  description?: string;
}

interface OcrResult {
  success: boolean;
  text: string;
  latex?: string;
  confidence?: number;
  error?: string;
  apiUsed?: string;
}

class MathOcrService {
  private getApiConfigs(): ApiConfig[] {
    const savedApis = localStorage.getItem('ocrApiConfigs');
    if (!savedApis) return [];
    
    return JSON.parse(savedApis)
      .filter((api: ApiConfig) => api.enabled)
      .sort((a: ApiConfig, b: ApiConfig) => a.priority - b.priority);
  }

  private updateApiUsage(apiId: string) {
    const savedApis = localStorage.getItem('ocrApiConfigs');
    if (!savedApis) return;
    
    const apis = JSON.parse(savedApis);
    const updatedApis = apis.map((api: ApiConfig) => {
      if (api.id === apiId) {
        return {
          ...api,
          usedThisMonth: (api.usedThisMonth || 0) + 1
        };
      }
      return api;
    });
    
    localStorage.setItem('ocrApiConfigs', JSON.stringify(updatedApis));
  }

  private async callMathpixApi(apiConfig: ApiConfig, imageBase64: string): Promise<OcrResult> {
    try {
      const response = await fetch('https://api.mathpix.com/v3/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'app_id': apiConfig.apiKey,
          'app_key': apiConfig.secretKey || ''
        },
        body: JSON.stringify({
          src: `data:image/jpeg;base64,${imageBase64}`,
          formats: ['text', 'latex_styled'],
          data_options: {
            include_asciimath: true,
            include_latex: true
          }
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        text: result.text || '',
        latex: result.latex_styled || result.latex || '',
        confidence: result.confidence || 0,
        apiUsed: 'Mathpix'
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : '未知错误',
        apiUsed: 'Mathpix'
      };
    }
  }

  private async callTencentApi(apiConfig: ApiConfig, imageBase64: string): Promise<OcrResult> {
    try {
      // 腾讯云需要复杂的签名认证，这里提供框架
      // 实际实现需要后端代理或使用腾讯云SDK
      const endpoint = 'https://ocr.tencentcloudapi.com/';
      
      // 这里应该实现腾讯云的签名算法
      // 由于签名复杂，建议通过后端代理
      
      const response = await fetch('/api/ocr/tencent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiConfig.apiKey,
          secretKey: apiConfig.secretKey,
          imageBase64: imageBase64
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '腾讯云API调用失败');
      }

      return {
        success: true,
        text: result.text || '',
        latex: result.latex || '',
        confidence: result.confidence || 0,
        apiUsed: '腾讯云'
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : '腾讯云API调用失败',
        apiUsed: '腾讯云'
      };
    }
  }

  private async callBaiduApi(apiConfig: ApiConfig, imageBase64: string): Promise<OcrResult> {
    try {
      // 百度API调用逻辑
      const response = await fetch('/api/ocr/baidu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiConfig.apiKey,
          secretKey: apiConfig.secretKey,
          imageBase64: imageBase64
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '百度API调用失败');
      }

      return {
        success: true,
        text: result.text || '',
        latex: result.latex || '',
        confidence: result.confidence || 0,
        apiUsed: '百度智能云'
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : '百度API调用失败',
        apiUsed: '百度智能云'
      };
    }
  }

  private async callXfyunApi(apiConfig: ApiConfig, imageBase64: string): Promise<OcrResult> {
    try {
      // 讯飞公式识别API调用
      const response = await fetch('/api/ocr/xfyun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: apiConfig.appId,
          apiKey: apiConfig.apiKey,
          secretKey: apiConfig.secretKey,
          imageBase64: imageBase64
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '讯飞API调用失败');
      }

      return {
        success: true,
        text: result.text || '',
        latex: result.latex || '',
        confidence: result.confidence || 0,
        apiUsed: '讯飞公式识别'
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : '讯飞API调用失败',
        apiUsed: '讯飞公式识别'
      };
    }
  }

  private async callCustomApi(apiConfig: ApiConfig, imageBase64: string): Promise<OcrResult> {
    try {
      if (!apiConfig.endpoint) {
        throw new Error('自定义API端点未配置');
      }

      const response = await fetch(apiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${imageBase64}`,
          format: 'latex'
        })
      });

      const result = await response.json();
      
      return {
        success: response.ok,
        text: result.text || '',
        latex: result.latex || '',
        confidence: result.confidence || 0,
        apiUsed: apiConfig.name
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : '自定义API调用失败',
        apiUsed: apiConfig.name
      };
    }
  }

  private async callSingleApi(apiConfig: ApiConfig, imageBase64: string): Promise<OcrResult> {
    // 检查月限额
    if (apiConfig.monthlyQuota && 
        (apiConfig.usedThisMonth || 0) >= apiConfig.monthlyQuota) {
      return {
        success: false,
        text: '',
        error: `${apiConfig.name} 本月限额已用完`,
        apiUsed: apiConfig.name
      };
    }

    let result: OcrResult;

    switch (apiConfig.type) {
      case 'mathpix':
        result = await this.callMathpixApi(apiConfig, imageBase64);
        break;
      case 'tencent':
        result = await this.callTencentApi(apiConfig, imageBase64);
        break;
      case 'baidu':
        result = await this.callBaiduApi(apiConfig, imageBase64);
        break;
      case 'aliyun':
        // 阿里云实现类似腾讯云
        result = { success: false, text: '', error: '阿里云API暂未实现', apiUsed: apiConfig.name };
        break;
      case 'xfyun':
        result = await this.callXfyunApi(apiConfig, imageBase64);
        break;
      case 'custom':
        result = await this.callCustomApi(apiConfig, imageBase64);
        break;
      default:
        result = { success: false, text: '', error: '不支持的API类型', apiUsed: apiConfig.name };
    }

    // 如果成功，更新使用量
    if (result.success) {
      this.updateApiUsage(apiConfig.id);
    }

    return result;
  }

  async recognizeImage(file: File): Promise<OcrResult> {
    const apiConfigs = this.getApiConfigs();
    
    if (apiConfigs.length === 0) {
      return {
        success: false,
        text: '',
        error: '未配置任何OCR API，请前往API管理页面添加配置'
      };
    }

    // 将图片转换为base64
    const imageBase64 = await this.fileToBase64(file);
    
    // 按优先级尝试调用API
    for (const apiConfig of apiConfigs) {
      try {
        console.log(`尝试使用 ${apiConfig.name} 进行OCR识别...`);
        const result = await this.callSingleApi(apiConfig, imageBase64);
        
        if (result.success && result.text.trim()) {
          console.log(`${apiConfig.name} 识别成功`);
          return result;
        } else {
          console.log(`${apiConfig.name} 识别失败或无结果: ${result.error}`);
        }
      } catch (error) {
        console.error(`${apiConfig.name} 调用异常:`, error);
      }
    }

    // 所有API都失败，回退到Tesseract
    console.log('所有配置的API都失败，回退到本地Tesseract识别...');
    return this.fallbackToTesseract(file);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async fallbackToTesseract(file: File): Promise<OcrResult> {
    try {
      // 动态导入Tesseract.js（如果需要作为fallback）
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(
        file,
        'chi_sim+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`Tesseract识别进度: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      return {
        success: true,
        text: result.data.text,
        confidence: result.data.confidence,
        apiUsed: 'Tesseract (本地备用)'
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Tesseract识别失败',
        apiUsed: 'Tesseract (本地备用)'
      };
    }
  }

  // 测试API配置
  async testApiConfig(apiConfig: ApiConfig): Promise<{ success: boolean; message: string }> {
    // 创建一个测试图片（1x1像素的base64图片）
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    try {
      const result = await this.callSingleApi(apiConfig, testImageBase64);
      
      if (result.success) {
        return { success: true, message: `${apiConfig.name} 连接成功` };
      } else {
        return { success: false, message: result.error || `${apiConfig.name} 连接失败` };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : `${apiConfig.name} 测试失败` 
      };
    }
  }
}

export const mathOcrService = new MathOcrService();
export type { OcrResult, ApiConfig };
