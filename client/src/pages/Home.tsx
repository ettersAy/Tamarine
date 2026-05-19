import { Link } from 'react-router-dom';
import styles from './Home.module.css';

export default function Home() {
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>Tamarine</h1>
      <p className={styles.subtitle}>
        AI-Powered Exercise Generator &amp; Correction Platform
      </p>
      <p className={styles.description}>
        Create exercises, share with students, and get AI-powered corrections — all in one place.
      </p>
      <div className={styles.actions}>
        <Link to="/exercises/new" className={styles.primaryBtn}>Create Exercise</Link>
        <Link to="/exercises" className={styles.secondaryBtn}>View Exercises</Link>
      </div>
    </div>
  );
}
