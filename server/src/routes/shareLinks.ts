import { Router } from 'express';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';
import prisma from '../db/prisma';
import { serialize } from '../db/transform';

const router = Router();

// Generate a share link for an exercise
router.post('/', async (req, res, next) => {
  try {
    const { exercise_id } = req.body;

    const exercise = await prisma.exercise.findUnique({ where: { id: exercise_id } });
    if (!exercise) throw new AppError(404, 'Exercise not found');

    const code = crypto.randomBytes(4).toString('hex');

    const link = await prisma.shareLink.create({
      data: { exerciseId: exercise_id, code },
    });

    res.status(201).json(serialize(link));
  } catch (err) {
    next(err);
  }
});

// Get share link info (for student access)
router.get('/:code', async (req, res, next) => {
  try {
    const link = await prisma.shareLink.findFirst({
      where: { code: req.params.code, isActive: true },
      include: {
        exercise: {
          select: { subject: true, questionCount: true, questionType: true, difficulty: true, instructions: true },
        },
      },
    });

    if (!link) throw new AppError(404, 'Share link not found or inactive');

    const questions = await prisma.question.findMany({
      where: { exerciseId: link.exerciseId },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        orderIndex: true,
        type: true,
        questionText: true,
        options: true,
        points: true,
      },
    });

    const serializedLink = serialize(link);
    const parsedQuestions = (serialize(questions) as any[]).map((q: any) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    }));

    res.json({
      ...serializedLink,
      subject: (link as any).exercise?.subject,
      question_count: (link as any).exercise?.questionCount,
      question_type: (link as any).exercise?.questionType,
      difficulty: (link as any).exercise?.difficulty,
      instructions: (link as any).exercise?.instructions,
      exercise: undefined,
      questions: parsedQuestions,
    });
  } catch (err) {
    next(err);
  }
});

// Toggle share link active status
router.put('/:code/toggle', async (req, res, next) => {
  try {
    const link = await prisma.shareLink.findFirst({ where: { code: req.params.code } });
    if (!link) throw new AppError(404, 'Share link not found');

    const newStatus = !link.isActive;
    await prisma.shareLink.update({
      where: { id: link.id },
      data: { isActive: newStatus },
    });

    res.json({ code: req.params.code, is_active: newStatus ? 1 : 0 });
  } catch (err) {
    next(err);
  }
});

// List share links for an exercise
router.get('/exercise/:exerciseId', async (req, res, next) => {
  try {
    const links = await prisma.shareLink.findMany({
      where: { exerciseId: req.params.exerciseId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(serialize(links));
  } catch (err) {
    next(err);
  }
});

export default router;
