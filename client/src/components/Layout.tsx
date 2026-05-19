import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();
  const isStudentView = location.pathname.startsWith('/s/');

  if (isStudentView) {
    return (
      <main className={styles.studentMain}>
        <Outlet />
      </main>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>Tamarine</Link>
          <nav className={styles.nav}>
            <Link to="/exercises" className={styles.navLink}>Exercises</Link>
            <Link to="/exercises/new" className={styles.navLink}>Create New</Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
