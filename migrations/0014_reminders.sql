-- 0014: تذكيرات: سلة متروكة، رجوع المنتج للمخزون، إعادة الشراء
CREATE TABLE IF NOT EXISTS carts (customer_id INTEGER PRIMARY KEY, items TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL, reminded_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS stock_watch (customer_id INTEGER NOT NULL, code TEXT NOT NULL, created_at INTEGER NOT NULL, notified_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (customer_id, code));
CREATE INDEX IF NOT EXISTS idx_watch_code ON stock_watch(code, notified_at);
CREATE TABLE IF NOT EXISTS reorder_log (order_code TEXT NOT NULL, code TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (order_code, code));
