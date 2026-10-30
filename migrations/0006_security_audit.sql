-- 0006: حدود المحاولات، سجل التدقيق، أفتار الزبون
CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, reset_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_rate_reset ON rate_limits(reset_at);
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL DEFAULT '', before TEXT, after TEXT, ip TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
ALTER TABLE customers ADD COLUMN avatar TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);
