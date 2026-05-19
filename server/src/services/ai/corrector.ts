import type { AiClient } from './client';
import type { CorrectionParams, CorrectionResult } from './types';
import { parseCorrection } from './parser';

export async function correctAnswer(
  client: AiClient,
  params: CorrectionParams,
): Promise<CorrectionResult> {
  const systemMsg = `You are an expert educator correcting student answers. You output ONLY valid JSON objects with fields: "is_correct" (boolean), "score" (number 0 to max_score), "feedback" (string with constructive feedback). Be fair and constructive. For partially correct answers, award partial credit.`;

  let prompt: string;
  if (params.question_type === 'mcq') {
    prompt = `Question: ${params.question_text}
Options were provided (multiple choice).
Correct answer: ${params.correct_answer}
Student answer: ${params.student_answer}
Max score: ${params.max_score}

Evaluate this MCQ answer. Return JSON: {"is_correct": true/false, "score": number, "feedback": "your constructive feedback"}`;
  } else if (params.question_type === 'essay') {
    prompt = `Question: ${params.question_text}
Expected key points: ${params.correct_answer}
Student answer: ${params.student_answer}
Max score: ${params.max_score}

Evaluate this essay answer considering completeness, accuracy, and clarity. Award partial credit for partially correct answers. Return JSON: {"is_correct": true/false, "score": number, "feedback": "your constructive feedback"}`;
  } else {
    prompt = `Question: ${params.question_text}
Correct answer: ${params.correct_answer}
Student answer: ${params.student_answer}
Max score: ${params.max_score}

Evaluate this short answer. Be lenient with wording differences if the concept is correct. Return JSON: {"is_correct": true/false, "score": number, "feedback": "your constructive feedback"}`;
  }

  const response = await client.chat([
    { role: 'system', content: systemMsg },
    { role: 'user', content: prompt },
  ]);

  return parseCorrection(response, params.max_score);
}
