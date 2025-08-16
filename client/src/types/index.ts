export interface Question {
  id: string;
  question_id: string;
  title: string;
  content: string;
  answer: string;
  analysis: string;
  grade: string;
  question_type: string;
  difficulty: number;
  usage_count: number;
  custom_tags: string[]; // 新增：自定义标签
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at?: string;
  question_count?: number;
}

export interface PaperDetail extends Paper {
  questions: Question[];
}

export interface QuestionFormData {
  title: string;
  content: string;
  answer: string;
  analysis: string;
  grade: string;
  question_type: string;
  difficulty: number;
  custom_tags: string[]; // 新增：自定义标签
}

export interface PaperFormData {
  title: string;
  description: string;
  questionIds: string[];
}

export interface AutoPaperFormData {
  title: string;
  description: string;
  grade: string;
  custom_tags: string[];
  question_type: string;
  difficulty: number;
  question_count: number;
}
