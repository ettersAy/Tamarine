import prisma from './prisma';
import { serialize } from './transform';

export interface CreateSubmissionData {
  exerciseId: string;
  shareLinkId: string;
  studentName?: string | null;
  maxScore: number;
  answers?: Array<{
    questionId: string;
    studentAnswer: string | null;
    maxScore: number;
  }>;
}

export async function createSubmission(data: CreateSubmissionData) {
  const submission = await prisma.submission.create({
    data: {
      exerciseId: data.exerciseId,
      shareLinkId: data.shareLinkId,
      studentName: data.studentName || null,
      status: 'submitted',
      maxScore: data.maxScore,
      ...(data.answers?.length
        ? {
            answers: {
              create: data.answers.map((a) => ({
                questionId: a.questionId,
                studentAnswer: a.studentAnswer,
                maxScore: a.maxScore,
              })),
            },
          }
        : {}),
    },
  });

  return serialize(submission);
}

export async function findSubmissionWithAnswers(id: string) {
  const submission = await prisma.submission.findUnique({
    where: { id },
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

  if (!submission) return null;

  const serialized = serialize(submission);
  serialized.answers = serialized.answers.map((a: any) => ({
    ...a,
    question_text: a.question?.question_text ?? a.question_text,
    type: a.question?.type ?? a.type,
    options: a.question?.options ? JSON.parse(a.question.options) : null,
    correct_answer: a.question?.correct_answer ?? a.correct_answer,
    order_index: a.question?.order_index ?? a.order_index,
    question: undefined,
  }));

  return serialized;
}

export async function listSubmissionsByExercise(
  exerciseId: string,
  options?: { status?: string },
) {
  const submissions = await prisma.submission.findMany({
    where: { exerciseId, ...(options?.status ? { status: options.status } : {}) },
    orderBy: { submittedAt: 'desc' },
    include: {
      _count: { select: { answers: true } },
    },
  });

  return serialize(submissions).map((s: any) => ({
    ...s,
    answer_count: s._count?.answers ?? 0,
    _count: undefined,
  }));
}

export async function findSubmissionStatus(id: string) {
  return prisma.submission.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
}
