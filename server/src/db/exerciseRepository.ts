import prisma from './prisma';
import { serialize } from './transform';

export interface ExerciseFilters {
  search?: string;
  subject?: string;
  question_type?: string;
  difficulty?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listExercises(filters: ExerciseFilters) {
  const conditions: any = {};

  if (filters.subject) conditions.subject = filters.subject;
  if (filters.question_type) conditions.questionType = filters.question_type;
  if (filters.difficulty) conditions.difficulty = filters.difficulty;
  if (filters.status) conditions.status = filters.status;

  const searchConditions = filters.search
    ? [{ subject: { contains: filters.search, mode: 'insensitive' as const } },
       { instructions: { contains: filters.search, mode: 'insensitive' as const } }]
    : undefined;

  const where = {
    ...conditions,
    ...(searchConditions ? { OR: searchConditions } : {}),
  };

  const pageNum = Math.max(1, filters.page || 1);
  const limitNum = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, exercises] = await Promise.all([
    prisma.exercise.count({ where }),
    prisma.exercise.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        _count: {
          select: { questions: true, submissions: true },
        },
      },
    }),
  ]);

  return {
    data: serialize(exercises).map((e: any) => ({
      ...e,
      question_count_actual: e._count?.questions ?? e.question_count,
      submission_count: e._count?.submissions ?? 0,
      _count: undefined,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

export async function getExerciseById(id: string) {
  const exercise = await prisma.exercise.findUnique({ where: { id } });
  return exercise ? serialize(exercise) : null;
}

export async function getExerciseWithDetails(id: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
      shareLinks: { orderBy: { createdAt: 'desc' } },
    },
  });
  return exercise ? serialize(exercise) : null;
}

export async function createExercise(data: {
  subject: string;
  question_count: number;
  question_type: string;
  difficulty: string;
  instructions?: string | null;
  questions?: Array<{
    type: string;
    question_text: string;
    options?: string[] | null;
    correct_answer?: string | null;
    points?: number;
  }>;
}) {
  const exercise = await prisma.exercise.create({
    data: {
      subject: data.subject,
      questionCount: data.question_count,
      questionType: data.question_type,
      difficulty: data.difficulty,
      instructions: data.instructions || null,
      status: 'generated',
      ...(data.questions?.length
        ? {
            questions: {
              create: data.questions.map((q, i) => ({
                type: q.type || 'short_answer',
                questionText: q.question_text,
                options: q.options ? JSON.stringify(q.options) : null,
                correctAnswer: q.correct_answer || null,
                points: q.points || 1,
                orderIndex: i + 1,
              })),
            },
          }
        : {}),
    },
  });

  return serialize(exercise);
}

export async function updateExercise(id: string, data: {
  subject?: string;
  question_type?: string;
  difficulty?: string;
  instructions?: string | null;
  status?: string;
}) {
  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) return null;

  const exercise = await prisma.exercise.update({
    where: { id },
    data: {
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.question_type !== undefined ? { questionType: data.question_type } : {}),
      ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
      ...(data.instructions !== undefined ? { instructions: data.instructions } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  return serialize(exercise);
}

export async function deleteExercise(id: string): Promise<boolean> {
  try {
    await prisma.exercise.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
