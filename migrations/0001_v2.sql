-- SporNRD v2: Bu dosya sadece AYRI TEST D1 veritabanında uygulanmalı.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS source_groups (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_id TEXT NOT NULL REFERENCES source_groups(id),
  official_site TEXT,
  directory_url TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK(status IN ('candidate','review','active','suspended','rejected')),
  identity_verified INTEGER NOT NULL DEFAULT 0 CHECK(identity_verified IN (0,1)),
  rights_mode TEXT NOT NULL DEFAULT 'unknown' CHECK(rights_mode IN ('unknown','summary_link','permission')),
  reader_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_checked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status, group_id);
CREATE TABLE IF NOT EXISTS source_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK(status IN ('candidate','verified','blocked')),
  UNIQUE(source_id, url)
);
CREATE TABLE IF NOT EXISTS source_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  kind TEXT NOT NULL,
  evidence_url TEXT,
  note TEXT,
  observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  original_url TEXT NOT NULL UNIQUE,
  original_title TEXT NOT NULL,
  original_excerpt TEXT,
  original_published_at TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  content_title TEXT,
  topic_tags TEXT NOT NULL DEFAULT '[]',
  facts_json TEXT NOT NULL DEFAULT '{}',
  editorial_title TEXT NOT NULL,
  editorial_summary TEXT NOT NULL,
  social_caption TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  state TEXT NOT NULL CHECK(state IN ('published','withdrawn')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_feed ON content_items(state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_category ON content_items(category, state, created_at DESC);
CREATE TABLE IF NOT EXISTS metrics (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS learning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT REFERENCES content_items(id),
  source_id TEXT REFERENCES sources(id),
  signal TEXT NOT NULL CHECK(signal IN ('save','share','useful','not_useful','wrong_category','report')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_learning_events ON learning_events(signal, created_at DESC);
CREATE TABLE IF NOT EXISTS scan_runs (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT, scanned INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0, errors_json TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
