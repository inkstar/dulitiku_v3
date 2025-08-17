import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import QuestionList from './components/QuestionList';
import QuestionForm from './components/QuestionForm';
import QuestionEdit from './components/QuestionEdit';
import PaperList from './components/PaperList';
import AdminPanel from './components/AdminPanel';
import AutoPaper from './components/AutoPaper';
import ManualPaper from './components/ManualPaper';
import PaperDetail from './components/PaperDetail';
import ApiManagement from './components/ApiManagement';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/questions" element={<QuestionList />} />
          <Route path="/questions/add" element={<QuestionForm />} />
          <Route path="/questions/edit/:id" element={<QuestionEdit />} />
          <Route path="/papers" element={<PaperList />} />
          <Route path="/papers/:id" element={<PaperDetail />} />
          <Route path="/papers/auto" element={<AutoPaper />} />
          <Route path="/papers/manual" element={<ManualPaper />} />
          <Route path="/api-management" element={<ApiManagement />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
