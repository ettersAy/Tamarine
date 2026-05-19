import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { AppError } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });

interface ExerciseParams {
  id: string;
  questionId: string;
}

// Update a question
router.put('/:questionId', (req: Request<ExerciseParams>, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const question = db.prepare(
      'SELECT * FROM questions WHERE id = ? AND exercise_id = ?'
    ).get(req.params.questionId, req.params.id);
    if (!question) throw new AppError(404, 'Question not found');

    const { question_text, type, options, correct_answer, points } = req.body;
    db.prepare(`
      UPDATE questions
      SET question_text = ?, type = ?, options = ?, correct_answer = ?, points = ?
      WHERE id = ?
    `).run(
      question_text ?? (question as any).question_text,
      type ?? (question as any).type,
      options !== undefined ? JSON.stringify(options) : (question as any).options,
      correct_answer ?? (question as any).correct_answer,
      points ?? (question as any).points,
      req.params.questionId
    );

    const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.questionId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Add a new question to exercise
router.post('/', (req: Request<ExerciseParams>, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
    if (!exercise) throw new AppError(404, 'Exercise not found');

    const maxOrder = db.prepare(
      'SELECT MAX(order_index) as m FROM questions WHERE exercise_id = ?'
    ).get(req.params.id) as any;

    const { question_text, type, options, correct_answer, points } = req.body;
    const id = uuid();
    db.prepare(`
      INSERT INTO questions (id, exercise_id, order_index, type, question_text, options, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.params.id, (maxOrder?.m || 0) + 1,
      type || 'short_answer', question_text,
      options ? JSON.stringify(options) : null,
      correct_answer || null, points || 1
    );

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
});

// Delete a question
router.delete('/:questionId', (req: Request<ExerciseParams>, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = db.prepare(
      'DELETE FROM questions WHERE id = ? AND exercise_id = ?'
    ).run(req.params.questionId, req.params.id);
    if (result.changes === 0) throw new AppError(404, 'Question not found');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
