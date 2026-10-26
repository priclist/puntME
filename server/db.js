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

  -- Photos and videos an owner adds to their page. Files live in data/media/.
  CREATE TABLE IF NOT EXISTS media (
    id          TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    file        TEXT NOT NULL,
    bytes       INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS media_business ON media(business_id, created_at);

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

  -- Chats between a customer and a business. Each side has its own read
  -- point, mute and "deleted from my list" time.
  CREATE TABLE IF NOT EXISTS conversations (
    id                   TEXT PRIMARY KEY,
    business_id          TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at           INTEGER NOT NULL,
    last_message_at      INTEGER NOT NULL,
    last_preview         TEXT NOT NULL DEFAULT '',
    customer_read_at     INTEGER NOT NULL DEFAULT 0,
    owner_read_at        INTEGER NOT NULL DEFAULT 0,
    customer_muted       INTEGER NOT NULL DEFAULT 0,
    owner_muted          INTEGER NOT NULL DEFAULT 0,
    customer_archived_at INTEGER,
    owner_archived_at    INTEGER,
    UNIQUE (business_id, customer_id)
  );
  CREATE INDEX IF NOT EXISTS conversations_customer ON conversations(customer_id, last_message_at);
  CREATE INDEX IF NOT EXISTS conversations_business ON conversations(business_id, last_message_at);

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT NOT NULL DEFAULT '',
    photo           TEXT,
    created_at      INTEGER NOT NULL,
    edited_at       INTEGER,
    deleted_at      INTEGER
  );
  CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, created_at);
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
