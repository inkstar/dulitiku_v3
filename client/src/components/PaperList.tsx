import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paperApi } from '../services/api';
import { useAppStore } from '../store';
import { Plus, FileText, Calendar } from 'lucide-react';

const PaperList: React.FC = () => {
  const { papers, setPapers } = useAppStore();

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const response = await paperApi.getAll();
      setPapers(response.data);
    } catch (error) {
      console.error('获取试卷失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">试卷管理</h1>
        <div className="flex space-x-4">
          <Link
            to="/papers/manual"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建试卷
          </Link>
          <Link
            to="/papers/auto"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            智能组卷
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.map((paper) => (
          <div key={paper.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{paper.title}</h3>
              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                试卷
              </span>
            </div>
            
            {paper.description && (
              <p className="text-gray-600 mb-4">{paper.description}</p>
            )}
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>题目数量: {paper.question_count ?? 0}</span>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(paper.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-4">
              <Link to={`/papers/${paper.id}`} className="text-blue-600 hover:text-blue-800 text-sm">预览</Link>
            </div>
          </div>
        ))}
      </div>

      {papers.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无试卷</h3>
          <p className="text-gray-500">开始创建您的第一份试卷吧！</p>
        </div>
      )}
    </div>
  );
};

export default PaperList;
