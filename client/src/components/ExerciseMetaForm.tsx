import styles from './ExerciseMetaForm.module.css';

interface ExerciseMeta {
  subject: string;
  question_type: 'mcq' | 'short_answer' | 'essay' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  instructions: string | null;
}

interface Props {
  meta: ExerciseMeta;
  saving: boolean;
  onChange: (meta: ExerciseMeta) => void;
  onSave: () => void;
}

export default function ExerciseMetaForm({ meta, saving, onChange, onSave }: Props) {
  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label>Subject</label>
        <input
          value={meta.subject}
          onChange={e => onChange({ ...meta, subject: e.target.value })}
        />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label>Type</label>
          <select
            value={meta.question_type}
            onChange={e => onChange({ ...meta, question_type: e.target.value as ExerciseMeta['question_type'] })}
          >
            <option value="mcq">MCQ</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>Difficulty</label>
          <select
            value={meta.difficulty}
            onChange={e => onChange({ ...meta, difficulty: e.target.value as ExerciseMeta['difficulty'] })}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label>Instructions</label>
        <textarea
          value={meta.instructions || ''}
          onChange={e => onChange({ ...meta, instructions: e.target.value })}
          rows={2}
        />
      </div>
      <button className={styles.saveBtn} onClick={onSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Details'}
      </button>
    </div>
  );
}
