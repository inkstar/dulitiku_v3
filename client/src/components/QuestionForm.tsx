import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionApi } from '../services/api';
import { QuestionFormData } from '../types';
import { useAppStore } from '../store';
import MDEditor from '@uiw/react-md-editor';
import { Plus, FileText, Eye, Copy, X, Upload } from 'lucide-react';
import { parseLatexContent as parseLatex, getLatexExample, getGaussianIntegralExample } from '../utils/latexParser';
import ImageUpload from './ImageUpload';

const QuestionForm: React.FC = () => {
  const navigate = useNavigate();
  const addQuestion = useAppStore((state) => state.addQuestion);
  const [inputMode, setInputMode] = useState<'manual' | 'latex' | 'image'>('manual');
  const [latexContent, setLatexContent] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');
  const [formData, setFormData] = useState<QuestionFormData>({
    title: '',
    content: '',
    answer: '',
    analysis: '',
    grade: '',
    question_type: '',
    difficulty: 1,
    custom_tags: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await questionApi.create(formData);
      addQuestion(response.data);
      navigate('/questions');
    } catch (error) {
      console.error('创建题目失败:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'difficulty' ? parseInt(value) : value
    }));
  };

  const handleMarkdownChange = (field: 'content' | 'answer' | 'analysis') => (value?: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value || ''
    }));
  };

  // 自定义标签功能
  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const newTag = customTagInput.trim();
      if (formData.custom_tags.includes(newTag)) {
        alert('请勿重复添加');
        return;
      }
      setFormData(prev => ({
        ...prev,
        custom_tags: [...prev.custom_tags, newTag]
      }));
      setCustomTagInput('');
    }
  };

  const handleRemoveCustomTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      custom_tags: prev.custom_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 图片识别结果处理
  const handleImageRecognized = (result: { content: string; answer: string; analysis: string; tags?: string[] }) => {
    setFormData(prev => ({
      ...prev,
      content: result.content,
      answer: result.answer,
      analysis: result.analysis,
      custom_tags: result.tags && result.tags.length
        ? Array.from(new Set([...(prev.custom_tags || []), ...result.tags]))
        : prev.custom_tags
    }));
    // 识别后不再自动切换到手动模式，保留在图片识别界面，便于对照与二次编辑
  };

  // LaTeX智能识别功能
  const handleParseLatex = () => {
    if (!latexContent.trim()) {
      alert('请先输入LaTeX内容');
      return;
    }

    try {
      const parsed = parseLatex(latexContent);
      
      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        content: parsed.content || prev.content,
        answer: parsed.answer || prev.answer,
        analysis: parsed.analysis || prev.analysis
      }));

      alert('LaTeX解析完成！请检查并完善信息。');
    } catch (error) {
      alert('LaTeX解析失败，请检查格式是否正确。');
    }
  };

  const loadExample = () => {
    setLatexContent(getLatexExample());
  };

  return (
    <div>
      {/* 页面标题 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <Plus className="h-8 w-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">新增题目</h2>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">

        {/* 输入模式选择 */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`px-4 py-2 rounded-md font-medium ${
                inputMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              手动输入
            </button>
            <button
              type="button"
              onClick={() => setInputMode('latex')}
              className={`px-4 py-2 rounded-md font-medium ${
                inputMode === 'latex'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="h-4 w-4 inline mr-2" />
              LaTeX智能识别
            </button>
            <button
              type="button"
              onClick={() => setInputMode('image')}
              className={`px-4 py-2 rounded-md font-medium ${
                inputMode === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              图片识别
            </button>
          </div>
        </div>

        {inputMode === 'latex' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">LaTeX智能识别</h3>
              <button
                type="button"
                onClick={loadExample}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Copy className="h-3 w-3 mr-1" />
                加载示例
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              粘贴LaTeX文档内容，系统将自动提取题目、答案、解析和知识点
            </p>
            <textarea
              value={latexContent}
              onChange={(e) => setLatexContent(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="请粘贴LaTeX文档内容，例如：&#10;\item 解方程：$2x^2 - 5x + 3 = 0$&#10;\textbf{答案：} $x = 1$ 或 $x = \dfrac{3}{2}$&#10;\textbf{解析：} 使用求根公式..."
            />
            <div className="flex space-x-3 mt-3">
              <button
                type="button"
                onClick={handleParseLatex}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                开始解析
              </button>
              <button
                type="button"
                onClick={() => setLatexContent('')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                清空
              </button>
            </div>
          </div>
        )}

        {/* 图片识别模式 */}
        {inputMode === 'image' && (
          <div className="mb-6">
            <ImageUpload onRecognized={handleImageRecognized} />
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
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
                <option value="">请选择年级</option>
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
                题目类型
              </label>
              <select
                name="question_type"
                value={formData.question_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择题目类型</option>
                <option value="选择题">选择题</option>
                <option value="填空题">填空题</option>
                <option value="解答题">解答题</option>
                <option value="证明题">证明题</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                难度等级
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>简单</option>
                <option value={2}>中等</option>
                <option value={3}>困难</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自定义标签
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyPress={handleAddCustomTag}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入标签后按回车添加"
                />
                {formData.custom_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.custom_tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 题目内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题目内容
            </label>
            <div data-color-mode="light">
              <MDEditor
                value={formData.content}
                onChange={handleMarkdownChange('content')}
                height={200}
                preview="edit"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              支持Markdown语法和LaTeX数学公式，如：$x^2 + y^2 = z^2$
            </p>
          </div>

          {/* 答案 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              答案
            </label>
            <div data-color-mode="light">
              <MDEditor
                value={formData.answer}
                onChange={handleMarkdownChange('answer')}
                height={150}
                preview="edit"
              />
            </div>
          </div>

          {/* 解析 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              解析
            </label>
            <div data-color-mode="light">
              <MDEditor
                value={formData.analysis}
                onChange={handleMarkdownChange('analysis')}
                height={150}
                preview="edit"
              />
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/questions')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              保存题目
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionForm;
