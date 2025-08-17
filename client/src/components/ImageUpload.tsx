import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, Loader } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface ImageUploadProps {
  onRecognized: (result: {
    content: string;
    answer: string;
    analysis: string;
  }) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onRecognized }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 预览URL释放，避免内存泄漏；但不在识别完成后自动清除，直到用户手动清空
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 图片预处理函数
  const preprocessImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // 设置画布尺寸
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制图片
        ctx.drawImage(img, 0, 0);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 简单的图像增强：提高对比度
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // 转换为灰度
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // 提高对比度
          const enhanced = gray > 128 ? 255 : 0;
          
          data[i] = enhanced;     // R
          data[i + 1] = enhanced; // G
          data[i + 2] = enhanced; // B
          // Alpha保持不变
        }
        
        // 将处理后的图像数据放回画布
        ctx.putImageData(imageData, 0, 0);
        
        // 转换为Blob
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, { type: file.type });
            resolve(processedFile);
          } else {
            resolve(file); // 如果处理失败，返回原文件
          }
        }, file.type);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
      return;
    }

    setError('');
    setIsUploading(true);

    // 创建预览URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      setIsUploading(false);
      setIsRecognizing(true);

      // 预处理图片
      const processedFile = await preprocessImage(file);

      // 使用Tesseract.js进行OCR识别
      const result = await Tesseract.recognize(
        processedFile,
        'chi_sim+eng', // 中文简体 + 英文
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              // 可以在这里显示识别进度
              console.log(`识别进度: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      const recognizedText = result.data.text;
      setRecognizedText(recognizedText);
      setIsRecognizing(false);
    } catch (error) {
      console.error('OCR识别失败:', error);
      setError('图片识别失败，请重试或检查图片质量');
      setIsRecognizing(false);
    }
  };

  const handleRecognize = async () => {
    if (!recognizedText) return;

    try {
      // 智能解析识别结果
      const lines = recognizedText.split('\n').filter(line => line.trim());
      let content = '';
      let answer = '';
      let analysis = '';

      let currentSection = 'content';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 检测答案部分
        if (trimmedLine.includes('答案') || 
            trimmedLine.includes('答：') || 
            trimmedLine.includes('答:') ||
            trimmedLine.includes('解：') ||
            trimmedLine.includes('解:') ||
            trimmedLine.match(/^[A-D][\s\.,、]/) || // 选择题选项
            trimmedLine.match(/^[①②③④⑤⑥⑦⑧⑨⑩]/)) { // 序号
          if (currentSection === 'content') {
            currentSection = 'answer';
          }
        }
        
        // 检测解析部分
        if (trimmedLine.includes('解析') || 
            trimmedLine.includes('分析') ||
            trimmedLine.includes('说明') ||
            trimmedLine.includes('过程') ||
            trimmedLine.includes('步骤')) {
          currentSection = 'analysis';
        }

        // 根据当前部分添加内容
        switch (currentSection) {
          case 'content':
            if (content && !content.endsWith('\n')) {
              content += '\n';
            }
            content += trimmedLine;
            break;
          case 'answer':
            if (answer && !answer.endsWith('\n')) {
              answer += '\n';
            }
            answer += trimmedLine;
            break;
          case 'analysis':
            if (analysis && !analysis.endsWith('\n')) {
              analysis += '\n';
            }
            analysis += trimmedLine;
            break;
        }
      }

      // 如果没有识别出答案或解析，将整个内容作为题目内容
      if (!answer.trim() && !analysis.trim()) {
        content = recognizedText;
      }

      onRecognized({
        content: content.trim(),
        answer: answer.trim(),
        analysis: analysis.trim()
      });
      // 保留图片与识别文本，直到用户手动点击“重新上传/清除”
    } catch (error) {
      setError('识别失败，请重试');
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setRecognizedText('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-4">
        <Upload className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">图片识别</h3>
      </div>

      {/* 文件上传区域 */}
      <div className="mb-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            点击上传或拖拽图片到此处
          </p>
          <p className="text-xs text-gray-500">
            支持 JPG、PNG 格式，最大 5MB
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            选择图片
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 预览和识别结果 */}
      {previewUrl && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">图片预览</h4>
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <img
              src={previewUrl}
              alt="预览"
              className="max-w-full h-auto max-h-64 rounded-md border"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="text-white text-center">
                  <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>正在处理图片...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 识别结果 */}
      {recognizedText && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">识别结果</h4>
            {isRecognizing && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader className="h-4 w-4 animate-spin mr-1" />
                正在识别...
              </div>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {recognizedText}
            </pre>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleRecognize}
              disabled={isRecognizing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
            >
              <FileText className="h-4 w-4 mr-1 inline" />
              使用识别结果
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              重新上传
            </button>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">使用说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 上传清晰的题目图片，确保文字清晰可读</li>
          <li>• 支持手写和打印体文字识别（中文+英文）</li>
          <li>• 系统会自动增强图片对比度，提高识别准确率</li>
          <li>• 识别结果会智能分段为题目、答案、解析</li>
          <li>• 识别结果需要人工校对后使用</li>
          <li>• 建议使用高分辨率、对比度强的图片</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;
