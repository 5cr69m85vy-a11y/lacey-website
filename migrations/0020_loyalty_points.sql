-- Loyalty points: immutable ledger (append-only), per-order idempotency, FIFO lots with 12-month expiry
CREATE TABLE IF NOT EXISTS points_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  kind TEXT NOT NULL,            -- earn | redeem | restore | reverse | expire | adjust
  points INTEGER NOT NULL,       -- signed
  order_code TEXT,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT 'system',
  expires_at INTEGER,            -- for lots (earn/restore/positive adjust)
  remaining INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_pl_cust ON points_ledger(customer_id, at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pl_order_kind ON points_ledger(order_code, kind) WHERE order_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_pl_lots ON points_ledger(expires_at) WHERE remaining > 0;
ALTER TABLE orders ADD COLUMN pts_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN pts_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN pts_earned INTEGER NOT NULL DEFAULT 0;
