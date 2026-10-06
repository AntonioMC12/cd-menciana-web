PRAGMA foreign_keys = ON;
-- References to the existing source catalogue, never a second editable catalogue.
CREATE TABLE stock_products (
  id TEXT PRIMARY KEY,
  metadata TEXT NOT NULL,
  source_active INTEGER NOT NULL DEFAULT 1 CHECK(source_active IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE stock_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES stock_products(id),
  options_json TEXT NOT NULL DEFAULT '{}',
  options_key TEXT NOT NULL DEFAULT '{}',
  sku TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(typeof(quantity)='integer' AND quantity BETWEEN 0 AND 1000000),
  low_threshold INTEGER CHECK(low_threshold IS NULL OR (typeof(low_threshold)='integer' AND low_threshold BETWEEN 0 AND 1000000)),
  configured INTEGER NOT NULL DEFAULT 0 CHECK(configured IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  operation_id TEXT NOT NULL DEFAULT '',
  operation_kind TEXT NOT NULL DEFAULT '',
  operation_reason TEXT NOT NULL DEFAULT '',
  operation_note TEXT NOT NULL DEFAULT '',
  operation_actor TEXT NOT NULL DEFAULT '',
  operation_hash TEXT NOT NULL DEFAULT '',
  UNIQUE(product_id,options_key)
);
CREATE INDEX stock_variants_product ON stock_variants(product_id,active);
CREATE UNIQUE INDEX stock_variants_sku ON stock_variants(product_id,sku) WHERE sku<>'';
CREATE TRIGGER stock_variant_shape_insert BEFORE INSERT ON stock_variants
WHEN NEW.active=1 AND EXISTS(SELECT 1 FROM stock_variants WHERE product_id=NEW.product_id AND active=1 AND (options_key='{}' OR NEW.options_key='{}'))
BEGIN SELECT RAISE(ABORT,'simple_variant_conflict'); END;
CREATE TRIGGER stock_variant_shape_update BEFORE UPDATE OF options_key,active ON stock_variants
WHEN NEW.active=1 AND EXISTS(SELECT 1 FROM stock_variants WHERE product_id=NEW.product_id AND active=1 AND id<>NEW.id AND (options_key='{}' OR NEW.options_key='{}'))
BEGIN SELECT RAISE(ABORT,'simple_variant_conflict'); END;
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES stock_variants(id),
  kind TEXT NOT NULL CHECK(kind IN ('entry','exit','adjust')),
  previous_quantity INTEGER NOT NULL,
  next_quantity INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  options_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX stock_movements_variant ON stock_movements(variant_id,created_at);
-- The inventory change and its audit entry are one atomic SQLite statement.
CREATE TRIGGER stock_movement_audit AFTER UPDATE ON stock_variants
WHEN NEW.operation_id <> OLD.operation_id
BEGIN
  INSERT INTO stock_movements(id,variant_id,kind,previous_quantity,next_quantity,difference,reason,note,actor,request_hash,options_json)
  VALUES(NEW.operation_id,NEW.id,NEW.operation_kind,OLD.quantity,NEW.quantity,NEW.quantity-OLD.quantity,NEW.operation_reason,NEW.operation_note,NEW.operation_actor,NEW.operation_hash,NEW.options_json);
END;
CREATE TRIGGER stock_prevent_variant_delete BEFORE DELETE ON stock_variants
WHEN EXISTS(SELECT 1 FROM stock_movements WHERE variant_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'Archive variants with history instead of deleting'); END;
CREATE TABLE stock_sessions (
  token_hash TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK(purpose IN ('login','app')),
  csrf TEXT NOT NULL,
  actor TEXT NOT NULL,
  credential_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX stock_sessions_expiry ON stock_sessions(expires_at);
CREATE TABLE stock_login_limits (
  identity TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY(identity,bucket)
);
