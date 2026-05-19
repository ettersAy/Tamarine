import { getDb } from '../db';
import { correctAnswer } from './ai';

export async function correctSubmission(submissionId: string) {
  const db = getDb();
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as any;
  if (!submission) throw new Error('Submission not found');
  if (submission.status === 'corrected') throw new Error('Already corrected');

  db.prepare("UPDATE submissions SET status = 'correcting' WHERE id = ?").run(submissionId);

  const answers = db.prepare(`
    SELECT a.*, q.question_text, q.type, q.correct_answer
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    WHERE a.submission_id = ?
  `).all(submissionId) as any[];

  let totalScore = 0;

  for (const answer of answers) {
    try {
      const result = await correctAnswer({
        question_text: answer.question_text,
        question_type: answer.type,
        correct_answer: answer.correct_answer || '',
        student_answer: answer.student_answer || '',
        max_score: answer.max_score || 1,
      });

      totalScore += result.score;

      db.prepare(`
        UPDATE answers SET is_correct = ?, score = ?, feedback = ? WHERE id = ?
      `).run(result.is_correct ? 1 : 0, result.score, result.feedback, answer.id);
    } catch {
      db.prepare(`
        UPDATE answers SET is_correct = 0, score = 0, feedback = ? WHERE id = ?
      `).run('Could not evaluate this answer.', answer.id);
    }
  }

  db.prepare(`
    UPDATE submissions SET status = 'corrected', total_score = ?, corrected_at = datetime('now') WHERE id = ?
  `).run(totalScore, submissionId);

  return db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
}
