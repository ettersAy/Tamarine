import type { AiClient } from './client';
import type { ExerciseGenerationParams, GeneratedQuestion } from './types';
import { parseGeneratedExercises } from './parser';

export async function generateExercises(
  client: AiClient,
  params: ExerciseGenerationParams,
): Promise<GeneratedQuestion[]> {
  const typeInstruction = params.question_type === 'mixed'
    ? 'Mix of multiple-choice, short-answer, and essay questions.'
    : params.question_type === 'mcq'
      ? 'All questions should be multiple-choice with 4 options each.'
      : params.question_type === 'short_answer'
        ? 'All questions should be short-answer format.'
        : 'All questions should be essay/long-answer format.';

  const difficultyInstruction = params.difficulty === 'mixed'
    ? 'Vary the difficulty across questions.'
    : `All questions should be at ${params.difficulty} difficulty level.`;

  const prompt = `Generate ${params.question_count} ${params.subject} exercise questions.

Question type: ${typeInstruction}
Difficulty: ${difficultyInstruction}
${params.instructions ? `Additional instructions: ${params.instructions}` : ''}

Return ONLY a JSON array of question objects. Each object must have these fields:
- "type": one of "mcq", "short_answer", "essay"
- "question_text": the question itself
- "options": array of 4 strings (ONLY for "mcq" type, omit otherwise)
- "correct_answer": the correct answer (for mcq, the correct option text; for short_answer, a concise answer; for essay, key points expected)
- "points": integer score (1-5, based on difficulty/complexity)

Make questions clear, accurate, and appropriate for the subject and difficulty level. Ensure the JSON is valid and parseable.`;

  const systemMsg = `You are an expert educator creating high-quality ${params.subject} exercises. You output ONLY valid JSON arrays, no other text.`;

  const response = await client.chat([
    { role: 'system', content: systemMsg },
    { role: 'user', content: prompt },
  ]);

  return parseGeneratedExercises(response);
}
