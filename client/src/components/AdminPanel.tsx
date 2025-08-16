import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, Server, Monitor, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [isRestartingBackend, setIsRestartingBackend] = useState(false);
  const [isRestartingFrontend, setIsRestartingFrontend] = useState(false);
  const [isGeneratingIds, setIsGeneratingIds] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'running' | 'stopped'>('checking');
  const [frontendStatus, setFrontendStatus] = useState<'checking' | 'running' | 'stopped'>('checking');
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // 检查服务器状态
  const checkServerStatus = async () => {
    try {
      // 检查后端
      const backendResponse = await fetch('http://localhost:3001/api/questions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      setBackendStatus(backendResponse.ok ? 'running' : 'stopped');
    } catch (error) {
      setBackendStatus('stopped');
    }

    try {
      // 检查前端
      const frontendResponse = await fetch('http://localhost:3000', {
        method: 'GET'
      });
      setFrontendStatus(frontendResponse.ok ? 'running' : 'stopped');
    } catch (error) {
      setFrontendStatus('stopped');
    }
  };

  // 重启后端服务器
  const restartBackend = async () => {
    setIsRestartingBackend(true);
    
    try {
      // 如果后端在线，尝试通过API重启
      if (backendStatus === 'running') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch('http://localhost:3001/api/admin/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            alert('后端重启请求已发送，请等待5-10秒后自动检测状态');
            // 等待重启完成，然后检查状态
            setTimeout(() => {
              checkServerStatus();
              setIsRestartingBackend(false);
            }, 8000);
            return;
          }
        } catch (apiError) {
          clearTimeout(timeoutId);
          console.log('API重启失败，尝试系统级重启');
        }
      }
      
      // 如果API重启失败或后端已离线，尝试系统级重启
      await restartBackendViaSystem();
      
    } catch (error) {
      console.error('重启失败:', error);
      alert('自动重启失败，请手动执行以下命令：\n\ncd server && node index.js');
    } finally {
      setIsRestartingBackend(false);
    }
  };

  // 系统级重启后端
  const restartBackendViaSystem = async () => {
    try {
      // 尝试使用fetch调用一个特殊的重启端点
      // 这个端点会执行系统命令来重启后端
      const response = await fetch('/api/system/restart-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        alert('后端重启命令已执行，请等待5-10秒后自动检测状态');
        setTimeout(() => {
          checkServerStatus();
        }, 8000);
      } else {
        throw new Error('系统重启失败');
      }
    } catch (error) {
      console.error('系统重启失败:', error);
      // 如果系统重启也失败，提供手动重启指导
      const shouldManualRestart = window.confirm(
        '自动重启失败。\n\n是否要打开终端并执行重启命令？\n\n' +
        '这将打开一个新的终端窗口并执行：\n' +
        'cd server && node index.js'
      );
      
      if (shouldManualRestart) {
        // 尝试打开终端（仅在支持的环境中）
        try {
          // 使用window.open打开一个新窗口，显示重启命令
          const restartWindow = window.open('', '_blank');
          if (restartWindow) {
            restartWindow.document.write(`
              <html>
                <head><title>重启后端服务器</title></head>
                <body style="font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff;">
                  <h2>请在新终端中执行以下命令：</h2>
                  <div style="background: #333; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <code>cd server && node index.js</code>
                  </div>
                  <p>执行完成后，请返回此页面并点击"刷新状态"按钮。</p>
                  <button onclick="window.close()" style="padding: 10px 20px; background: #007acc; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    关闭此窗口
                  </button>
                </body>
              </html>
            `);
          }
        } catch (e) {
          console.error('无法打开重启指导窗口:', e);
        }
      }
    }
  };

  // 重启前端服务器
  const restartFrontend = async () => {
    setIsRestartingFrontend(true);
    try {
      // 这里需要调用一个重启前端的API
      const response = await fetch('http://localhost:3001/api/admin/restart-frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // 等待重启完成
        setTimeout(() => {
          checkServerStatus();
          setIsRestartingFrontend(false);
        }, 5000);
      } else {
        setIsRestartingFrontend(false);
        alert('重启前端失败，请手动重启');
      }
    } catch (error) {
      setIsRestartingFrontend(false);
      alert('无法连接到后端服务器，请手动重启前端');
    }
  };

  // 为现有题目生成题目ID
  const generateQuestionIds = async () => {
    setIsGeneratingIds(true);
    try {
      const response = await fetch('http://localhost:3001/api/admin/generate-question-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        // 刷新页面以显示新的题目ID
        window.location.reload();
      } else {
        alert('生成题目ID失败');
      }
    } catch (error) {
      alert('无法连接到后端服务器');
    } finally {
      setIsGeneratingIds(false);
    }
  };

  // 组件加载时检查状态
  useEffect(() => {
    checkServerStatus();
    
    // 每10秒自动检查一次状态
    statusCheckInterval.current = setInterval(() => {
      checkServerStatus();
      setLastCheckTime(new Date());
    }, 10000);

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600';
      case 'stopped': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'stopped': return '已停止';
      default: return '检查中...';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Server className="h-6 w-6 mr-2" />
            服务器管理
          </h1>
        </div>

        <div className="p-6">
          {/* 服务器状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 后端服务器状态 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  后端服务器
                </h3>
                <span className={`text-sm font-medium ${getStatusColor(backendStatus)}`}>
                  {getStatusText(backendStatus)}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                <p>端口: 3001</p>
                <p>API地址: http://localhost:3001</p>
              </div>
              <button
                onClick={restartBackend}
                disabled={isRestartingBackend}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
                  isRestartingBackend
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isRestartingBackend ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    重启中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重启后端
                  </>
                )}
              </button>
            </div>

            {/* 前端服务器状态 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  前端服务器
                </h3>
                <span className={`text-sm font-medium ${getStatusColor(frontendStatus)}`}>
                  {getStatusText(frontendStatus)}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                <p>端口: 3000</p>
                <p>访问地址: http://localhost:3000</p>
              </div>
              <button
                onClick={restartFrontend}
                disabled={isRestartingFrontend}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
                  isRestartingFrontend
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isRestartingFrontend ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    重启中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重启前端
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 状态监控信息 */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-sm text-blue-800">
                  最后检查时间: {lastCheckTime.toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <div className={`w-2 h-2 rounded-full mr-2 ${backendStatus === 'running' ? 'bg-green-500' : backendStatus === 'stopped' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-xs text-gray-600">自动检测已启用</span>
                </div>
                <button
                  onClick={checkServerStatus}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  立即检查
                </button>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-4">
            
            <button
              onClick={generateQuestionIds}
              disabled={isGeneratingIds}
              className={`flex items-center px-4 py-2 rounded-md ${
                isGeneratingIds
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {isGeneratingIds ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  生成题目ID
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                restartBackend();
                setTimeout(() => restartFrontend(), 2000);
              }}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Play className="h-4 w-4 mr-2" />
              重启所有服务
            </button>
          </div>

          {/* 手动重启说明 */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">手动重启说明</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>重启后端：</strong>在终端中进入 server 目录，运行 <code className="bg-yellow-100 px-1 rounded">node index.js</code></p>
              <p><strong>重启前端：</strong>在终端中进入 client 目录，运行 <code className="bg-yellow-100 px-1 rounded">npm start</code></p>
              <p><strong>一键重启：</strong>在项目根目录运行 <code className="bg-yellow-100 px-1 rounded">npm run dev</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
