import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { SubmissionWithAnswers } from '../api/types';
import styles from './StudentResults.module.css';

export default function StudentResults() {
  const { shareCode, submissionId } = useParams<{ shareCode: string; submissionId: string }>();
  const [submission, setSubmission] = useState<SubmissionWithAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return;
    try {
      const data = await api.getSubmission(submissionId);
      setSubmission(data);
      if (data.status === 'corrected') setPolling(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => { fetchSubmission(); }, [fetchSubmission]);

  // Auto-trigger correction if not yet corrected
  useEffect(() => {
    if (submission && submission.status === 'submitted' && !polling) {
      setPolling(true);
      api.correctSubmission(submission.id).then(() => fetchSubmission()).catch(() => {});
    }
  }, [submission, polling, fetchSubmission]);

  // Poll while correcting
  useEffect(() => {
    if (submission?.status === 'correcting') {
      const timer = setInterval(fetchSubmission, 2000);
      return () => clearInterval(timer);
    }
  }, [submission?.status, fetchSubmission]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p>Loading results...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h1>Results Not Available</h1>
          <p>{error || 'Could not load results.'}</p>
        </div>
      </div>
    );
  }

  const isCorrecting = submission.status === 'submitted' || submission.status === 'correcting';
  const percentage = submission.total_score != null && submission.max_score
    ? Math.round((submission.total_score / submission.max_score) * 100)
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Your Results</h1>
        {isCorrecting ? (
          <div className={styles.correcting}>
            <div className={styles.spinnerSmall} />
            <span>AI is correcting your answers...</span>
          </div>
        ) : (
          <div className={styles.scoreCard}>
            <div className={styles.bigScore}>{submission.total_score}/{submission.max_score}</div>
            {percentage != null && (
              <div className={`${styles.percentage} ${percentage >= 70 ? styles.good : percentage >= 40 ? styles.ok : styles.bad}`}>
                {percentage}%
              </div>
            )}
          </div>
        )}
      </div>

      {submission.status === 'corrected' && (
        <div className={styles.answers}>
          {submission.answers?.map((a, i) => (
            <div key={a.id} className={styles.answerCard}>
              <div className={styles.aHeader}>
                <span className={styles.aNum}>Q{i + 1}</span>
                {a.score != null && (
                  <span className={`${styles.aScore} ${a.is_correct ? styles.correctScore : styles.wrongScore}`}>
                    {a.score}/{a.max_score}
                  </span>
                )}
              </div>
              <p className={styles.aQuestion}>{a.question_text}</p>

              <div className={styles.aAnswers}>
                <div className={styles.aField}>
                  <span className={styles.aLabel}>Your Answer:</span>
                  <span className={a.is_correct ? styles.correctText : styles.wrongText}>
                    {a.student_answer || '(no answer)'}
                  </span>
                </div>
                {!a.is_correct && (
                  <div className={styles.aField}>
                    <span className={styles.aLabel}>Correct Answer:</span>
                    <span className={styles.correctText}>{a.correct_answer || 'N/A'}</span>
                  </div>
                )}
              </div>

              {a.feedback && (
                <div className={`${styles.feedback} ${a.is_correct ? styles.feedbackGood : styles.feedbackBad}`}>
                  <p>{a.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
