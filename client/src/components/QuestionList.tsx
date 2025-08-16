import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { questionApi } from '../services/api';
import { Question } from '../types';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { renderMarkdownWithLatex } from '../utils/latexRenderer';

const QuestionList: React.FC = () => {
  const { questions, setQuestions, removeQuestion } = useAppStore();
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedCustomTag, setSelectedCustomTag] = useState('');
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [customTagStats, setCustomTagStats] = useState<Array<{tag: string, count: number}>>([]);
  const [gradeStats, setGradeStats] = useState<Array<{tag: string, count: number}>>([]);
  const [difficultyStats, setDifficultyStats] = useState<Array<{tag: string, count: number}>>([]);
  const [typeStats, setTypeStats] = useState<Array<{tag: string, count: number}>>([]);

  // 计算所有标签统计
  const calculateAllTagStats = useCallback(() => {
    // 自定义标签统计
    const customTagCount: Record<string, number> = {};
    const gradeCount: Record<string, number> = {};
    const difficultyCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    
    questions.forEach(question => {
      // 自定义标签
      if (question.custom_tags && question.custom_tags.length > 0) {
        question.custom_tags.forEach(tag => {
          customTagCount[tag] = (customTagCount[tag] || 0) + 1;
        });
      }
      
      // 年级
      if (question.grade) {
        gradeCount[question.grade] = (gradeCount[question.grade] || 0) + 1;
      }
      
      // 难度
      const difficultyText = getDifficultyText(question.difficulty);
      difficultyCount[difficultyText] = (difficultyCount[difficultyText] || 0) + 1;
      
      // 类型
      if (question.question_type) {
        typeCount[question.question_type] = (typeCount[question.question_type] || 0) + 1;
      }
    });
    
    // 转换为数组并排序
    const customStats = Object.entries(customTagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
    
    const gradeOrder = ['七年级','八年级','九年级','高一','高二','高三'];
    const gradeStats = Object.entries(gradeCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => gradeOrder.indexOf(a.tag) - gradeOrder.indexOf(b.tag));
    
    const difficultyStats = Object.entries(difficultyCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
    
    const typeStats = Object.entries(typeCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
    
    setCustomTagStats(customStats);
    setGradeStats(gradeStats);
    setDifficultyStats(difficultyStats);
    setTypeStats(typeStats);
  }, [questions]);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await questionApi.getAll();
      setQuestions(response.data);
    } catch (error) {
      console.error('获取题目失败:', error);
    }
  }, [setQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // 当题目数据更新时，重新计算标签统计
  useEffect(() => {
    calculateAllTagStats();
  }, [calculateAllTagStats]);

  // 筛选逻辑
  useEffect(() => {
    let filtered = questions;

    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.analysis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.custom_tags && q.custom_tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    if (selectedGrade) {
      filtered = filtered.filter(q => q.grade === selectedGrade);
    }

    if (selectedType) {
      filtered = filtered.filter(q => q.question_type === selectedType);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(q => q.difficulty === parseInt(selectedDifficulty));
    }

    if (selectedCustomTag) {
      filtered = filtered.filter(q => 
        q.custom_tags && q.custom_tags.includes(selectedCustomTag)
      );
    }



    setFilteredQuestions(filtered);
  }, [questions, searchTerm, selectedGrade, selectedType, selectedDifficulty, selectedCustomTag]);

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这道题目吗？')) {
      try {
        await questionApi.delete(id);
        removeQuestion(id);
      } catch (error) {
        console.error('删除题目失败:', error);
      }
    }
  };

  const toggleAnswer = (id: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 标签点击筛选功能
  const handleTagClick = (tagType: string, tagValue: string) => {
    switch (tagType) {
      case 'grade':
        setSelectedGrade(selectedGrade === tagValue ? '' : tagValue);
        break;
      case 'question_type':
        setSelectedType(selectedType === tagValue ? '' : tagValue);
        break;
      case 'difficulty':
        const difficultyValue = tagValue === '简单' ? '1' : tagValue === '中等' ? '2' : '3';
        setSelectedDifficulty(selectedDifficulty === difficultyValue ? '' : difficultyValue);
        break;
      case 'custom_tag':
        setSelectedCustomTag(selectedCustomTag === tagValue ? '' : tagValue);
        break;
    }
  };

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

  const grades = ['七年级', '八年级', '九年级', '高一', '高二', '高三'];
  const types = ['选择题', '填空题', '解答题', '证明题'];
  const difficulties = [
    { value: '1', label: '简单' },
    { value: '2', label: '中等' },
    { value: '3', label: '困难' }
  ];

  return (
    <div>
      {/* 页面标题和操作按钮 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">题目管理</h1>
          <Link
            to="/questions/add"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增题目
          </Link>
        </div>
      </div>

      {/* 标签统计区域 */}
      {(customTagStats.length > 0 || gradeStats.length > 0 || difficultyStats.length > 0 || typeStats.length > 0) && (
        <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">标签统计</h3>
            <span className="text-xs text-gray-500">点击标签可筛选题目</span>
          </div>
          
          {/* 自定义标签行 */}
          {customTagStats.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">自定义标签</div>
              <div className="flex flex-wrap gap-2">
                {customTagStats.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      selectedCustomTag === tag 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                    }`}
                    onClick={() => handleTagClick('custom_tag', tag)}
                  >
                    {tag}
                    <span className="ml-1 text-xs opacity-75">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 年级行 */}
          {gradeStats.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">年级</div>
              <div className="flex flex-wrap gap-2">
                {gradeStats.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      selectedGrade === tag 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                    onClick={() => handleTagClick('grade', tag)}
                  >
                    {tag}
                    <span className="ml-1 text-xs opacity-75">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 难度行 */}
          {difficultyStats.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">难度</div>
              <div className="flex flex-wrap gap-2">
                {difficultyStats.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      selectedDifficulty === (tag === '简单' ? '1' : tag === '中等' ? '2' : '3')
                        ? 'bg-green-500 text-white' 
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                    onClick={() => handleTagClick('difficulty', tag)}
                  >
                    {tag}
                    <span className="ml-1 text-xs opacity-75">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 类型行 */}
          {typeStats.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">题目类型</div>
              <div className="flex flex-wrap gap-2">
                {typeStats.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      selectedType === tag 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                    }`}
                    onClick={() => handleTagClick('question_type', tag)}
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

      {/* 搜索和筛选栏 */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜索题目
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="搜索题目..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              年级
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有年级</option>
              {grades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              类型
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有类型</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              难度
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有难度</option>
              {difficulties.map(diff => (
                <option key={diff.value} value={diff.value}>{diff.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              知识点/自定义标签
            </label>
            <select
              value={selectedCustomTag}
              onChange={(e) => setSelectedCustomTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有标签</option>
              {customTagStats.map(({ tag }) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              操作
            </label>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedGrade('');
                setSelectedType('');
                setSelectedDifficulty('');
                setSelectedCustomTag('');
              }}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              清除筛选
            </button>
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            题目列表({filteredQuestions.length})
          </h2>
        </div>



        <div className="divide-y divide-gray-200">
          {filteredQuestions.map((question) => (
            <div key={question.id} className="p-6 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* 题目标签和操作按钮行 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-wrap gap-2">
                      {question.grade && (
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={() => handleTagClick('grade', question.grade)}
                        >
                          {question.grade}
                        </span>
                      )}

                      {question.question_type && (
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200 transition-colors"
                          onClick={() => handleTagClick('question_type', question.question_type)}
                        >
                          {question.question_type}
                        </span>
                      )}
                      {question.custom_tags && question.custom_tags.length > 0 && 
                        question.custom_tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 cursor-pointer hover:bg-orange-200 transition-colors"
                            onClick={() => handleTagClick('custom_tag', tag)}
                          >
                            {tag}
                          </span>
                        ))
                      }
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${getDifficultyColor(question.difficulty)} hover:opacity-80`}
                        onClick={() => handleTagClick('difficulty', getDifficultyText(question.difficulty))}
                      >
                        {getDifficultyText(question.difficulty)}
                      </span>
                    </div>
                    {/* 操作按钮组 */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleAnswer(question.id)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title={showAnswers[question.id] ? '隐藏答案' : '查看答案'}
                      >
                        {showAnswers[question.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <Link
                        to={`/questions/edit/${question.id}`}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 时间信息 */}
                  <div className="text-xs text-gray-500 mb-3 flex items-center">
                    <span>题目ID: {question.question_id || '待生成'}</span>
                    <span className="mx-2">|</span>
                    <span>创建时间: {new Date(question.created_at).toLocaleString('zh-CN')}</span>
                    <span className="mx-2">|</span>
                    <span>修改时间: {new Date(question.updated_at).toLocaleString('zh-CN')}</span>
                    <span className="mx-2">|</span>
                    <span>使用次数: {question.usage_count}</span>
                  </div>

                  {/* 题目内容 */}
                  <div className="mb-3">
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{
                        __html: renderMarkdownWithLatex(question.content || '')
                      }} />
                    </div>
                  </div>



                  {/* 答案（可折叠） */}
                  {showAnswers[question.id] && (
                    <div className="mb-3 p-3 bg-green-50 rounded-md">
                      <div className="font-medium text-green-800 mb-1">答案：</div>
                      <div className="prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{
                          __html: renderMarkdownWithLatex(question.answer || '')
                        }} />
                      </div>
                      {question.analysis && (
                        <>
                          <div className="font-medium text-green-800 mb-1 mt-3">解析：</div>
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{
                              __html: renderMarkdownWithLatex(question.analysis || '')
                            }} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 空占位，右侧不再重复操作按钮 */}
                <div className="ml-4" />
              </div>
            </div>
          ))}
        </div>

        {filteredQuestions.length === 0 && (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无题目</h3>
            <p className="mt-1 text-sm text-gray-500">
              {questions.length === 0 ? '还没有添加任何题目' : '没有找到匹配的题目'}
            </p>
            {questions.length === 0 && (
              <div className="mt-6">
                <Link
                  to="/questions/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一道题目
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionList;
