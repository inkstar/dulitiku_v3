import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, TestTube, Eye, EyeOff, Key, Activity } from 'lucide-react';

interface ApiConfig {
  id: string;
  name: string;
  type: 'mathpix' | 'tencent' | 'baidu' | 'aliyun' | 'xfyun' | 'custom';
  apiKey: string;
  secretKey?: string; // 某些服务需要
  endpoint?: string; // 自定义端点
  enabled: boolean;
  priority: number; // 1-100，数字越小优先级越高
  monthlyQuota?: number; // 月限额
  usedThisMonth?: number; // 本月已用
  description?: string;
}

const API_TYPES = [
  { value: 'mathpix', label: 'Mathpix API', description: '高精度数学公式识别' },
  { value: 'tencent', label: '腾讯云数学公式', description: '免费1000次/月，支持LaTeX' },
  { value: 'baidu', label: '百度智能云公式', description: '免费1000次/月，手写+印刷' },
  { value: 'aliyun', label: '阿里云数学公式', description: '按量付费，高准确率' },
  { value: 'xfyun', label: '讯飞公式识别', description: '题干+公式一体识别' },
  { value: 'custom', label: '自定义API', description: '用户自定义接口' },
];

const ApiManagement: React.FC = () => {
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiConfig | null>(null);
  const [testingApiId, setTestingApiId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});

  // 模拟数据加载
  useEffect(() => {
    const savedApis = localStorage.getItem('ocrApiConfigs');
    if (savedApis) {
      setApis(JSON.parse(savedApis));
    }
  }, []);

  // 保存到本地存储
  const saveApis = (newApis: ApiConfig[]) => {
    setApis(newApis);
    localStorage.setItem('ocrApiConfigs', JSON.stringify(newApis));
  };

  const handleAddApi = (apiData: Omit<ApiConfig, 'id'>) => {
    const newApi: ApiConfig = {
      ...apiData,
      id: Date.now().toString(),
    };
    saveApis([...apis, newApi]);
    setIsAddModalOpen(false);
  };

  const handleEditApi = (apiData: ApiConfig) => {
    const updatedApis = apis.map(api => 
      api.id === apiData.id ? apiData : api
    );
    saveApis(updatedApis);
    setEditingApi(null);
  };

  const handleDeleteApi = (id: string) => {
    if (window.confirm('确定要删除这个API配置吗？')) {
      const updatedApis = apis.filter(api => api.id !== id);
      saveApis(updatedApis);
    }
  };

  const handleToggleEnabled = (id: string) => {
    const updatedApis = apis.map(api => 
      api.id === id ? { ...api, enabled: !api.enabled } : api
    );
    saveApis(updatedApis);
  };

  const handleTestApi = async (api: ApiConfig) => {
    setTestingApiId(api.id);
    
    try {
      // 动态导入mathOcrService来避免循环依赖
      const { mathOcrService } = await import('../services/mathOcrApi');
      const result = await mathOcrService.testApiConfig(api);
      
      if (result.success) {
        window.alert(`✅ ${result.message}`);
      } else {
        window.alert(`❌ ${result.message}`);
      }
    } catch (error) {
      window.alert(`❌ API ${api.name} 测试失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setTestingApiId(null);
    }
  };

  const toggleApiKeyVisibility = (apiId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [apiId]: !prev[apiId]
    }));
  };

  const getApiTypeInfo = (type: string) => {
    return API_TYPES.find(t => t.value === type) || API_TYPES[API_TYPES.length - 1];
  };

  const sortedApis = [...apis].sort((a, b) => a.priority - b.priority);

  return (
    <div>
      {/* 页面标题 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">API管理</h2>
              <p className="text-sm text-gray-600">配置图片识别API，提升数学公式识别准确度</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加API
          </button>
        </div>
      </div>

      {/* API列表 */}
      <div className="bg-white shadow rounded-lg p-6">
        {sortedApis.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无API配置</h3>
            <p className="text-gray-600 mb-4">
              添加数学公式识别API以提升图片识别效果
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加第一个API
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedApis.map((api) => {
              const typeInfo = getApiTypeInfo(api.type);
              const isKeyVisible = showApiKey[api.id];
              
              return (
                <div key={api.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-3 ${
                          api.enabled ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{api.name}</h4>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {typeInfo.label}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              优先级: {api.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{typeInfo.description}</p>
                          {api.description && (
                            <p className="text-sm text-gray-500 mt-1">{api.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* 使用量显示 */}
                      {api.monthlyQuota && (
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            本月使用: {api.usedThisMonth || 0} / {api.monthlyQuota}
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, ((api.usedThisMonth || 0) / api.monthlyQuota) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTestApi(api)}
                        disabled={testingApiId === api.id || !api.enabled}
                        className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
                        title="测试API"
                      >
                        {testingApiId === api.id ? (
                          <Activity className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => setEditingApi(api)}
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleToggleEnabled(api.id)}
                        className={`p-2 ${api.enabled ? 'text-green-600' : 'text-gray-400'}`}
                        title={api.enabled ? '禁用' : '启用'}
                      >
                        <Activity className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteApi(api.id)}
                        className="p-2 text-gray-600 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* API密钥显示 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Key className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600 mr-2">API Key:</span>
                        <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mr-2">
                          {isKeyVisible ? api.apiKey : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleApiKeyVisibility(api.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {api.endpoint && (
                        <div className="flex items-center">
                          <span className="text-gray-600 mr-2">端点:</span>
                          <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {api.endpoint}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加/编辑API模态框 */}
      {(isAddModalOpen || editingApi) && (
        <ApiConfigModal
          api={editingApi}
          onSave={(apiData) => {
            if (editingApi) {
              handleEditApi(apiData as ApiConfig);
            } else {
              handleAddApi(apiData);
            }
          }}
          onCancel={() => {
            setIsAddModalOpen(false);
            setEditingApi(null);
          }}
        />
      )}
    </div>
  );
};

// API配置模态框组件
interface ApiConfigModalProps {
  api?: ApiConfig | null;
  onSave: (apiData: ApiConfig | Omit<ApiConfig, 'id'>) => void;
  onCancel: () => void;
}

const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ api, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<ApiConfig, 'id'>>({
    name: api?.name || '',
    type: api?.type || 'tencent',
    apiKey: api?.apiKey || '',
    secretKey: api?.secretKey || '',
    endpoint: api?.endpoint || '',
    enabled: api?.enabled ?? true,
    priority: api?.priority || 10,
    monthlyQuota: api?.monthlyQuota || 1000,
    usedThisMonth: api?.usedThisMonth || 0,
    description: api?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.apiKey.trim()) {
      window.alert('请填写API名称和密钥');
      return;
    }

    if (api) {
      onSave({ ...api, ...formData });
    } else {
      onSave(formData);
    }
  };

  const selectedType = API_TYPES.find(t => t.value === formData.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {api ? '编辑API配置' : '添加API配置'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="为这个API配置起个名字"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API类型 *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ApiConfig['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {API_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {selectedType && (
                  <p className="text-xs text-gray-500 mt-1">{selectedType.description}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key *
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入API密钥"
              />
            </div>

            {(formData.type === 'tencent' || formData.type === 'baidu') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入Secret Key（某些服务需要）"
                />
              </div>
            )}

            {formData.type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API端点
                </label>
                <input
                  type="url"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.example.com/ocr"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优先级 (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">数字越小优先级越高</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月限额
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.monthlyQuota}
                  onChange={(e) => setFormData({ ...formData, monthlyQuota: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">启用此API</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="可选的描述信息"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {api ? '保存' : '添加'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApiManagement;
