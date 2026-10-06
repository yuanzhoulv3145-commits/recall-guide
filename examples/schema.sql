-- Minimal tables the examples use. Adapt names to your own store.

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',     -- only 'active' rows are ever recalled
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One embedding per memory (Float32Array stored as a BLOB).
CREATE TABLE IF NOT EXISTS memory_vectors (
  memory_id TEXT PRIMARY KEY,
  vector BLOB NOT NULL
);

-- Chat rows; pictures she sent carry a one-line caption written offline.
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,                       -- 'user' | 'ai'
  content TEXT NOT NULL,                      -- '[img]/path.jpg' for pictures
  img_desc TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                         -- YYYY-MM-DD
  title TEXT,
  content TEXT NOT NULL,
  source TEXT                                 -- 'daily' | 'self' | 'dream'
);

-- One row per turn: why something was (or was not) recalled.
CREATE TABLE IF NOT EXISTS recall_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  said TEXT NOT NULL,
  search INTEGER,
  topic TEXT,
  keywords TEXT,
  date_filter TEXT,
  candidate_ids TEXT,
  pick_id TEXT,
  reason TEXT NOT NULL,
  ms INTEGER
);

CREATE TABLE IF NOT EXISTS recall_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  kind TEXT NOT NULL DEFAULT 'other',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',       -- draft | active | off
  last_given_at TEXT
);
