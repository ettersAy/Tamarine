import type { GeneratedQuestion, CorrectionResult } from './types';

function cleanJsonBlock(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned;
}

export function parseGeneratedExercises(raw: string): GeneratedQuestion[] {
  const parsed = JSON.parse(cleanJsonBlock(raw));
  if (!Array.isArray(parsed)) throw new Error('AI response was not an array');
  return parsed.map((q: any) => ({
    type: q.type || 'short_answer',
    question_text: q.question_text || '',
    options: q.options || undefined,
    correct_answer: q.correct_answer || '',
    points: Math.max(1, Math.min(10, q.points || 1)),
  }));
}

export function parseCorrection(raw: string, maxScore: number): CorrectionResult {
  const parsed = JSON.parse(cleanJsonBlock(raw));
  return {
    is_correct: Boolean(parsed.is_correct),
    score: Math.max(0, Math.min(maxScore, Number(parsed.score) || 0)),
    feedback: parsed.feedback || (parsed.is_correct ? 'Correct!' : 'Incorrect.'),
  };
}
