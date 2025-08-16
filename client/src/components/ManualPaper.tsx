import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, BookOpen, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { questionApi, paperApi } from '../services/api';
import { renderMarkdownWithLatex } from '../utils/latexRenderer';

const ManualPaper: React.FC = () => {
  const navigate = useNavigate();
  const { questions, setQuestions, selectedQuestions, toggleQuestionSelection, clearSelectedQuestions, addPaper } = useAppStore();
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [filters, setFilters] = useState({
    grade: '',
    question_type: '',
    difficulty: '',
    tag: ''
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [customTagStats, setCustomTagStats] = useState<Array<{tag: string, count: number}>>([]);
  const [gradeStats, setGradeStats] = useState<Array<{tag: string, count: number}>>([]);
  const [difficultyStats, setDifficultyStats] = useState<Array<{tag: string, count: number}>>([]);
  const [typeStats, setTypeStats] = useState<Array<{tag: string, count: number}>>([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    const tagSet = new Set<string>();
    questions.forEach(q => {
      if (q.custom_tags && q.custom_tags.length > 0) {
        q.custom_tags.forEach(t => tagSet.add(t));
      }
      if ((q as any).knowledge_point && String((q as any).knowledge_point).trim()) {
        tagSet.add(String((q as any).knowledge_point));
      }
    });
    setAvailableTags(Array.from(tagSet));
  }, [questions]);

  const getDifficultyText = (difficulty: number) => {
    switch (difficulty) {
      case 1: return '简单';
      case 2: return '中等';
      case 3: return '困难';
      default: return '未知';
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateAllTagStats = useCallback(() => {
    const customTagCount: Record<string, number> = {};
    const gradeCount: Record<string, number> = {};
    const difficultyCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};

    questions.forEach(q => {
      if (q.custom_tags && q.custom_tags.length > 0) {
        q.custom_tags.forEach(tag => {
          customTagCount[tag] = (customTagCount[tag] || 0) + 1;
        });
      }
      if (q.grade) {
        gradeCount[q.grade] = (gradeCount[q.grade] || 0) + 1;
      }
      const diffText = getDifficultyText(q.difficulty);
      difficultyCount[diffText] = (difficultyCount[diffText] || 0) + 1;
      if (q.question_type) {
        typeCount[q.question_type] = (typeCount[q.question_type] || 0) + 1;
      }
    });

    const toSortedArray = (obj: Record<string, number>) => Object.entries(obj)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
    const gradeOrder = ['七年级','八年级','九年级','高一','高二','高三'];

    setCustomTagStats(toSortedArray(customTagCount));
    setGradeStats(Object.entries(gradeCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => gradeOrder.indexOf(a.tag) - gradeOrder.indexOf(b.tag))
    );
    setDifficultyStats(toSortedArray(difficultyCount));
    setTypeStats(toSortedArray(typeCount));
  }, [questions]);

  useEffect(() => {
    calculateAllTagStats();
  }, [calculateAllTagStats]);

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
    if (selectedQuestions.length === 0) {
      alert('请至少选择一道题目');
      return;
    }
    
    try {
      // 创建试卷
      const paperData = {
        title: formData.title,
        description: formData.description,
        questionIds: selectedQuestions
      };
      
      const response = await paperApi.create(paperData);
      addPaper(response.data);
      
      alert(`人工组卷成功！已选择 ${selectedQuestions.length} 道题目`);
      clearSelectedQuestions();
      navigate(`/papers/${response.data.id}`);
    } catch (error) {
      console.error('人工组卷失败:', error);
      alert('人工组卷失败，请重试');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredQuestions = questions.filter(q => {
    const matchGrade = !filters.grade || q.grade === filters.grade;
    const matchType = !filters.question_type || q.question_type === filters.question_type;
    const matchDiff = !filters.difficulty || q.difficulty === parseInt(filters.difficulty);
    const matchTag = !filters.tag || (q.custom_tags && q.custom_tags.includes(filters.tag)) || (q as any).knowledge_point === filters.tag;
    return matchGrade && matchType && matchDiff && matchTag;
  });

  return (
    <div>
      {/* 页面标题 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <FileText className="h-8 w-8 text-purple-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">人工组卷</h2>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {/* 标签统计区域（照题目管理） */}
        {(customTagStats.length > 0 || gradeStats.length > 0 || difficultyStats.length > 0 || typeStats.length > 0) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            {/* 自定义标签 */}
            {customTagStats.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">自定义标签</div>
                <div className="flex flex-wrap gap-2">
                  {customTagStats.map(({ tag, count }) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        filters.tag === tag ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                      }`}
                      onClick={() => setFilters(prev => ({ ...prev, tag: prev.tag === tag ? '' : tag }))}
                    >
                      {tag}
                      <span className="ml-1 text-xs opacity-75">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 年级 */}
            {gradeStats.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">年级</div>
                <div className="flex flex-wrap gap-2">
                  {gradeStats.map(({ tag, count }) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        filters.grade === tag ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                      onClick={() => setFilters(prev => ({ ...prev, grade: prev.grade === tag ? '' : tag }))}
                    >
                      {tag}
                      <span className="ml-1 text-xs opacity-75">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 难度 */}
            {difficultyStats.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">难度</div>
                <div className="flex flex-wrap gap-2">
                  {difficultyStats.map(({ tag, count }) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        (filters.difficulty === (tag === '简单' ? '1' : tag === '中等' ? '2' : '3')) ? 'bg-green-500 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                      onClick={() => setFilters(prev => ({ ...prev, difficulty: (prev.difficulty === (tag === '简单' ? '1' : tag === '中等' ? '2' : '3')) ? '' : (tag === '简单' ? '1' : tag === '中等' ? '2' : '3') }))}
                    >
                      {tag}
                      <span className="ml-1 text-xs opacity-75">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 类型 */}
            {typeStats.length > 0 && (
              <div className="mb-1">
                <div className="text-xs text-gray-500 mb-1">题目类型</div>
                <div className="flex flex-wrap gap-2">
                  {typeStats.map(({ tag, count }) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        filters.question_type === tag ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      }`}
                      onClick={() => setFilters(prev => ({ ...prev, question_type: prev.question_type === tag ? '' : tag }))}
                    >
                      {tag}
                      <span className="ml-1 text-xs opacity-75">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
                已选题目数
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                <span className="text-lg font-semibold text-blue-600">{selectedQuestions.length}</span>
                <span className="text-gray-500 ml-2">道题目</span>
              </div>
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

          {/* 筛选条件 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">筛选条件</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">年级（不限）</option>
                <option value="七年级">七年级</option>
                <option value="八年级">八年级</option>
                <option value="九年级">九年级</option>
                <option value="高一">高一</option>
                <option value="高二">高二</option>
                <option value="高三">高三</option>
              </select>

              <select
                value={filters.question_type}
                onChange={(e) => setFilters(prev => ({ ...prev, question_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">题型（不限）</option>
                <option value="选择题">选择题</option>
                <option value="填空题">填空题</option>
                <option value="解答题">解答题</option>
                <option value="证明题">证明题</option>
              </select>

              <select
                value={filters.difficulty}
                onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">难度（不限）</option>
                <option value="1">简单</option>
                <option value="2">中等</option>
                <option value="3">困难</option>
              </select>

              <select
                value={filters.tag}
                onChange={(e) => setFilters(prev => ({ ...prev, tag: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">知识点/标签（不限）</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 题目选择区域 */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">选择题目</h3>
              <button
                type="button"
                onClick={clearSelectedQuestions}
                className="text-sm text-red-600 hover:text-red-700"
              >
                清空选择
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 题目列表 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">题目列表</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedQuestions.includes(question.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleQuestionSelection(question.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">{question.title}</h5>
                          <div className="text-gray-700 text-xs mt-1 prose prose-sm max-w-none line-clamp-2" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLatex(question.content || '') }} />
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded mr-2">{question.grade || '未分类'}</span>
                            <span className="bg-gray-100 px-2 py-1 rounded mr-2">
                              {question.custom_tags && question.custom_tags.length > 0 ? question.custom_tags.join(', ') : '未分类'}
                            </span>
                            <span>难度: {question.difficulty}</span>
                          </div>
                        </div>
                        {selectedQuestions.includes(question.id) && (
                          <Check className="h-5 w-5 text-blue-600 ml-2" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {questions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>暂无题目数据</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 已选题目预览 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">已选题目预览</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedQuestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>请从左侧选择题目</p>
                    </div>
                  ) : (
                    questions
                      .filter(q => selectedQuestions.includes(q.id))
                      .map((question, index) => (
                        <div key={question.id} className="bg-white p-3 rounded-lg border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded mr-2">
                                  {index + 1}
                                </span>
                                <h5 className="font-medium text-gray-900 text-sm">{question.title}</h5>
                              </div>
                              <div className="text-gray-700 text-xs prose prose-sm max-w-none line-clamp-2" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLatex(question.content || '') }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleQuestionSelection(question.id)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
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
              type="button"
              onClick={() => {
                alert('已加入试题框，可继续筛选添加题目');
                // 可选：清空筛选（不清空已选题）
                setFilters({ grade: '', question_type: '', difficulty: '', tag: '' });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              加入试题框
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              创建试卷
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualPaper;
