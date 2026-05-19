import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import { generateExercises } from '../services/ai';
import { validate } from '../middleware/validate';
import * as repo from '../db/exerciseRepository';

const router = Router();

// Generate exercises via AI (does not save)
router.post('/generate', validate([
  { field: 'subject', required: true, type: 'string', minLength: 1 },
  { field: 'question_count', required: true, type: 'number', min: 1, max: 20 },
  { field: 'question_type', required: true, type: 'string', allowedValues: ['mcq', 'short_answer', 'essay', 'mixed'] },
  { field: 'difficulty', required: true, type: 'string', allowedValues: ['easy', 'medium', 'hard', 'mixed'] },
]), async (req, res, next) => {
  try {
    const { subject, question_count, question_type, difficulty, instructions } = req.body;

    const questions = await generateExercises({
      subject,
      question_count: Math.min(Number(question_count), 20),
      question_type,
      difficulty,
      instructions,
    });

    res.json({ questions });
  } catch (err) {
    next(err);
  }
});

// List all exercises with search, filter, pagination
router.get('/', async (req, res, next) => {
  try {
    const { search, subject, question_type, difficulty, status, page, limit } =
      req.query as Record<string, string>;

    const result = await repo.listExercises({
      search,
      subject,
      question_type,
      difficulty,
      status,
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get single exercise with questions
router.get('/:id', async (req, res, next) => {
  try {
    const exercise = await repo.getExerciseWithDetails(req.params.id);
    if (!exercise) throw new AppError(404, 'Exercise not found');
    res.json(exercise);
  } catch (err) {
    next(err);
  }
});

// Create exercise (with questions)
router.post('/', async (req, res, next) => {
  try {
    const { subject, question_count, question_type, difficulty, instructions, questions } = req.body;
    const exercise = await repo.createExercise({ subject, question_count, question_type, difficulty, instructions, questions });
    res.status(201).json(exercise);
  } catch (err) {
    next(err);
  }
});

// Update exercise
router.put('/:id', async (req, res, next) => {
  try {
    const { subject, question_type, difficulty, instructions, status } = req.body;
    const exercise = await repo.updateExercise(req.params.id, { subject, question_type, difficulty, instructions, status });
    if (!exercise) throw new AppError(404, 'Exercise not found');
    res.json(exercise);
  } catch (err) {
    next(err);
  }
});

// Delete exercise
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await repo.deleteExercise(req.params.id);
    if (!deleted) throw new AppError(404, 'Exercise not found');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
