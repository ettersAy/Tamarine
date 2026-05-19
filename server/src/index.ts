import express from 'express';
import cors from 'cors';
import exercisesRouter from './routes/exercises';
import questionsRouter from './routes/questions';
import shareLinksRouter from './routes/shareLinks';
import submissionsRouter from './routes/submissions';
import subjectsRouter from './routes/subjects';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/exercises', exercisesRouter);
app.use('/api/exercises/:id/questions', questionsRouter);
app.use('/api/links', shareLinksRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/subjects', subjectsRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
