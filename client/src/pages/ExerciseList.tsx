import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Exercise, PaginatedResponse } from '../api/types';
import styles from './ExerciseList.module.css';

const PAGE_SIZE = 10;

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      const data: PaginatedResponse<Exercise> = await api.listExercises(params);
      setExercises(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this exercise?')) return;
    try {
      await api.deleteExercise(id);
      fetchExercises();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  }

  async function handleCreateShareLink(exerciseId: string) {
    try {
      const link = await api.createShareLink(exerciseId);
      const url = `${window.location.origin}/s/${link.code}`;
      await navigator.clipboard.writeText(url);
      alert(`Share link copied to clipboard!\n\n${url}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create share link');
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Exercises</h1>
        <Link to="/exercises/new" className={styles.createBtn}>+ Create New</Link>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading exercises...</p>
        </div>
      ) : exercises.length === 0 ? (
        <div className={styles.empty}>
          <p>{search ? 'No exercises match your search.' : 'No exercises yet.'}</p>
          {!search && <Link to="/exercises/new">Create your first exercise</Link>}
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {exercises.map(ex => (
              <div key={ex.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <div className={styles.cardMain}>
                    <h3 className={styles.cardTitle}>{ex.subject}</h3>
                    <div className={styles.meta}>
                      <span>{ex.question_count} questions</span>
                      <span className={styles.dot}>·</span>
                      <span>{ex.question_type}</span>
                      <span className={styles.dot}>·</span>
                      <span>{ex.difficulty}</span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.status}>{ex.status}</span>
                    </div>
                    {ex.instructions && (
                      <p className={styles.instructions}>{ex.instructions}</p>
                    )}
                    <div className={styles.stats}>
                      <span>{ex.question_count_actual ?? ex.question_count} questions</span>
                      <span className={styles.dot}>·</span>
                      <span>{ex.submission_count ?? 0} submissions</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button onClick={() => navigate(`/exercises/${ex.id}/edit`)}>Edit</button>
                    <button onClick={() => handleCreateShareLink(ex.id)}>Share</button>
                    <button onClick={() => navigate(`/exercises/${ex.id}/results`)}>Results</button>
                    <button className={styles.dangerBtn} onClick={() => handleDelete(ex.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span className={styles.pageInfo}>Page {page} of {totalPages} ({total} total)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
