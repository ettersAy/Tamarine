import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import styles from './StudentView.module.css';

interface ShareLinkData {
  exercise_id: string;
  subject: string;
  question_count: number;
  question_type: string;
  difficulty: string;
  instructions: string | null;
  questions: Array<{
    id: string;
    order_index: number;
    type: string;
    question_text: string;
    options: string[] | null;
    points: number;
  }>;
}

export default function StudentView() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ShareLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  const fetchExercise = useCallback(async () => {
    if (!shareCode) return;
    try {
      const result = await api.getShareLink(shareCode);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Exercise not found or link is inactive');
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => { fetchExercise(); }, [fetchExercise]);

  async function handleSubmit() {
    if (!data || !shareCode) return;
    const unanswered = data.questions.filter(q => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      if (!confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) return;
    }

    setSubmitting(true);
    setError('');

    try {
      const answerList = data.questions.map(q => ({
        question_id: q.id,
        student_answer: answers[q.id] || '',
      }));

      const submission = await api.submitAnswers({
        share_code: shareCode,
        student_name: studentName.trim() || undefined,
        answers: answerList,
      });

      navigate(`/s/${shareCode}/results/${submission.id}`);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p>Loading exercise...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h1>Exercise Not Available</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!started) {
    return (
      <div className={styles.container}>
        <div className={styles.welcome}>
          <h1>{data.subject}</h1>
          <div className={styles.info}>
            <span>{data.question_count} questions</span>
            <span className={styles.dot}>·</span>
            <span>{data.difficulty}</span>
            <span className={styles.dot}>·</span>
            <span>{data.question_type}</span>
          </div>
          {data.instructions && <p className={styles.instructions}>{data.instructions}</p>}
          <div className={styles.nameField}>
            <label htmlFor="name">Your Name (optional)</label>
            <input
              id="name"
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="Enter your name..."
            />
          </div>
          <button className={styles.startBtn} onClick={() => setStarted(true)}>
            Start Exercise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.exerciseHeader}>
        <h1>{data.subject}</h1>
        <div className={styles.progress}>
          {Object.keys(answers).filter(k => answers[k]?.trim()).length} / {data.questions.length} answered
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.questions}>
        {data.questions.map((q, i) => (
          <div key={q.id} className={styles.questionCard} id={`q-${q.id}`}>
            <div className={styles.qHeader}>
              <span className={styles.qNum}>Q{i + 1}</span>
              <span className={styles.qPts}>{q.points} pts</span>
              {answers[q.id]?.trim() && <span className={styles.answered}>Answered</span>}
            </div>
            <p className={styles.qText}>{q.question_text}</p>

            {q.type === 'mcq' && q.options ? (
              <div className={styles.options}>
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`${styles.option} ${answers[q.id] === opt ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className={styles.answerInput}
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.type === 'essay' ? 'Write your answer in detail...' : 'Type your answer...'}
                rows={q.type === 'essay' ? 6 : 3}
              />
            )}
          </div>
        ))}
      </div>

      <div className={styles.submitBar}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Answers'}
        </button>
      </div>
    </div>
  );
}
