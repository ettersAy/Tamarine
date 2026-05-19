import type { Question } from '../api/types';
import styles from './EditableQuestionCard.module.css';

interface Props {
  question: Question;
  index: number;
  onChange: (id: string, updates: Partial<Question>) => void;
  onDelete: (id: string) => void;
}

export default function EditableQuestionCard({ question, index, onChange, onDelete }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.num}>Q{index + 1}</span>
        <span className={styles.type}>{question.type}</span>
        <span className={styles.points}>{question.points} pts</span>
        <button className={styles.deleteBtn} onClick={() => onDelete(question.id)}>Delete</button>
      </div>
      <div className={styles.body}>
        <label>Question Text</label>
        <textarea
          value={question.question_text}
          onChange={e => onChange(question.id, { question_text: e.target.value })}
          rows={2}
        />
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Type</label>
            <select
              value={question.type}
              onChange={e => onChange(question.id, { type: e.target.value as any })}
            >
              <option value="mcq">MCQ</option>
              <option value="short_answer">Short Answer</option>
              <option value="essay">Essay</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Points</label>
            <input
              type="number"
              min={1}
              max={10}
              value={question.points}
              onChange={e => onChange(question.id, { points: Number(e.target.value) })}
            />
          </div>
        </div>
        <label>Correct Answer</label>
        <input
          type="text"
          value={question.correct_answer || ''}
          onChange={e => onChange(question.id, { correct_answer: e.target.value })}
          placeholder="The correct answer..."
        />
        {question.type === 'mcq' && (
          <>
            <label>Options (one per line)</label>
            <textarea
              value={(question.options || []).join('\n')}
              onChange={e => onChange(question.id, {
                options: e.target.value ? e.target.value.split('\n') : [],
              })}
              rows={4}
            />
          </>
        )}
      </div>
    </div>
  );
}
