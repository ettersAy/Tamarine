# Tamarine — Complete Documentation Wiki

> AI-powered exercise generator and correction platform for teachers and students.

---

## Table of Contents

1. [What is Tamarine](#1-what-is-tamarine)
2. [How to Run](#2-how-to-run)
3. [How to Use](#3-how-to-use)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Frontend Reference](#7-frontend-reference)
8. [AI Integration](#8-ai-integration)
9. [Configuration & Environment](#9-configuration--environment)
10. [Deployment](#10-deployment)

---

## 1. What is Tamarine

Tamarine is a full-stack web application that lets teachers create exercise sets for students using AI, share them via secure links, collect student answers, and get AI-powered corrections with detailed feedback.

### Core Workflow

```
Teacher creates exercise set → AI generates questions → Teacher reviews & saves
    → Teacher generates share link → Students answer via link
    → AI corrects submissions → Teacher reviews results
```

### Key Features

- **AI-Powered Question Generation** — uses DeepSeek LLM to generate subject-specific questions with configurable type, count, and difficulty
- **Flexible Question Types** — MCQ, short answer, essay, or mixed
- **Secure Link-Based Sharing** — no student login required; access via cryptographically random share codes
- **AI Correction with Feedback** — automatic grading with per-question score, correctness flag, and constructive feedback
- **Teacher Dashboard** — search, filter, and paginate exercises; view submission results with scoring
- **CSV Export** — download corrected results for gradebook import
- **Student-Friendly UI** — clean interface with welcome screen, progress tracking, and post-submission results

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Routing | React Router DOM 7 (lazy-loaded routes) |
| Backend | Node.js, Express 4, TypeScript |
| Database | SQLite (dev) / PostgreSQL (prod) via better-sqlite3 |
| AI | DeepSeek API (deepseek-chat model) |
| Styling | CSS Modules with design tokens |

---

## 2. How to Run

### Prerequisites

- Node.js 18+
- A DeepSeek API key (set as `DEEPSEEK_API_KEY`)

### Quick Start

```bash
# Clone and install
cd tamarine-app
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Set your API key
export DEEPSEEK_API_KEY="sk-your-key-here"

# Start both servers
npm run dev
```

This starts:
- **Backend** at `http://localhost:3001`
- **Frontend** at `http://localhost:5173`

### Manual Start

```bash
# Terminal 1 — Backend
cd server && npx tsx src/index.ts

# Terminal 2 — Frontend
cd client && npx vite
```

### Available Scripts (root `package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both servers concurrently |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run build` | Build both for production |
| `npm start` | Start production server |
| `npm test` | Run server tests |
| `npm run test:client` | Run client tests |

### Running Tests

```bash
# Server tests (vitest)
cd server && npm test

# Watch mode
cd server && npm run test:watch
```

---

## 3. How to Use

### For Teachers

#### Creating an Exercise

1. Go to **Create New** (`/exercises/new`)
2. Fill in the form:
   - **Subject** — e.g. "Mathematics", "History", "Biology"
   - **Number of Questions** — 1 to 20
   - **Question Type** — MCQ, Short Answer, Essay, or Mixed
   - **Difficulty** — Easy, Medium, Hard, or Mixed
   - **Instructions** (optional) — specific guidance for AI, e.g. "Focus on trigonometry"
3. Click **Generate Questions** — AI creates the questions
4. Review each question — use **Edit** to modify text, correct answer, options, or points
5. Click **Save Exercise**

#### Editing an Exercise

1. From the dashboard (`/exercises`), click **Edit** on any exercise
2. Modify exercise metadata (subject, type, difficulty, instructions) and **Save Details**
3. Edit individual questions inline — changes auto-save on blur
4. **Add Question** to append a new question
5. **Delete** to remove a question

#### Sharing with Students

1. From the dashboard, click **Share** on any exercise
2. The share URL is automatically copied to clipboard
3. Send this URL to students (e.g. `https://yourapp.com/s/a3f2b1c0`)

#### Viewing Results

1. From the dashboard, click **Results** on any exercise
2. The sidebar lists all submissions with status
3. Click a submission to view student answers
4. Click **Run AI Correction** to grade the submission
5. Corrected submissions show per-question:
   - Score (e.g. 4/5)
   - Correct/wrong status
   - AI-generated feedback
6. Use the CSV export via the API at `/api/submissions/exercise/:id/export`

### For Students

#### Taking an Exercise

1. Open the share link sent by your teacher
2. You'll see a welcome screen with exercise info — optionally enter your name
3. Click **Start Exercise** to begin
4. Answer each question:
   - **MCQ** — select one option
   - **Short Answer / Essay** — type in the text area
5. Track your progress via the "X / Y answered" indicator
6. Click **Submit Answers** when done

#### Viewing Your Results

1. After submitting, you're taken to the results page
2. The system auto-triggers AI correction
3. Once corrected, you'll see:
   - Overall score (e.g. 18/25 = 72%)
   - Per-question breakdown with your answer, correct answer, and feedback

---

## 4. Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Browser                           │
│  ┌──────────────────────────────────────────────┐    │
│  │  React SPA (Vite)                             │    │
│  │  /, /exercises, /exercises/new,                │    │
│  │  /exercises/:id/edit, /exercises/:id/results,  │    │
│  │  /s/:shareCode, /s/:shareCode/results/:id     │    │
│  └──────────────────┬────────────────────────────┘  │
│                     │ /api/* (proxied)               │
└─────────────────────┼────────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────────┐
│              Express Server (port 3001)               │
│  ┌──────────────────┴──────────────────────────────┐ │
│  │  Middleware: cors, json parser, error handler    │ │
│  ├─────────────────────────────────────────────────┤ │
│  │  Routes: /api/exercises, /api/links,             │ │
│  │  /api/submissions, /api/subjects                │ │
│  ├─────────────────────────────────────────────────┤ │
│  │  Services: AI generation, AI correction          │ │
│  ├─────────────────────────────────────────────────┤ │
│  │  DB Layer: better-sqlite3 + repository pattern   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────┴────────────────────────────────┐
│              SQLite Database (WAL mode)                │
│  6 tables: subjects, exercises, questions,             │
│  share_links, submissions, answers                    │
└──────────────────────────────────────────────────────┘
                       │
┌──────────────────────┴────────────────────────────────┐
│              DeepSeek API (external)                   │
│  POST /v1/chat/completions (deepseek-chat)             │
└──────────────────────────────────────────────────────┘
```

### Directory Structure

```
tamarine-app/
├── package.json              # Root: concurrently-based scripts
├── scripts/
│   └── dev.sh                # Shell-based dev launcher
├── server/
│   ├── package.json          # Express + better-sqlite3 + uuid
│   ├── tsconfig.json         # ES2022, commonjs, strict
│   ├── vitest.config.ts      # Test runner config
│   └── src/
│       ├── index.ts          # App entry: middleware, routes, listen
│       ├── db/
│       │   ├── schema.sql    # Full DDL (6 tables, 7 indexes)
│       │   ├── connection.ts # SQLite init: WAL, FK, schema migration
│       │   ├── exerciseRepository.ts  # Typed CRUD + search/pagination
│       │   └── index.ts      # Re-exports
│       ├── routes/
│       │   ├── exercises.ts  # CRUD + AI generation endpoint
│       │   ├── questions.ts  # Nested question CRUD under exercise
│       │   ├── shareLinks.ts # Link generation + student access + toggle
│       │   ├── submissions.ts# Submit answers + AI correct + CSV export
│       │   └── subjects.ts   # Subject CRUD
│       ├── middleware/
│       │   ├── errorHandler.ts # AppError class + error middleware + 404
│       │   └── validate.ts   # Declarative request body validation
│       └── services/
│           ├── ai.ts         # Facade: lazy DeepSeek client singleton
│           ├── correctionService.ts  # Submission correction orchestrator
│           └── ai/
│               ├── index.ts  # Barrel exports
│               ├── types.ts  # Shared AI type definitions
│               ├── client.ts # DeepSeek HTTP client (fetch-based)
│               ├── generator.ts  # Prompt builder + generate flow
│               ├── corrector.ts  # Per-question correction flow
│               └── parser.ts # JSON sanitizer for AI responses
├── client/
│   ├── package.json          # React 19 + Vite 6 + React Router 7
│   ├── tsconfig.json         # ESNext, bundler resolution, JSX react-jsx
│   ├── vite.config.ts        # React plugin + /api proxy to :3001 + @ alias
│   └── src/
│       ├── main.tsx          # ReactDOM root + BrowserRouter
│       ├── App.tsx           # Route definitions with lazy loading
│       ├── api/
│       │   ├── types.ts      # All TypeScript interfaces (14 types)
│       │   └── client.ts     # Typed fetch wrapper (17 API methods)
│       ├── components/
│       │   ├── Layout.tsx    # App shell: header, nav, outlet
│       │   ├── GenerationForm.tsx       # Exercise creation form
│       │   ├── QuestionCard.tsx         # Preview/edit card (generate flow)
│       │   ├── EditableQuestionCard.tsx # Inline edit card (edit flow)
│       │   ├── ExerciseMetaForm.tsx     # Metadata edit form
│       │   ├── SubmissionList.tsx       # Sidebar submission list
│       │   └── AnswerDetailCard.tsx     # Per-question answer display
│       ├── pages/
│       │   ├── Home.tsx              # Landing page with CTAs
│       │   ├── CreateExercise.tsx    # Full generation + save flow
│       │   ├── ExerciseList.tsx      # Dashboard: search, paginate, actions
│       │   ├── ExerciseEdit.tsx      # Post-creation editor
│       │   ├── StudentView.tsx       # Student answering interface
│       │   ├── Results.tsx           # Teacher results dashboard
│       │   └── StudentResults.tsx    # Student post-submission results
│       └── styles/
│           └── global.css   # Design tokens, reset, base styles
```

### Data Flow

```
[Create Flow]
  Form fill → POST /api/exercises/generate → DeepSeek API
    → JSON parse → display questions → edit
    → POST /api/exercises → save to DB

[Share Flow]
  Click Share → POST /api/links {exercise_id}
    → Generate UUID + random 8-char hex code
    → Return link with code → copy URL to clipboard

[Student Flow]
  Visit /s/:code → GET /api/links/:code
    → Validate active link → return exercise + questions (without answers)
    → Student fills answers → POST /api/submissions
    → Save answers → auto-trigger correction

[Correction Flow]
  POST /api/submissions/:id/correct
    → Fetch submission + answers + question correct_answers
    → For each answer: POST DeepSeek API with question, correct answer, student answer
    → Parse correction: is_correct, score, feedback
    → Save per-answer results → update submission total_score + status
```

---

## 5. Database Schema

### Entity Relationship Diagram

```
subjects ──┐
           │ (name reference, not FK)
           ▼
      exercises ──────────┐
           │               │
           │ 1:N           │ 1:N
           ▼               ▼
      questions       share_links
           │               │
           │               │ (via code)
           ▼               ▼
      answers ◄────── submissions
           N:1              │
                            │ (optional FK)
                            └── share_links
```

### Tables

#### `subjects`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| name | TEXT | NOT NULL, UNIQUE |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

#### `exercises`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| subject | TEXT | NOT NULL |
| question_count | INTEGER | NOT NULL |
| question_type | TEXT | NOT NULL, CHECK (mcq, short_answer, essay, mixed) |
| difficulty | TEXT | NOT NULL, CHECK (easy, medium, hard, mixed) |
| instructions | TEXT | NULLABLE |
| status | TEXT | NOT NULL, DEFAULT 'draft', CHECK (draft, generating, generated, ready) |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') |

#### `questions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| exercise_id | TEXT | NOT NULL, FK → exercises(id) ON DELETE CASCADE |
| order_index | INTEGER | NOT NULL |
| type | TEXT | NOT NULL, CHECK (mcq, short_answer, essay) |
| question_text | TEXT | NOT NULL |
| options | TEXT | NULLABLE (JSON array for MCQ) |
| correct_answer | TEXT | NULLABLE |
| points | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

**Index:** `(exercise_id, order_index)`

#### `share_links`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| exercise_id | TEXT | NOT NULL, FK → exercises(id) ON DELETE CASCADE |
| code | TEXT | NOT NULL, UNIQUE |
| is_active | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| expires_at | TEXT | NULLABLE |

**Indexes:** `(code)`, `(exercise_id)`

#### `submissions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| exercise_id | TEXT | NOT NULL, FK → exercises(id) ON DELETE CASCADE |
| share_link_id | TEXT | NULLABLE, FK → share_links(id) ON DELETE SET NULL |
| student_name | TEXT | NULLABLE |
| status | TEXT | NOT NULL, DEFAULT 'submitted', CHECK (submitted, correcting, corrected) |
| total_score | REAL | NULLABLE |
| max_score | REAL | NULLABLE |
| submitted_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| corrected_at | TEXT | NULLABLE |

**Indexes:** `(exercise_id)`, `(share_link_id)`

#### `answers`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| submission_id | TEXT | NOT NULL, FK → submissions(id) ON DELETE CASCADE |
| question_id | TEXT | NOT NULL, FK → questions(id) ON DELETE CASCADE |
| student_answer | TEXT | NULLABLE |
| is_correct | INTEGER | NULLABLE (0 or 1, set after correction) |
| score | REAL | NULLABLE |
| max_score | REAL | NULLABLE |
| feedback | TEXT | NULLABLE (AI-generated) |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |

**Indexes:** `(submission_id)`, `(question_id)`

### Database Configuration

- **Engine:** SQLite via `better-sqlite3` (synchronous, fast)
- **Journal Mode:** WAL (Write-Ahead Logging) for concurrent read performance
- **Foreign Keys:** Enforced (`PRAGMA foreign_keys = ON`)
- **Schema Migration:** Automatic on startup — `schema.sql` uses `CREATE TABLE IF NOT EXISTS`
- **Location:** `server/data/tamarine.db` (configurable via `DB_PATH` env var)

---

## 6. API Reference

### Base URL

```
http://localhost:3001/api
```

All endpoints return JSON. Errors return `{ "error": "message" }` with appropriate HTTP status codes.

### Health Check

```
GET /api/health
→ 200 { "status": "ok", "timestamp": "2026-05-19T..." }
```

---

### Exercises

#### Generate (AI) — does NOT save
```
POST /api/exercises/generate
Body: {
  "subject": "Mathematics",        // required, string
  "question_count": 5,             // required, 1-20
  "question_type": "mixed",        // required: mcq | short_answer | essay | mixed
  "difficulty": "medium",          // required: easy | medium | hard | mixed
  "instructions": "Focus on..."    // optional
}
→ 200 { "questions": [ GeneratedQuestion, ... ] }
```

#### List (with search, filter, pagination)
```
GET /api/exercises?search=math&subject=Mathematics&question_type=mcq&difficulty=medium&status=ready&page=1&limit=20
→ 200 {
  "data": [ Exercise, ... ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

#### Get One (with questions and share links)
```
GET /api/exercises/:id
→ 200 { ExerciseWithDetails }
→ 404 { "error": "Exercise not found" }
```

#### Create (with questions)
```
POST /api/exercises
Body: {
  "subject": "...",
  "question_count": 5,
  "question_type": "mixed",
  "difficulty": "medium",
  "instructions": "...",         // optional
  "questions": [ GeneratedQuestion, ... ]
}
→ 201 Exercise
```

#### Update
```
PUT /api/exercises/:id
Body: {
  "subject": "...",           // all fields optional
  "question_type": "...",
  "difficulty": "...",
  "instructions": "...",
  "status": "ready"
}
→ 200 Exercise | 404
```

#### Delete
```
DELETE /api/exercises/:id
→ 200 { "success": true }
→ 404 { "error": "Exercise not found" }
```

---

### Questions

Nested under exercises: `/api/exercises/:id/questions`

#### Update
```
PUT /api/exercises/:id/questions/:questionId
Body: {
  "question_text": "...",
  "type": "mcq",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "A",
  "points": 5
}
→ 200 Question | 404
```

#### Add
```
POST /api/exercises/:id/questions
Body: {
  "question_text": "New question",
  "type": "short_answer",
  "correct_answer": "...",
  "points": 1,
  "options": [...]              // for MCQ only
}
→ 201 Question | 404
```

#### Delete
```
DELETE /api/exercises/:id/questions/:questionId
→ 200 { "success": true } | 404
```

---

### Share Links

#### Create
```
POST /api/links
Body: { "exercise_id": "uuid" }
→ 201 ShareLink
→ 404 if exercise not found
```

#### Get (student access — returns exercise + questions WITHOUT answers)
```
GET /api/links/:code
→ 200 { ShareLink + exercise fields + questions[] }
→ 404 { "error": "Share link not found or inactive" }
```

Note: The questions returned to students do NOT include `correct_answer`.

#### Toggle Active
```
PUT /api/links/:code/toggle
→ 200 { "code": "...", "is_active": 0|1 }
```

#### List by Exercise
```
GET /api/links/exercise/:exerciseId
→ 200 [ ShareLink, ... ]
```

---

### Submissions

#### Submit Answers
```
POST /api/submissions
Body: {
  "share_code": "a3f2b1c0",
  "student_name": "Alice",          // optional
  "answers": [
    { "question_id": "uuid", "student_answer": "Paris" },
    ...
  ]
}
→ 201 Submission
→ 404 if share link invalid/inactive
```

#### List for Exercise
```
GET /api/submissions/exercise/:exerciseId
→ 200 [ Submission, ... ]  (includes answer_count)
```

#### Get One (with answers + question details)
```
GET /api/submissions/:id
→ 200 SubmissionWithAnswers | 404
```

#### Trigger AI Correction
```
POST /api/submissions/:id/correct
→ 200 Submission (status="corrected", with total_score)
→ 400 if already corrected
→ 404
```

### Export CSV
```
GET /api/submissions/exercise/:exerciseId/export
→ 200 text/csv
Columns: Student Name, Total Score, Max Score, Percentage, Submitted At, Corrected At
Note: Only exports submissions with status="corrected"
```

---

### Subjects

#### List All (with exercise counts)
```
GET /api/subjects
→ 200 [ { id, name, created_at, exercise_count }, ... ]
```

#### Create
```
POST /api/subjects
Body: { "name": "Mathematics" }
→ 201 Subject
→ 409 { "error": "Subject already exists" }
```

#### Delete
```
DELETE /api/subjects/:id
→ 200 { "success": true }
→ 404 { "error": "Subject not found" }
```

---

## 7. Frontend Reference

### Route Map

| Path | Page Component | Description |
|------|---------------|-------------|
| `/` | Home | Landing page with CTA buttons |
| `/exercises` | ExerciseList | Dashboard: search, paginated exercise list with actions |
| `/exercises/new` | CreateExercise | AI generation form + question review + save |
| `/exercises/:id/edit` | ExerciseEdit | Edit metadata and questions inline |
| `/exercises/:id/results` | Results | Teacher: submissions list + per-submission answer detail + correction |
| `/s/:shareCode` | StudentView | Student: welcome → answer form → submit |
| `/s/:shareCode/results/:submissionId` | StudentResults | Student: auto-correct → score + per-question feedback |

All routes except Home and Student routes are **lazy-loaded** (React `lazy()` + `Suspense`) for code splitting.

### Component Tree

```
App
└── Routes
    └── Layout (shared shell)
        ├── Header (logo + nav: Exercises, Create New)
        ├── <Outlet />
        │   ├── Home                                  — static landing
        │   ├── CreateExercise                        — generation flow
        │   │   └── GenerationForm                    — subject, count, type, difficulty, instructions
        │   │   └── QuestionCard[]                    — per-question preview + edit toggle + delete
        │   ├── ExerciseList                          — dashboard
        │   │   └── Search bar + pagination controls
        │   │   └── Exercise cards (Edit, Share, Results, Delete actions)
        │   ├── ExerciseEdit                          — post-creation editor
        │   │   └── ExerciseMetaForm                  — subject, type, difficulty, instructions
        │   │   └── EditableQuestionCard[]            — inline editable question
        │   ├── Results                               — teacher results
        │   │   └── SubmissionList                    — sidebar list
        │   │   └── AnswerDetailCard[]                — per-answer detail view
        │   ├── StudentView (no header — clean UI)    — student answering
        │   └── StudentResults (no header)            — student results
```

### State Management

There is **no global state library**. Each page manages its own state via `useState` and `useCallback`. Data fetching uses `useEffect` with dependency arrays. The pattern:

```typescript
const [data, setData] = useState<Type | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const result = await api.someMethod(params);
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [deps]);
```

### API Client (`client/src/api/client.ts`)

A typed fetch wrapper with 17 methods:

```typescript
const api = {
  // Exercises: list, get, create, update, delete, generate
  // Questions: update, add, delete
  // Share links: create, get, toggle
  // Submissions: submit, list, get, correct, export (via endpoint)
  // Subjects: list, create, delete
};
```

- All requests prepend `/api` base path
- Errors are thrown as `Error` with the server's error message
- Response is parsed as JSON automatically
- Vite dev server proxies `/api` → `localhost:3001`

### Design Tokens (`global.css`)

```css
--color-primary: #4f46e5 (indigo)
--color-success: #059669
--color-warning: #d97706
--color-danger: #dc2626
--radius: 8px
--shadow: 0 1px 3px rgba(0,0,0,0.1)
```

Base: system font stack, antialiased, gray-50 background.

### CSS Modules

Every component has a co-located `.module.css` file. Class names are locally scoped; no global style collisions.

---

## 8. AI Integration

### Provider: DeepSeek

Tamarine uses the **DeepSeek API** (`deepseek-chat` model) via direct HTTP fetch calls (no SDK dependency).

### Client Implementation

`server/src/services/ai/client.ts` — `createDeepSeekClient(apiKey?)`

```typescript
interface AiClient {
  chat(messages: { role, content }[]): Promise<string>;
}
```

- API key from `DEEPSEEK_API_KEY` env var or passed explicitly
- Endpoint: `https://api.deepseek.com/v1/chat/completions`
- Settings: `temperature: 0.7`, `max_tokens: 4000`
- Client is lazily instantiated as a singleton (`server/src/services/ai.ts`)

### Question Generation

`server/src/services/ai/generator.ts`

**Input:** `ExerciseGenerationParams` (subject, count, type, difficulty, optional instructions)

**Prompt Strategy:**
- System message: "You are an expert educator creating high-quality {subject} exercises. You output ONLY valid JSON arrays."
- User message builds specific instructions based on question type and difficulty
- Requests JSON array of `{ type, question_text, options?, correct_answer, points }`

**Output Parsing:** `server/src/services/ai/parser.ts`

- Strips markdown code fences if present
- Parses JSON
- Validates array structure
- Clamps points to 1–10 range
- Returns `GeneratedQuestion[]`

### Answer Correction

`server/src/services/ai/corrector.ts`

**Input:** `CorrectionParams` (question_text, type, correct_answer, student_answer, max_score)

**Prompt Strategy:**
- System: "You are an expert educator correcting student answers. Output ONLY valid JSON."
- Different prompt templates for MCQ, essay, and short_answer
- MCQ: strict comparison against correct option
- Essay: evaluates completeness, accuracy, clarity; awards partial credit
- Short answer: lenient with wording differences if concept is correct

**Output:** `{ is_correct: boolean, score: number, feedback: string }`

### Correction Orchestration

`server/src/services/correctionService.ts`

1. Set submission status to `correcting`
2. Fetch all answers with question details
3. Call `correctAnswer()` for each answer individually
4. On failure for individual answer: set score=0, feedback="Could not evaluate"
5. Sum all scores → update submission `total_score` + set status to `corrected`

### StudentResults Auto-Correction

When a student views their results page:
1. If status is `submitted`, the client triggers `POST /api/submissions/:id/correct`
2. While status is `correcting`, the client polls every 2 seconds
3. On `corrected`, displays final results

### Error Resilience

The parser handles:
- AI responses wrapped in markdown code fences
- Missing fields (defaults applied)
- Invalid JSON (throws descriptive error)
- Individual answer correction failures (gracefully degrades, doesn't block other answers)

---

## 9. Configuration & Environment

### Server Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `DB_PATH` | `server/data/tamarine.db` | SQLite database file path |
| `DEEPSEEK_API_KEY` | (required) | DeepSeek API key |

### Client Environment

| Variable | Default | Description |
|----------|---------|-------------|
| Vite proxy | `/api` → `http://localhost:3001` | Dev API forwarding |
| Vite port | `5173` | Dev server port |

### Production Build

```bash
npm run build           # Builds client (Vite) + server (tsc)
npm start               # Starts server serving built client
```

---

## 10. Deployment

### Render / Vercel

1. Set `DEEPSEEK_API_KEY` in environment variables
2. Build command: `npm run build`
3. Start command: `npm start`
4. For PostgreSQL in production, swap `better-sqlite3` for `pg` or use a managed service

### Security Notes

- Share link codes are 8-character hex (32-bit random via `crypto.randomBytes(4)`) — sufficient for casual sharing but not cryptographically strong for sensitive data
- Student names are optional and not authenticated
- No authentication system — links are the sole access control mechanism
- AI API calls use server-side key (never exposed to client)
- CORS is enabled for all origins (dev convenience; tighten for production)

---

## Appendix A: TypeScript Types Reference

Full type definitions live in two locations:

- **Server types:** `server/src/services/ai/types.ts` — `ExerciseGenerationParams`, `GeneratedQuestion`, `CorrectionParams`, `CorrectionResult`
- **Client types:** `client/src/api/types.ts` — `Exercise`, `Question`, `ShareLink`, `Submission`, `Answer`, `Subject`, `ExerciseWithDetails`, `SubmissionWithAnswers`, `GeneratedQuestion`, `PaginatedResponse<T>`
- **Repository types:** `server/src/db/exerciseRepository.ts` — `ExerciseFilters`

## Appendix B: Request Validation Rules

Declared via `validate()` middleware in `server/src/middleware/validate.ts`:

| Endpoint | Rules |
|----------|-------|
| `POST /exercises/generate` | subject (required string), question_count (required number 1-20), question_type (required, enum), difficulty (required, enum) |
| Other endpoints | Validated inline or at DB layer (FK constraints, CHECK constraints) |
