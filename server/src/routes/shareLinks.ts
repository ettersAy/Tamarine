import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Generate a share link for an exercise
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { exercise_id } = req.body;

    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exercise_id);
    if (!exercise) throw new AppError(404, 'Exercise not found');

    const code = crypto.randomBytes(4).toString('hex');
    const id = uuid();

    db.prepare(`
      INSERT INTO share_links (id, exercise_id, code) VALUES (?, ?, ?)
    `).run(id, exercise_id, code);

    const link = db.prepare('SELECT * FROM share_links WHERE id = ?').get(id);
    res.status(201).json(link);
  } catch (err) {
    next(err);
  }
});

// Get share link info (for student access)
router.get('/:code', (req, res, next) => {
  try {
    const db = getDb();
    const link = db.prepare(`
      SELECT sl.*, e.subject, e.question_count, e.question_type, e.difficulty, e.instructions
      FROM share_links sl
      JOIN exercises e ON e.id = sl.exercise_id
      WHERE sl.code = ? AND sl.is_active = 1
    `).get(req.params.code);

    if (!link) throw new AppError(404, 'Share link not found or inactive');

    const questions = db.prepare(`
      SELECT id, order_index, type, question_text, options, points
      FROM questions
      WHERE exercise_id = ?
      ORDER BY order_index
    `).all((link as any).exercise_id);

    // Parse options JSON for MCQ questions
    const parsedQuestions = (questions as any[]).map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    }));

    res.json({ ...link as any, questions: parsedQuestions });
  } catch (err) {
    next(err);
  }
});

// Toggle share link active status
router.put('/:code/toggle', (req, res, next) => {
  try {
    const db = getDb();
    const link = db.prepare('SELECT * FROM share_links WHERE code = ?').get(req.params.code);
    if (!link) throw new AppError(404, 'Share link not found');

    const newStatus = (link as any).is_active ? 0 : 1;
    db.prepare('UPDATE share_links SET is_active = ? WHERE code = ?').run(newStatus, req.params.code);

    res.json({ code: req.params.code, is_active: newStatus });
  } catch (err) {
    next(err);
  }
});

// List share links for an exercise
router.get('/exercise/:exerciseId', (req, res, next) => {
  try {
    const db = getDb();
    const links = db.prepare(
      'SELECT * FROM share_links WHERE exercise_id = ? ORDER BY created_at DESC'
    ).all(req.params.exerciseId);
    res.json(links);
  } catch (err) {
    next(err);
  }
});

export default router;
