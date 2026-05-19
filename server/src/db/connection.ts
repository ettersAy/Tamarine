import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'tamarine.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = initDb();
  }
  return db;
}

function initDb(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const database = new Database(DB_PATH);

  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  database.exec(schema);

  return database;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
