export interface Exercise {
  id: string;
  subject: string;
  question_count: number;
  question_type: 'mcq' | 'short_answer' | 'essay' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  instructions: string | null;
  status: 'draft' | 'generating' | 'generated' | 'ready';
  created_at: string;
  updated_at: string;
  question_count_actual?: number;
  submission_count?: number;
}

export interface Question {
  id: string;
  exercise_id: string;
  order_index: number;
  type: 'mcq' | 'short_answer' | 'essay';
  question_text: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  created_at: string;
}

export interface ShareLink {
  id: string;
  exercise_id: string;
  code: string;
  is_active: number;
  created_at: string;
  expires_at: string | null;
}

export interface Submission {
  id: string;
  exercise_id: string;
  share_link_id: string;
  student_name: string | null;
  status: 'submitted' | 'correcting' | 'corrected';
  total_score: number | null;
  max_score: number | null;
  submitted_at: string;
  corrected_at: string | null;
  answer_count?: number;
}

export interface Answer {
  id: string;
  submission_id: string;
  question_id: string;
  student_answer: string | null;
  is_correct: number | null;
  score: number | null;
  max_score: number | null;
  feedback: string | null;
  question_text?: string;
  type?: string;
  options?: string[] | null;
  correct_answer?: string | null;
  order_index?: number;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
  exercise_count?: number;
}

export interface ExerciseWithDetails extends Exercise {
  questions: Question[];
  shareLinks: ShareLink[];
}

export interface SubmissionWithAnswers extends Submission {
  answers: Answer[];
}

export interface GeneratedQuestion {
  type: 'mcq' | 'short_answer' | 'essay';
  question_text: string;
  options?: string[];
  correct_answer: string;
  points: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
