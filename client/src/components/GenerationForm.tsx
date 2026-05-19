import styles from './GenerationForm.module.css';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'mixed', label: 'Mixed' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];

interface Props {
  subject: string;
  questionCount: number;
  questionType: string;
  difficulty: string;
  instructions: string;
  generating: boolean;
  hasExistingQuestions: boolean;
  onSubjectChange: (v: string) => void;
  onQuestionCountChange: (v: number) => void;
  onQuestionTypeChange: (v: string) => void;
  onDifficultyChange: (v: string) => void;
  onInstructionsChange: (v: string) => void;
  onGenerate: () => void;
}

export default function GenerationForm({
  subject, questionCount, questionType, difficulty, instructions,
  generating, hasExistingQuestions,
  onSubjectChange, onQuestionCountChange, onQuestionTypeChange,
  onDifficultyChange, onInstructionsChange, onGenerate,
}: Props) {
  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={e => onSubjectChange(e.target.value)}
          placeholder="e.g. Mathematics, History, Physics..."
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="count">Number of Questions</label>
          <input
            id="count"
            type="number"
            min={1}
            max={20}
            value={questionCount}
            onChange={e => onQuestionCountChange(Number(e.target.value))}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="type">Question Type</label>
          <select id="type" value={questionType} onChange={e => onQuestionTypeChange(e.target.value)}>
            {QUESTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" value={difficulty} onChange={e => onDifficultyChange(e.target.value)}>
            {DIFFICULTIES.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="instructions">
          Instructions <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={e => onInstructionsChange(e.target.value)}
          placeholder="Additional instructions for AI generation, e.g. 'Focus on algebra', 'Include diagram-based questions'..."
          rows={3}
        />
      </div>

      <button
        className={styles.generateBtn}
        onClick={onGenerate}
        disabled={generating || !subject.trim()}
      >
        {generating ? 'Generating...' : hasExistingQuestions ? 'Regenerate Questions' : 'Generate Questions'}
      </button>
    </div>
  );
}
