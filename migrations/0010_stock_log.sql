-- 0010: سجلّ حركة المخزون (بيع / إلغاء / استلام / تعديل)
CREATE TABLE IF NOT EXISTS stock_log (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, delta INTEGER NOT NULL, kind TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', after_qty INTEGER, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_stock_log_code ON stock_log(code, at);
CREATE INDEX IF NOT EXISTS idx_stock_log_at ON stock_log(at);
