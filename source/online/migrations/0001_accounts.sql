PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS principals (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('guest','account')),
 username TEXT UNIQUE, password_hash TEXT, salt TEXT, recovery_hash TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, principal_id TEXT NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_owner ON sessions(principal_id);
CREATE TABLE IF NOT EXISTS assessments (
 id TEXT PRIMARY KEY, principal_id TEXT NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
 request_key TEXT NOT NULL, encrypted TEXT NOT NULL, risk TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(principal_id,request_key)
);
CREATE INDEX IF NOT EXISTS assessments_owner ON assessments(principal_id,created_at);
CREATE TABLE IF NOT EXISTS plans (
 id TEXT PRIMARY KEY, principal_id TEXT NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
 assessment_id TEXT NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
 encrypted TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS plans_owner ON plans(principal_id,created_at);
CREATE TABLE IF NOT EXISTS checkins (
 principal_id TEXT NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
 day TEXT NOT NULL, encrypted TEXT NOT NULL, PRIMARY KEY(principal_id,day)
);
CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY, principal_id TEXT NOT NULL UNIQUE REFERENCES principals(id) ON DELETE CASCADE,
 encrypted TEXT NOT NULL, authorized INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS appointments (
 id TEXT PRIMARY KEY, lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
 encrypted TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attribution (
 principal_id TEXT PRIMARY KEY REFERENCES principals(id) ON DELETE CASCADE,
 source TEXT NOT NULL, campaign TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
 id TEXT PRIMARY KEY, principal_id TEXT NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
 name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY, counter INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
