import type { GeneratedQuestion } from '../api/types';
import styles from './QuestionCard.module.css';

interface Props {
  question: GeneratedQuestion;
  index: number;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onRemove: () => void;
  onUpdate: (field: string, value: any) => void;
}

export default function QuestionCard({
  question, index, editing, onEdit, onDone, onRemove, onUpdate,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.num}>Q{index + 1}</span>
        <span className={styles.typeBadge}>{question.type}</span>
        <span className={styles.points}>{question.points} pts</span>
        <div className={styles.actions}>
          <button className={styles.editBtn} onClick={editing ? onDone : onEdit}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button className={styles.removeBtn} onClick={onRemove}>Remove</button>
        </div>
      </div>

      {editing ? (
        <div className={styles.editForm}>
          <textarea
            value={question.question_text}
            onChange={e => onUpdate('question_text', e.target.value)}
            rows={2}
          />
          <label>Type</label>
          <select value={question.type} onChange={e => onUpdate('type', e.target.value)}>
            <option value="mcq">MCQ</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
          <label>Correct Answer</label>
          <input
            type="text"
            value={question.correct_answer}
            onChange={e => onUpdate('correct_answer', e.target.value)}
          />
          {question.type === 'mcq' && (
            <>
              <label>Options (one per line)</label>
              <textarea
                value={question.options?.join('\n') || ''}
                onChange={e => onUpdate('options', e.target.value.split('\n'))}
                rows={4}
              />
            </>
          )}
          <label>Points</label>
          <input
            type="number"
            min={1}
            max={10}
            value={question.points}
            onChange={e => onUpdate('points', Number(e.target.value))}
          />
        </div>
      ) : (
        <div className={styles.body}>
          <p className={styles.questionText}>{question.question_text}</p>
          {question.type === 'mcq' && question.options && (
            <ul className={styles.options}>
              {question.options.map((opt, oi) => (
                <li key={oi} className={opt === question.correct_answer ? styles.correctOption : ''}>
                  {opt} {opt === question.correct_answer && ' ✓'}
                </li>
              ))}
            </ul>
          )}
          {question.type !== 'mcq' && (
            <p className={styles.answer}>Answer: {question.correct_answer}</p>
          )}
        </div>
      )}
    </div>
  );
}
