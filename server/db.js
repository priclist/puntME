// SQLite storage, using Node's built-in driver (Node 22.13+), so there is
// nothing native to compile on the server.

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id              TEXT PRIMARY KEY,
    owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    job             TEXT NOT NULL,
    category_id     TEXT,
    description     TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL,
    whatsapp        INTEGER NOT NULL DEFAULT 1,
    email           TEXT,
    website         TEXT,
    area_label      TEXT NOT NULL,
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    radius_km       INTEGER NOT NULL DEFAULT 15,
    hours           TEXT NOT NULL DEFAULT '[]',
    logo            TEXT,
    google_place_id TEXT,
    status          TEXT NOT NULL DEFAULT 'live',
    views           INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    published_at    INTEGER
  );
  CREATE INDEX IF NOT EXISTS businesses_owner ON businesses(owner_id);

  CREATE TABLE IF NOT EXISTS quotes (
    id          TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    message     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    read_at     INTEGER
  );
  CREATE INDEX IF NOT EXISTS quotes_business ON quotes(business_id, created_at);

  CREATE TABLE IF NOT EXISTS push_subs (
    endpoint   TEXT PRIMARY KEY,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    prefs      TEXT NOT NULL DEFAULT '{}',
    alerts     TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS push_subs_user ON push_subs(user_id);
`

export function openDb(dataDir) {
  mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(join(dataDir, 'puntme.db'))
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;')
  db.exec(SCHEMA)
  return db
}

/** Short random id for businesses and quotes, safe in URLs. */
export const newId = () => randomBytes(6).toString('base64url')

export const now = () => Date.now()

export function parseJson(text, fallback) {
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}
