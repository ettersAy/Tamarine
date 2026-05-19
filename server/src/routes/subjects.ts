import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    const db = getDb();
    const subjects = db.prepare(
      'SELECT s.*, (SELECT COUNT(*) FROM exercises WHERE subject = s.name) as exercise_count FROM subjects s ORDER BY s.name'
    ).all();
    res.json(subjects);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { name } = req.body;
    if (!name || !name.trim()) throw new AppError(400, 'Subject name is required');

    const existing = db.prepare('SELECT id FROM subjects WHERE name = ?').get(name.trim());
    if (existing) throw new AppError(409, 'Subject already exists');

    const id = uuid();
    db.prepare('INSERT INTO subjects (id, name) VALUES (?, ?)').run(id, name.trim());
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    res.status(201).json(subject);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    if (result.changes === 0) throw new AppError(404, 'Subject not found');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
