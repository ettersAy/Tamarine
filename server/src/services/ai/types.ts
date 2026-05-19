export interface ExerciseGenerationParams {
  subject: string;
  question_count: number;
  question_type: 'mcq' | 'short_answer' | 'essay' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  instructions?: string;
}

export interface GeneratedQuestion {
  type: 'mcq' | 'short_answer' | 'essay';
  question_text: string;
  options?: string[];
  correct_answer: string;
  points: number;
}

export interface CorrectionParams {
  question_text: string;
  question_type: string;
  correct_answer: string;
  student_answer: string;
  max_score: number;
}

export interface CorrectionResult {
  is_correct: boolean;
  score: number;
  feedback: string;
}
