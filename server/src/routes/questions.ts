import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../db/prisma';
import { serialize } from '../db/transform';

const router = Router({ mergeParams: true });

interface ExerciseParams {
  id: string;
  questionId: string;
}

// Update a question
router.put('/:questionId', async (req: Request<ExerciseParams>, res: Response, next: NextFunction) => {
  try {
    const question = await prisma.question.findFirst({
      where: { id: req.params.questionId, exerciseId: req.params.id },
    });
    if (!question) throw new AppError(404, 'Question not found');

    const { question_text, type, options, correct_answer, points } = req.body;

    const updated = await prisma.question.update({
      where: { id: req.params.questionId },
      data: {
        questionText: question_text ?? question.questionText,
        type: type ?? question.type,
        options: options !== undefined ? JSON.stringify(options) : question.options,
        correctAnswer: correct_answer ?? question.correctAnswer,
        points: points ?? question.points,
      },
    });

    res.json(serialize(updated));
  } catch (err) {
    next(err);
  }
});

// Add a new question to exercise
router.post('/', async (req: Request<ExerciseParams>, res: Response, next: NextFunction) => {
  try {
    const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
    if (!exercise) throw new AppError(404, 'Exercise not found');

    const maxOrder = await prisma.question.aggregate({
      where: { exerciseId: req.params.id },
      _max: { orderIndex: true },
    });

    const { question_text, type, options, correct_answer, points } = req.body;

    const question = await prisma.question.create({
      data: {
        exerciseId: req.params.id,
        orderIndex: (maxOrder._max.orderIndex || 0) + 1,
        type: type || 'short_answer',
        questionText: question_text,
        options: options ? JSON.stringify(options) : null,
        correctAnswer: correct_answer || null,
        points: points || 1,
      },
    });

    res.status(201).json(serialize(question));
  } catch (err) {
    next(err);
  }
});

// Delete a question
router.delete('/:questionId', async (req: Request<ExerciseParams>, res: Response, next: NextFunction) => {
  try {
    const question = await prisma.question.findFirst({
      where: { id: req.params.questionId, exerciseId: req.params.id },
    });
    if (!question) throw new AppError(404, 'Question not found');

    await prisma.question.delete({ where: { id: req.params.questionId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
