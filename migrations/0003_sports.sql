CREATE TABLE IF NOT EXISTS sports_snapshots (
  key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
