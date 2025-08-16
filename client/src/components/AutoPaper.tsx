import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, BookOpen, ChevronDown, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { questionApi, paperApi } from '../services/api';

const AutoPaper: React.FC = () => {
  const navigate = useNavigate();
  const { questions, setQuestions, addPaper } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    grade: '',
    custom_tags: [] as string[],
    question_type: '',
    difficulty: '',
    questionCount: 10
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    // 计算可选的知识点/标签（来自 questions 的 custom_tags 与 knowledge_point 合并去重）
    const tagSet = new Set<string>();
    questions.forEach(q => {
      if (q.custom_tags && q.custom_tags.length > 0) {
        q.custom_tags.forEach(t => tagSet.add(t));
      }
      // 兼容历史数据的 knowledge_point 字段
      if ((q as any).knowledge_point && String((q as any).knowledge_point).trim()) {
        tagSet.add(String((q as any).knowledge_point));
      }
    });
    setAvailableTags(Array.from(tagSet));
  }, [questions]);

  const fetchQuestions = async () => {
    try {
      const response = await questionApi.getAll();
      setQuestions(response.data);
    } catch (error) {
      console.error('获取题目失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 根据条件筛选题目
      let filteredQuestions = questions;
      
      if (formData.grade) {
        filteredQuestions = filteredQuestions.filter(q => q.grade === formData.grade);
      }
      
      if (formData.question_type) {
        filteredQuestions = filteredQuestions.filter(q => q.question_type === formData.question_type);
      }
      
      if (formData.difficulty) {
        filteredQuestions = filteredQuestions.filter(q => q.difficulty === parseInt(formData.difficulty));
      }
      
      if (formData.custom_tags.length > 0) {
        filteredQuestions = filteredQuestions.filter(q => 
          q.custom_tags && formData.custom_tags.some(tag => q.custom_tags.includes(tag))
        );
      }
      
      // 随机选择指定数量的题目
      const selectedQuestions = [];
      const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < Math.min(formData.questionCount, shuffled.length); i++) {
        selectedQuestions.push(shuffled[i].id);
      }
      
      if (selectedQuestions.length === 0) {
        alert('没有找到符合条件的题目，请调整筛选条件');
        setLoading(false);
        return;
      }
      
      // 创建试卷
      const paperData = {
        title: formData.title,
        description: formData.description,
        questionIds: selectedQuestions,
        teacher: '独立老师'
      };
      
      const response = await paperApi.create(paperData);
      addPaper(response.data);
      
      alert(`智能组卷成功！已选择 ${selectedQuestions.length} 道题目`);
      navigate(`/papers/${response.data.id}`);
    } catch (error) {
      console.error('智能组卷失败:', error);
      alert('智能组卷失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div>
      {/* 页面标题 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <Eye className="h-8 w-8 text-green-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">智能组卷</h2>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 试卷信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                试卷标题
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入试卷标题"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                题目数量
              </label>
              <input
                type="number"
                name="questionCount"
                value={formData.questionCount}
                onChange={handleChange}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              试卷描述
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入试卷描述"
            />
          </div>

          {/* 组卷条件 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">组卷条件</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年级
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不限</option>
                  <option value="七年级">七年级</option>
                  <option value="八年级">八年级</option>
                  <option value="九年级">九年级</option>
                  <option value="高一">高一</option>
                  <option value="高二">高二</option>
                  <option value="高三">高三</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  知识点/自定义标签
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTagDropdown(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                  >
                    <span className="text-left truncate">
                      {formData.custom_tags.length > 0
                        ? `已选择 ${formData.custom_tags.length} 个`
                        : '选择知识点/标签'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                  {showTagDropdown && (
                    <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg p-2">
                      {availableTags.length === 0 && (
                        <div className="text-gray-500 text-sm px-2 py-3">暂无可选标签</div>
                      )}
                      {availableTags.map(tag => {
                        const checked = formData.custom_tags.includes(tag);
                        return (
                          <label key={tag} className={`flex items-center px-2 py-2 rounded cursor-pointer hover:bg-gray-50 ${checked ? 'bg-blue-50' : ''}`}>
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={checked}
                              onChange={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  custom_tags: checked
                                    ? prev.custom_tags.filter(t => t !== tag)
                                    : [...prev.custom_tags, tag]
                                }));
                              }}
                            />
                            <span className="flex-1 text-sm text-gray-700">{tag}</span>
                            {checked && <Check className="h-4 w-4 text-blue-600" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目类型
                </label>
                <select
                  name="question_type"
                  value={formData.question_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不限</option>
                  <option value="选择题">选择题</option>
                  <option value="填空题">填空题</option>
                  <option value="解答题">解答题</option>
                  <option value="证明题">证明题</option>
                </select>
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/papers')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:bg-gray-400"
            >
              <Eye className="h-4 w-4 mr-2" />
              {loading ? '组卷中...' : '开始智能组卷'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AutoPaper;
