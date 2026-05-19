import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../db/prisma';
import { serialize } from '../db/transform';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });

    // Count exercises per subject by name (no FK - subject field is text reference)
    const exerciseCounts = await prisma.exercise.groupBy({
      by: ['subject'],
      _count: { id: true },
    });
    const countMap = new Map(exerciseCounts.map((e) => [e.subject, e._count.id]));

    const result = serialize(subjects).map((s: any) => ({
      ...s,
      exercise_count: countMap.get(s.name) || 0,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) throw new AppError(400, 'Subject name is required');

    const existing = await prisma.subject.findUnique({ where: { name: name.trim() } });
    if (existing) throw new AppError(409, 'Subject already exists');

    const subject = await prisma.subject.create({
      data: { name: name.trim() },
    });

    res.status(201).json(serialize(subject));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });
    if (!subject) throw new AppError(404, 'Subject not found');

    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
