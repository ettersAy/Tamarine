import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import prisma from '../db/prisma';
import { serialize } from '../db/transform';
import * as submissionRepo from '../db/submissionRepository';
import { correctSubmission } from '../services/correctionService';
import { generateSubmissionsCSV } from '../services/csvExportService';

const router = Router();

const submitAnswersValidation = validate([
  { field: 'share_code', required: true, type: 'string', minLength: 1 },
  { field: 'answers', required: true, type: 'array' },
]);

// POST / — Submit student answers via a share link
router.post('/', submitAnswersValidation, async (req, res, next) => {
  try {
    const { share_code, student_name, answers } = req.body;

    const link = await prisma.shareLink.findFirst({
      where: { code: share_code, isActive: true },
    });
    if (!link) throw new AppError(404, 'Invalid or inactive share link');

    const questions = await prisma.question.findMany({
      where: { exerciseId: link.exerciseId },
      orderBy: { orderIndex: 'asc' },
    });

    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    const answerRecords = answers.map((a: any) => {
      const question = questions.find((q) => q.id === a.question_id);
      return {
        questionId: a.question_id,
        studentAnswer: a.student_answer || null,
        maxScore: question?.points || 1,
      };
    });

    const submission = await submissionRepo.createSubmission({
      exerciseId: link.exerciseId,
      shareLinkId: link.id,
      studentName: student_name?.trim() || null,
      maxScore,
      answers: answerRecords,
    });

    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
});

// GET /exercise/:exerciseId — List submissions for an exercise
router.get('/exercise/:exerciseId', async (req, res, next) => {
  try {
    const submissions = await submissionRepo.listSubmissionsByExercise(req.params.exerciseId);
    res.json(submissions);
  } catch (err) {
    next(err);
  }
});

// GET /exercise/:exerciseId/export — Export corrected submissions as CSV
router.get('/exercise/:exerciseId/export', async (req, res, next) => {
  try {
    const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
    if (!exercise) throw new AppError(404, 'Exercise not found');

    const submissions = await submissionRepo.listSubmissionsByExercise(
      req.params.exerciseId,
      { status: 'corrected' },
    );

    const csv = generateSubmissionsCSV(submissions);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="results-${exercise.subject}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /:id — Get a single submission with detailed answers
router.get('/:id', async (req, res, next) => {
  try {
    const submission = await submissionRepo.findSubmissionWithAnswers(req.params.id);
    if (!submission) throw new AppError(404, 'Submission not found');
    res.json(submission);
  } catch (err) {
    next(err);
  }
});

// POST /:id/correct — Trigger AI correction for a submission
router.post('/:id/correct', async (req, res, next) => {
  try {
    const { id } = req.params;

    const status = await submissionRepo.findSubmissionStatus(id);
    if (!status) throw new AppError(404, 'Submission not found');
    if (status.status === 'corrected') throw new AppError(400, 'Already corrected');

    const updated = await correctSubmission(id);
    res.json(serialize(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
