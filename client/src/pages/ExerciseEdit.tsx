import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ExerciseWithDetails, Question } from '../api/types';
import ExerciseMetaForm from '../components/ExerciseMetaForm';
import EditableQuestionCard from '../components/EditableQuestionCard';
import styles from './ExerciseEdit.module.css';

export default function ExerciseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<ExerciseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExercise = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getExercise(id);
      setExercise(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchExercise(); }, [fetchExercise]);

  async function handleUpdateQuestion(questionId: string, updates: Partial<Question>) {
    if (!id || !exercise) return;
    try {
      await api.updateQuestion(id, questionId, updates);
      setExercise(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map(q =>
            q.id === questionId ? { ...q, ...updates } : q
          ),
        };
      });
    } catch (err: any) {
      setError(err.message || 'Update failed');
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!id || !exercise) return;
    if (!confirm('Delete this question?')) return;
    try {
      await api.deleteQuestion(id, questionId);
      setExercise(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.filter(q => q.id !== questionId),
        };
      });
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  }

  async function handleAddQuestion() {
    if (!id || !exercise) return;
    try {
      const newQ = await api.addQuestion(id, {
        question_text: 'New question',
        type: 'short_answer',
        correct_answer: '',
        points: 1,
      });
      setExercise(prev => {
        if (!prev) return prev;
        return { ...prev, questions: [...prev.questions, newQ] };
      });
    } catch (err: any) {
      setError(err.message || 'Add failed');
    }
  }

  async function handleSaveMeta() {
    if (!id || !exercise) return;
    setSaving(true);
    try {
      await api.updateExercise(id, {
        subject: exercise.subject,
        question_type: exercise.question_type,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions ?? undefined,
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.container}><div className={styles.spinner} /><p>Loading...</p></div>;
  }

  if (!exercise) {
    return <div className={styles.container}><p>Exercise not found.</p></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/exercises')}>← Back</button>
        <h1 className={styles.heading}>Edit Exercise</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <ExerciseMetaForm
        meta={{
          subject: exercise.subject,
          question_type: exercise.question_type,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions,
        }}
        saving={saving}
        onChange={meta => setExercise(prev => prev ? { ...prev, ...meta } : prev)}
        onSave={handleSaveMeta}
      />

      <div className={styles.questionsSection}>
        <div className={styles.questionsHeader}>
          <h2>Questions ({exercise.questions.length})</h2>
          <button className={styles.addBtn} onClick={handleAddQuestion}>+ Add Question</button>
        </div>

        {exercise.questions.map((q, i) => (
          <EditableQuestionCard
            key={q.id}
            question={q}
            index={i}
            onChange={handleUpdateQuestion}
            onDelete={handleDeleteQuestion}
          />
        ))}
      </div>
    </div>
  );
}
