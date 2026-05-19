-- Tamarine Database Schema

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  question_type TEXT NOT NULL CHECK(question_type IN ('mcq', 'short_answer', 'essay', 'mixed')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'generating', 'generated', 'ready')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('mcq', 'short_answer', 'essay')),
  question_text TEXT NOT NULL,
  options TEXT, -- JSON array for MCQ
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  share_link_id TEXT REFERENCES share_links(id) ON DELETE SET NULL,
  student_name TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'correcting', 'corrected')),
  total_score REAL,
  max_score REAL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  corrected_at TEXT
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct INTEGER,
  score REAL,
  max_score REAL,
  feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_exercise ON questions(exercise_id, order_index);
CREATE INDEX IF NOT EXISTS idx_share_links_code ON share_links(code);
CREATE INDEX IF NOT EXISTS idx_share_links_exercise ON share_links(exercise_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exercise ON submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_submissions_share_link ON submissions(share_link_id);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
