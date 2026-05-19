import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Submission, SubmissionWithAnswers } from '../api/types';
import SubmissionList from '../components/SubmissionList';
import AnswerDetailCard from '../components/AnswerDetailCard';
import styles from './Results.module.css';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSub, setSelectedSub] = useState<SubmissionWithAnswers | null>(null);
  const [correcting, setCorrecting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [ex, subs] = await Promise.all([
        api.getExercise(id),
        api.getExerciseSubmissions(id),
      ]);
      setExercise(ex);
      setSubmissions(subs);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function viewSubmission(subId: string) {
    try {
      const sub = await api.getSubmission(subId);
      setSelectedSub(sub);
    } catch (err: any) {
      setError(err.message || 'Failed to load submission');
    }
  }

  async function handleCorrect(subId: string) {
    setCorrecting(true);
    setError('');
    try {
      await api.correctSubmission(subId);
      await fetchData();
      if (selectedSub?.id === subId) {
        const updated = await api.getSubmission(subId);
        setSelectedSub(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Correction failed');
    } finally {
      setCorrecting(false);
    }
  }

  if (loading) {
    return <div className={styles.container}><div className={styles.spinner} /><p>Loading...</p></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/exercises')}>← Back</button>
        <h1 className={styles.heading}>
          {exercise?.subject || 'Exercise'} — Results
        </h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <h2>Submissions ({submissions.length})</h2>
          <SubmissionList
            submissions={submissions}
            selectedId={selectedSub?.id ?? null}
            onSelect={viewSubmission}
          />
        </div>

        <div className={styles.main}>
          {!selectedSub ? (
            <div className={styles.placeholder}>Select a submission to view details</div>
          ) : (
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <div>
                  <h2>{selectedSub.student_name || 'Anonymous Student'}</h2>
                  <p className={styles.submittedAt}>
                    Submitted: {new Date(selectedSub.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className={styles.scoreDisplay}>
                  {selectedSub.status === 'corrected' ? (
                    <span className={styles.bigScore}>
                      {selectedSub.total_score} / {selectedSub.max_score}
                    </span>
                  ) : (
                    <button
                      className={styles.correctBtn}
                      onClick={() => handleCorrect(selectedSub.id)}
                      disabled={correcting}
                    >
                      {correcting ? 'Correcting...' : 'Run AI Correction'}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.answers}>
                {selectedSub.answers?.map((a, i) => (
                  <AnswerDetailCard key={a.id} answer={a} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
