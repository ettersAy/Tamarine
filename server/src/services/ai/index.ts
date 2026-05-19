export type { AiClient } from './client';
export { createDeepSeekClient } from './client';
export { generateExercises } from './generator';
export { correctAnswer } from './corrector';
export type {
  ExerciseGenerationParams,
  GeneratedQuestion,
  CorrectionParams,
  CorrectionResult,
} from './types';
