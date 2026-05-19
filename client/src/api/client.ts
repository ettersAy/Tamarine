import type {
  Exercise,
  ExerciseWithDetails,
  GeneratedQuestion,
  Question,
  ShareLink,
  Submission,
  SubmissionWithAnswers,
  Subject,
  PaginatedResponse,
} from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Exercises
  listExercises(params?: URLSearchParams): Promise<PaginatedResponse<Exercise>> {
    const query = params ? `?${params.toString()}` : '';
    return request(`/exercises${query}`);
  },

  getExercise(id: string): Promise<ExerciseWithDetails> {
    return request(`/exercises/${id}`);
  },

  createExercise(data: {
    subject: string;
    question_count: number;
    question_type: string;
    difficulty: string;
    instructions?: string;
    questions: GeneratedQuestion[];
  }): Promise<Exercise> {
    return request('/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateExercise(id: string, data: {
    subject?: string;
    question_type?: string;
    difficulty?: string;
    instructions?: string;
  }): Promise<Exercise> {
    return request(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteExercise(id: string): Promise<{ success: boolean }> {
    return request(`/exercises/${id}`, { method: 'DELETE' });
  },

  generateExercises(data: {
    subject: string;
    question_count: number;
    question_type: string;
    difficulty: string;
    instructions?: string;
  }): Promise<{ questions: GeneratedQuestion[] }> {
    return request('/exercises/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Questions
  updateQuestion(exerciseId: string, questionId: string, data: Partial<Pick<Question, 'question_text' | 'type' | 'options' | 'correct_answer' | 'points'>>): Promise<Question> {
    return request(`/exercises/${exerciseId}/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  addQuestion(exerciseId: string, data: Pick<Question, 'question_text' | 'type' | 'correct_answer' | 'points'> & { options?: string[] }): Promise<Question> {
    return request(`/exercises/${exerciseId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion(exerciseId: string, questionId: string): Promise<{ success: boolean }> {
    return request(`/exercises/${exerciseId}/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  // Share links
  createShareLink(exerciseId: string): Promise<ShareLink> {
    return request('/links', {
      method: 'POST',
      body: JSON.stringify({ exercise_id: exerciseId }),
    });
  },

  getShareLink(code: string): Promise<any> {
    return request(`/links/${code}`);
  },

  toggleShareLink(code: string): Promise<{ code: string; is_active: number }> {
    return request(`/links/${code}/toggle`, { method: 'PUT' });
  },

  // Submissions
  submitAnswers(data: { share_code: string; student_name?: string; answers: { question_id: string; student_answer: string }[] }): Promise<Submission> {
    return request('/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getExerciseSubmissions(exerciseId: string): Promise<Submission[]> {
    return request(`/submissions/exercise/${exerciseId}`);
  },

  getSubmission(id: string): Promise<SubmissionWithAnswers> {
    return request(`/submissions/${id}`);
  },

  correctSubmission(id: string): Promise<Submission> {
    return request(`/submissions/${id}/correct`, { method: 'POST' });
  },

  // Subjects
  listSubjects(): Promise<Subject[]> {
    return request('/subjects');
  },

  createSubject(name: string): Promise<Subject> {
    return request('/subjects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  deleteSubject(id: string): Promise<{ success: boolean }> {
    return request(`/subjects/${id}`, { method: 'DELETE' });
  },
};
