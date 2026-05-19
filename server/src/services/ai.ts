import { createDeepSeekClient, generateExercises as gen, correctAnswer as corr } from './ai/index';
import type { AiClient, ExerciseGenerationParams, GeneratedQuestion, CorrectionParams, CorrectionResult } from './ai/index';

let client: AiClient | null = null;

function getClient(): AiClient {
  if (!client) client = createDeepSeekClient();
  return client;
}

export async function generateExercises(params: ExerciseGenerationParams): Promise<GeneratedQuestion[]> {
  return gen(getClient(), params);
}

export async function correctAnswer(params: CorrectionParams): Promise<CorrectionResult> {
  return corr(getClient(), params);
}
