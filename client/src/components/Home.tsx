import React, { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { questionApi, paperApi } from '../services/api';
import { BookOpen, FileText, Plus, TrendingUp, Eye, Clock } from 'lucide-react';

const Home: React.FC = () => {
  const { questions, papers, setQuestions, setPapers } = useAppStore();

  const fetchData = useCallback(async () => {
    try {
      const [questionsRes, papersRes] = await Promise.all([
        questionApi.getAll(),
        paperApi.getAll()
      ]);
      setQuestions(questionsRes.data);
      setPapers(papersRes.data);
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  }, [setQuestions, setPapers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = [
    {
      name: '总题目数',
      value: questions.length,
      icon: BookOpen,
      color: 'bg-blue-400',
      link: '/questions'
    },
    {
      name: '总试卷数',
      value: papers.length,
      icon: FileText,
      color: 'bg-green-400',
      link: '/papers'
    },
    {
      name: '本周新增题目',
      value: questions.filter(q => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(q.created_at) > weekAgo;
      }).length,
      icon: TrendingUp,
      color: 'bg-orange-400',
      link: '/questions'
    },
    {
      name: '本周新增试卷',
      value: papers.filter(p => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(p.created_at) > weekAgo;
      }).length,
      icon: Clock,
      color: 'bg-purple-400',
      link: '/papers'
    }
  ];

  const quickActions = [
    {
      name: '新增题目',
      description: '添加新的数学题目到题库',
      icon: Plus,
      link: '/questions/add',
      color: 'bg-blue-400 hover:bg-blue-500'
    },
    {
      name: '智能组卷',
      description: '根据条件自动生成试卷',
      icon: Eye,
      link: '/papers/auto',
      color: 'bg-green-400 hover:bg-green-500'
    },
    {
      name: '人工组卷',
      description: '手动选择题目组成试卷',
      link: '/papers/manual',
      color: 'bg-purple-400 hover:bg-purple-500'
    },
    {
      name: '题目管理',
      description: '查看和管理所有题目',
      icon: BookOpen,
      link: '/questions',
      color: 'bg-orange-400 hover:bg-orange-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* 欢迎信息 */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">欢迎使用数学题库系统</h1>
        <p className="text-gray-600 text-lg">
          为独立老师打造的智能题库平台，让教学更高效
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.link}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                to={action.link}
                className={`${action.color} text-white rounded-lg p-6 hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-center mb-4">
                  {Icon && <Icon className="h-8 w-8 mr-3" />}
                  <h3 className="text-lg font-semibold">{action.name}</h3>
                </div>
                <p className="text-blue-100">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;
