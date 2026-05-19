import { v4 as uuid } from 'uuid';
import { getDb } from './connection';

export interface ExerciseFilters {
  search?: string;
  subject?: string;
  question_type?: string;
  difficulty?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function listExercises(filters: ExerciseFilters) {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    conditions.push('(e.subject LIKE ? OR e.instructions LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.subject) {
    conditions.push('e.subject = ?');
    params.push(filters.subject);
  }
  if (filters.question_type) {
    conditions.push('e.question_type = ?');
    params.push(filters.question_type);
  }
  if (filters.difficulty) {
    conditions.push('e.difficulty = ?');
    params.push(filters.difficulty);
  }
  if (filters.status) {
    conditions.push('e.status = ?');
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const pageNum = Math.max(1, filters.page || 1);
  const limitNum = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (pageNum - 1) * limitNum;

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM exercises e ${where}`
  ).get(...params) as any;

  const exercises = db.prepare(`
    SELECT e.*,
      (SELECT COUNT(*) FROM questions WHERE exercise_id = e.id) as question_count_actual,
      (SELECT COUNT(*) FROM submissions WHERE exercise_id = e.id) as submission_count
    FROM exercises e
    ${where}
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  return {
    data: exercises,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limitNum),
    },
  };
}

export function getExerciseById(id: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
}

export function getExerciseWithDetails(id: string) {
  const db = getDb();
  const exercise = getExerciseById(id);
  if (!exercise) return null;

  const questions = db.prepare(
    'SELECT * FROM questions WHERE exercise_id = ? ORDER BY order_index'
  ).all(id);

  const shareLinks = db.prepare(
    'SELECT * FROM share_links WHERE exercise_id = ? ORDER BY created_at DESC'
  ).all(id);

  return { ...exercise as any, questions, shareLinks };
}

export function createExercise(data: {
  subject: string;
  question_count: number;
  question_type: string;
  difficulty: string;
  instructions?: string | null;
  questions?: Array<{
    type: string;
    question_text: string;
    options?: string[] | null;
    correct_answer?: string | null;
    points?: number;
  }>;
}) {
  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO exercises (id, subject, question_count, question_type, difficulty, instructions, status)
    VALUES (?, ?, ?, ?, ?, ?, 'generated')
  `).run(id, data.subject, data.question_count, data.question_type, data.difficulty, data.instructions || null);

  if (data.questions && Array.isArray(data.questions)) {
    const stmt = db.prepare(`
      INSERT INTO questions (id, exercise_id, order_index, type, question_text, options, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      stmt.run(
        uuid(), id, i + 1,
        q.type || 'short_answer',
        q.question_text,
        q.options ? JSON.stringify(q.options) : null,
        q.correct_answer || null,
        q.points || 1
      );
    }
  }

  return db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
}

export function updateExercise(id: string, data: {
  subject?: string;
  question_type?: string;
  difficulty?: string;
  instructions?: string | null;
  status?: string;
}) {
  const db = getDb();
  const existing = getExerciseById(id);
  if (!existing) return null;

  db.prepare(`
    UPDATE exercises
    SET subject = ?, question_type = ?, difficulty = ?, instructions = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.subject ?? (existing as any).subject,
    data.question_type ?? (existing as any).question_type,
    data.difficulty ?? (existing as any).difficulty,
    data.instructions ?? (existing as any).instructions,
    data.status ?? (existing as any).status,
    id
  );

  return db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
}

export function deleteExercise(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
  return result.changes > 0;
}
