import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';

const CreateExercise = lazy(() => import('./pages/CreateExercise'));
const ExerciseList = lazy(() => import('./pages/ExerciseList'));
const ExerciseEdit = lazy(() => import('./pages/ExerciseEdit'));
const StudentView = lazy(() => import('./pages/StudentView'));
const Results = lazy(() => import('./pages/Results'));
const StudentResults = lazy(() => import('./pages/StudentResults'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '80px 0',
    }}>
      <div style={{
        width: 36, height: 36, border: '3px solid #e5e7eb',
        borderTopColor: '#4f46e5', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/exercises" element={
          <Suspense fallback={<PageLoader />}><ExerciseList /></Suspense>
        } />
        <Route path="/exercises/new" element={
          <Suspense fallback={<PageLoader />}><CreateExercise /></Suspense>
        } />
        <Route path="/exercises/:id/edit" element={
          <Suspense fallback={<PageLoader />}><ExerciseEdit /></Suspense>
        } />
        <Route path="/exercises/:id/results" element={
          <Suspense fallback={<PageLoader />}><Results /></Suspense>
        } />
        <Route path="/s/:shareCode" element={
          <Suspense fallback={<PageLoader />}><StudentView /></Suspense>
        } />
        <Route path="/s/:shareCode/results/:submissionId" element={
          <Suspense fallback={<PageLoader />}><StudentResults /></Suspense>
        } />
      </Route>
    </Routes>
  );
}
