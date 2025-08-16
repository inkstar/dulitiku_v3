import axios from 'axios';
import { Question, Paper, QuestionFormData, PaperFormData } from '../types';

// 优先使用环境变量；开发环境默认指向 3001；生产默认同源 /api
let API_BASE_URL: string;
if (process.env.REACT_APP_API_BASE_URL) {
  API_BASE_URL = process.env.REACT_APP_API_BASE_URL as string;
} else if (typeof window !== 'undefined' && (window.location.port === '3000' || process.env.NODE_ENV === 'development')) {
  API_BASE_URL = 'http://localhost:3001/api';
} else if (typeof window !== 'undefined') {
  API_BASE_URL = `${window.location.origin}/api`;
} else {
  API_BASE_URL = 'http://localhost:3001/api';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const questionApi = {
  getAll: () => api.get<Question[]>('/questions'),
  create: (data: QuestionFormData) => api.post('/questions', data),
  update: (id: string, data: QuestionFormData) => api.put(`/questions/${id}`, data),
  delete: (id: string) => api.delete(`/questions/${id}`),
};

export const paperApi = {
  getAll: () => api.get<Paper[]>('/papers'),
  create: (data: PaperFormData) => api.post('/papers', data),
  getById: (id: string) => api.get(`/papers/${id}`),
  createAuto: (data: any) => api.post('/papers/auto', data),
};

export default api;
