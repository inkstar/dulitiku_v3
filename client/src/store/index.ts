import { create } from 'zustand';
import { Question, Paper } from '../types';

interface AppState {
  questions: Question[];
  papers: Paper[];
  selectedQuestions: string[];
  loading: boolean;
  setQuestions: (questions: Question[]) => void;
  setPapers: (papers: Paper[]) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (question: Question) => void;
  removeQuestion: (questionId: string) => void;
  addPaper: (paper: Paper) => void;
  toggleQuestionSelection: (questionId: string) => void;
  clearSelectedQuestions: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  questions: [],
  papers: [],
  selectedQuestions: [],
  loading: false,
  
  setQuestions: (questions) => set({ questions }),
  setPapers: (papers) => set({ papers }),
  
  addQuestion: (question) => set((state) => ({
    questions: [question, ...state.questions]
  })),
  
  removeQuestion: (questionId) => set((state) => ({
    questions: state.questions.filter(q => q.id !== questionId)
  })),
  
  updateQuestion: (updatedQuestion) => set((state) => ({
    questions: state.questions.map(q => 
      q.id === updatedQuestion.id ? updatedQuestion : q
    )
  })),
  
  addPaper: (paper) => set((state) => ({
    papers: [paper, ...state.papers]
  })),
  
  toggleQuestionSelection: (questionId) => set((state) => ({
    selectedQuestions: state.selectedQuestions.includes(questionId)
      ? state.selectedQuestions.filter(id => id !== questionId)
      : [...state.selectedQuestions, questionId]
  })),
  
  clearSelectedQuestions: () => set({ selectedQuestions: [] }),
  
  setLoading: (loading) => set({ loading })
}));
