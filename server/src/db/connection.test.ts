import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const TEST_DB = path.join(__dirname, '..', '..', 'data', 'test.db');

describe('Database', () => {
  let db: Database.Database;

  beforeAll(() => {
    const dir = path.dirname(TEST_DB);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

    db = new Database(TEST_DB);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  it('creates all tables', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as any[];
    const names = tables.map(t => t.name);
    expect(names).toContain('subjects');
    expect(names).toContain('exercises');
    expect(names).toContain('questions');
    expect(names).toContain('share_links');
    expect(names).toContain('submissions');
    expect(names).toContain('answers');
  });

  it('inserts and reads subjects', () => {
    const id = 'test-subject-1';
    db.prepare('INSERT INTO subjects (id, name) VALUES (?, ?)').run(id, 'Math');
    const row = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as any;
    expect(row.name).toBe('Math');
  });

  it('enforces unique subject names', () => {
    expect(() => {
      db.prepare('INSERT INTO subjects (id, name) VALUES (?, ?)').run('test-subject-2', 'Math');
    }).toThrow();
  });

  it('cascades deletes from exercises to questions', () => {
    db.prepare(
      'INSERT INTO exercises (id, subject, question_count, question_type, difficulty) VALUES (?, ?, ?, ?, ?)'
    ).run('ex-1', 'Math', 1, 'mcq', 'easy');

    db.prepare(
      'INSERT INTO questions (id, exercise_id, order_index, type, question_text) VALUES (?, ?, ?, ?, ?)'
    ).run('q-1', 'ex-1', 1, 'mcq', 'Test?');

    let count = (db.prepare('SELECT COUNT(*) as c FROM questions WHERE exercise_id = ?').get('ex-1') as any).c;
    expect(count).toBe(1);

    db.prepare('DELETE FROM exercises WHERE id = ?').run('ex-1');
    count = (db.prepare('SELECT COUNT(*) as c FROM questions WHERE exercise_id = ?').get('ex-1') as any).c;
    expect(count).toBe(0);
  });
});
