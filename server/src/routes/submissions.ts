import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { AppError } from '../middleware/errorHandler';
import { correctSubmission } from '../services/correctionService';

const router = Router();

// Submit answers
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { share_code, student_name, answers } = req.body;

    const link = db.prepare(
      'SELECT * FROM share_links WHERE code = ? AND is_active = 1'
    ).get(share_code);
    if (!link) throw new AppError(404, 'Invalid or inactive share link');

    const exerciseId = (link as any).exercise_id;
    const submissionId = uuid();

    const questions = db.prepare(
      'SELECT * FROM questions WHERE exercise_id = ? ORDER BY order_index'
    ).all(exerciseId) as any[];

    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    db.prepare(`
      INSERT INTO submissions (id, exercise_id, share_link_id, student_name, status, max_score)
      VALUES (?, ?, ?, ?, 'submitted', ?)
    `).run(submissionId, exerciseId, (link as any).id, student_name || null, maxScore);

    if (answers && Array.isArray(answers)) {
      const stmt = db.prepare(`
        INSERT INTO answers (id, submission_id, question_id, student_answer, max_score)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const ans of answers) {
        const question = questions.find(q => q.id === ans.question_id);
        stmt.run(uuid(), submissionId, ans.question_id, ans.student_answer || null, question?.points || 1);
      }
    }

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
});

// Get submissions for an exercise
router.get('/exercise/:exerciseId', (req, res, next) => {
  try {
    const db = getDb();
    const submissions = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM answers WHERE submission_id = s.id) as answer_count
      FROM submissions s
      WHERE s.exercise_id = ?
      ORDER BY s.submitted_at DESC
    `).all(req.params.exerciseId);
    res.json(submissions);
  } catch (err) {
    next(err);
  }
});

// Get single submission with answers
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
    if (!submission) throw new AppError(404, 'Submission not found');

    const answers = db.prepare(`
      SELECT a.*, q.question_text, q.type, q.options, q.correct_answer, q.order_index
      FROM answers a
      JOIN questions q ON q.id = a.question_id
      WHERE a.submission_id = ?
      ORDER BY q.order_index
    `).all(req.params.id);

    const parsedAnswers = (answers as any[]).map(a => ({
      ...a,
      options: a.options ? JSON.parse(a.options) : null,
    }));

    res.json({ ...submission as any, answers: parsedAnswers });
  } catch (err) {
    next(err);
  }
});

// Trigger AI correction for a submission
router.post('/:id/correct', async (req, res, next) => {
  try {
    const db = getDb();
    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id) as any;
    if (!submission) throw new AppError(404, 'Submission not found');
    if (submission.status === 'corrected') throw new AppError(400, 'Already corrected');

    const updated = await correctSubmission(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Export submissions as CSV
router.get('/exercise/:exerciseId/export', (req, res, next) => {
  try {
    const db = getDb();
    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.exerciseId) as any;
    if (!exercise) throw new AppError(404, 'Exercise not found');

    const submissions = db.prepare(`
      SELECT s.* FROM submissions s WHERE s.exercise_id = ? AND s.status = 'corrected'
      ORDER BY s.submitted_at DESC
    `).all(req.params.exerciseId) as any[];

    const header = ['Student Name', 'Total Score', 'Max Score', 'Percentage', 'Submitted At', 'Corrected At'];
    const rows = submissions.map(s => [
      s.student_name || 'Anonymous',
      s.total_score,
      s.max_score,
      s.max_score ? `${Math.round((s.total_score / s.max_score) * 100)}%` : 'N/A',
      s.submitted_at,
      s.corrected_at || '',
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="results-${exercise.subject}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
