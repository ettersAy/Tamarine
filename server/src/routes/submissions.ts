import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import prisma from '../db/prisma';
import { serialize } from '../db/transform';
import { correctSubmission } from '../services/correctionService';

const router = Router();

// Submit answers
router.post('/', async (req, res, next) => {
  try {
    const { share_code, student_name, answers } = req.body;

    const link = await prisma.shareLink.findFirst({
      where: { code: share_code, isActive: true },
    });
    if (!link) throw new AppError(404, 'Invalid or inactive share link');

    const exerciseId = link.exerciseId;

    const questions = await prisma.question.findMany({
      where: { exerciseId },
      orderBy: { orderIndex: 'asc' },
    });

    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    const submission = await prisma.submission.create({
      data: {
        exerciseId,
        shareLinkId: link.id,
        studentName: student_name || null,
        status: 'submitted',
        maxScore,
        ...(answers?.length
          ? {
              answers: {
                create: answers.map((ans: any) => {
                  const question = questions.find((q) => q.id === ans.question_id);
                  return {
                    questionId: ans.question_id,
                    studentAnswer: ans.student_answer || null,
                    maxScore: question?.points || 1,
                  };
                }),
              },
            }
          : {}),
      },
    });

    res.status(201).json(serialize(submission));
  } catch (err) {
    next(err);
  }
});

// Get submissions for an exercise
router.get('/exercise/:exerciseId', async (req, res, next) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { exerciseId: req.params.exerciseId },
      orderBy: { submittedAt: 'desc' },
      include: {
        _count: { select: { answers: true } },
      },
    });

    const result = serialize(submissions).map((s: any) => ({
      ...s,
      answer_count: s._count?.answers ?? 0,
      _count: undefined,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get single submission with answers
router.get('/:id', async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        answers: {
          orderBy: { question: { orderIndex: 'asc' } },
          include: {
            question: {
              select: {
                questionText: true,
                type: true,
                options: true,
                correctAnswer: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    });

    if (!submission) throw new AppError(404, 'Submission not found');

    const serialized = serialize(submission);
    const parsedAnswers = serialized.answers.map((a: any) => ({
      ...a,
      question_text: a.question?.question_text ?? a.question_text,
      type: a.question?.type ?? a.type,
      options: a.question?.options ? JSON.parse(a.question.options) : null,
      correct_answer: a.question?.correct_answer ?? a.correct_answer,
      order_index: a.question?.order_index ?? a.order_index,
      question: undefined,
    }));

    res.json({ ...serialized, answers: parsedAnswers });
  } catch (err) {
    next(err);
  }
});

// Trigger AI correction for a submission
router.post('/:id/correct', async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({ where: { id: req.params.id } });
    if (!submission) throw new AppError(404, 'Submission not found');
    if (submission.status === 'corrected') throw new AppError(400, 'Already corrected');

    const updated = await correctSubmission(req.params.id);
    res.json(serialize(updated));
  } catch (err) {
    next(err);
  }
});

// Export submissions as CSV
router.get('/exercise/:exerciseId/export', async (req, res, next) => {
  try {
    const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
    if (!exercise) throw new AppError(404, 'Exercise not found');

    const submissions = await prisma.submission.findMany({
      where: { exerciseId: req.params.exerciseId, status: 'corrected' },
      orderBy: { submittedAt: 'desc' },
    });

    const header = ['Student Name', 'Total Score', 'Max Score', 'Percentage', 'Submitted At', 'Corrected At'];
    const rows = submissions.map((s) => [
      s.studentName || 'Anonymous',
      s.totalScore,
      s.maxScore,
      s.maxScore ? `${Math.round((s.totalScore! / s.maxScore) * 100)}%` : 'N/A',
      s.submittedAt?.toISOString() || '',
      s.correctedAt?.toISOString() || '',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="results-${exercise.subject}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
