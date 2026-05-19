import type { Submission } from '../api/types';
import styles from './SubmissionList.module.css';

interface Props {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function SubmissionList({ submissions, selectedId, onSelect }: Props) {
  if (submissions.length === 0) {
    return <p className={styles.empty}>No submissions yet.</p>;
  }

  return (
    <div className={styles.list}>
      {submissions.map(sub => (
        <button
          key={sub.id}
          className={`${styles.item} ${selectedId === sub.id ? styles.active : ''}`}
          onClick={() => onSelect(sub.id)}
        >
          <div className={styles.name}>
            {sub.student_name || 'Anonymous'}
          </div>
          <div className={styles.meta}>
            <span className={styles.status}>{sub.status}</span>
            {sub.total_score != null && (
              <span className={styles.score}>
                {sub.total_score}/{sub.max_score}
              </span>
            )}
          </div>
          <div className={styles.date}>
            {new Date(sub.submitted_at).toLocaleString()}
          </div>
        </button>
      ))}
    </div>
  );
}
