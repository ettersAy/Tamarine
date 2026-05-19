import prisma from '../db/prisma';
import { correctAnswer } from './ai';

export async function correctSubmission(submissionId: string) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new Error('Submission not found');
  if (submission.status === 'corrected') throw new Error('Already corrected');

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'correcting' },
  });

  const answers = await prisma.answer.findMany({
    where: { submissionId },
    include: {
      question: {
        select: { questionText: true, type: true, correctAnswer: true },
      },
    },
  });

  let totalScore = 0;

  for (const answer of answers) {
    try {
      const result = await correctAnswer({
        question_text: answer.question.questionText,
        question_type: answer.question.type,
        correct_answer: answer.question.correctAnswer || '',
        student_answer: answer.studentAnswer || '',
        max_score: answer.maxScore || 1,
      });

      totalScore += result.score;

      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          isCorrect: result.is_correct,
          score: result.score,
          feedback: result.feedback,
        },
      });
    } catch {
      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          isCorrect: false,
          score: 0,
          feedback: 'Could not evaluate this answer.',
        },
      });
    }
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'corrected', totalScore, correctedAt: new Date() },
  });

  return prisma.submission.findUnique({ where: { id: submissionId } });
}
