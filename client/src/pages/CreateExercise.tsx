import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { GeneratedQuestion } from '../api/types';
import GenerationForm from '../components/GenerationForm';
import QuestionCard from '../components/QuestionCard';
import styles from './CreateExercise.module.css';

export default function CreateExercise() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('mixed');
  const [difficulty, setDifficulty] = useState('medium');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [error, setError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);

  async function handleGenerate() {
    if (!subject.trim()) { setError('Subject is required'); return; }
    setError('');
    setGenerating(true);
    try {
      const result = await api.generateExercises({
        subject: subject.trim(),
        question_count: questionCount,
        question_type: questionType,
        difficulty,
        instructions: instructions.trim() || undefined,
      });
      setQuestions(result.questions);
      setEditingQuestion(null);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (questions.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await api.createExercise({
        subject: subject.trim(),
        question_count: questionCount,
        question_type: questionType,
        difficulty,
        instructions: instructions.trim() || undefined,
        questions,
      });
      navigate('/exercises');
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function updateQuestion(index: number, field: string, value: any) {
    setQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeQuestion(index: number) {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Create Exercise</h1>

      {error && <div className={styles.error}>{error}</div>}

      <GenerationForm
        subject={subject}
        questionCount={questionCount}
        questionType={questionType}
        difficulty={difficulty}
        instructions={instructions}
        generating={generating}
        hasExistingQuestions={questions.length > 0}
        onSubjectChange={setSubject}
        onQuestionCountChange={setQuestionCount}
        onQuestionTypeChange={setQuestionType}
        onDifficultyChange={setDifficulty}
        onInstructionsChange={setInstructions}
        onGenerate={handleGenerate}
      />

      {generating && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>AI is generating questions...</p>
        </div>
      )}

      {!generating && questions.length > 0 && (
        <div className={styles.questions}>
          <div className={styles.questionsHeader}>
            <h2>Generated Questions ({questions.length})</h2>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Exercise'}
            </button>
          </div>

          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              index={i}
              editing={editingQuestion === i}
              onEdit={() => setEditingQuestion(editingQuestion === i ? null : i)}
              onDone={() => setEditingQuestion(null)}
              onRemove={() => removeQuestion(i)}
              onUpdate={(field, value) => updateQuestion(i, field, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
