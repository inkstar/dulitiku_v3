import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Plus, FileText, Settings, Home, Eye, List, Server } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '仪表盘', icon: Home },
    { path: '/questions', label: '题目管理', icon: BookOpen },
    { path: '/questions/add', label: '新增题目', icon: Plus },
    { path: '/papers/auto', label: '智能组卷', icon: Eye },
    { path: '/papers/manual', label: '人工组卷', icon: FileText },
    { path: '/papers', label: '试卷管理', icon: List },
    { path: '/admin', label: '服务器管理', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* 侧边栏 */}
        <div className="w-64 bg-gray-200 shadow-lg min-h-screen">
          {/* 标题区域 */}
          <div className="px-6 py-6 bg-blue-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">数学题库</h1>
              <p className="text-blue-100 text-sm mt-1">Math Question Bank</p>
            </div>
          </div>
          
          {/* 白色背景区域 */}
          <div className="bg-white">
            <nav className="mt-6 px-3">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-sm border-l-4 border-blue-400'
                          : 'text-gray-700 hover:bg-gray-300 hover:text-gray-900 hover:shadow-sm'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                      }`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 bg-gray-100 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
