PRAGMA foreign_keys = ON;
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  draft_json TEXT NOT NULL,
  published_json TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  published_version INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);
CREATE INDEX posts_published ON posts(published_at DESC) WHERE published_json IS NOT NULL;
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  draft_json TEXT NOT NULL,
  published_json TEXT,
  post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  published_version INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);
CREATE INDEX albums_published ON albums(published_at DESC) WHERE published_json IS NOT NULL;
CREATE INDEX albums_post ON albums(post_id);
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  image_key TEXT NOT NULL UNIQUE,
  thumb_key TEXT NOT NULL UNIQUE,
  width INTEGER NOT NULL CHECK(width BETWEEN 1 AND 2000),
  height INTEGER NOT NULL CHECK(height BETWEEN 1 AND 2000),
  bytes INTEGER NOT NULL CHECK(bytes > 0),
  mime TEXT NOT NULL CHECK(mime = 'image/webp'),
  draft_alt TEXT NOT NULL,
  draft_position INTEGER NOT NULL,
  draft_deleted INTEGER NOT NULL DEFAULT 0 CHECK(draft_deleted IN (0,1)),
  published_alt TEXT,
  published_position INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX photos_album ON photos(album_id, draft_position);
CREATE TABLE object_deletions (
  object_key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE request_limits (
  identity TEXT NOT NULL,
  minute INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(identity, minute)
);
