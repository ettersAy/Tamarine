import type { Answer } from '../api/types';
import styles from './AnswerDetailCard.module.css';

interface Props {
  answer: Answer;
  index: number;
}

export default function AnswerDetailCard({ answer: a, index }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.num}>Q{index + 1}</span>
        <span className={styles.type}>{a.type}</span>
        {a.score != null && (
          <span className={`${styles.score} ${a.is_correct ? styles.correctScore : styles.wrongScore}`}>
            {a.score}/{a.max_score}
          </span>
        )}
      </div>
      <p className={styles.question}>{a.question_text}</p>

      {a.options && (
        <div className={styles.options}>
          {a.options.map((opt: string, oi: number) => (
            <span key={oi} className={`${styles.optTag} ${
              opt === a.correct_answer ? styles.optCorrect :
              opt === a.student_answer && opt !== a.correct_answer ? styles.optWrong : ''
            }`}>
              {opt}
            </span>
          ))}
        </div>
      )}

      <div className={styles.answers}>
        <div className={styles.field}>
          <span className={styles.label}>Student Answer:</span>
          <span>{a.student_answer || '(no answer)'}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Correct Answer:</span>
          <span>{a.correct_answer || '(not set)'}</span>
        </div>
      </div>

      {a.feedback && (
        <div className={styles.feedback}>
          <span className={styles.label}>Feedback:</span>
          <p>{a.feedback}</p>
        </div>
      )}
    </div>
  );
}
