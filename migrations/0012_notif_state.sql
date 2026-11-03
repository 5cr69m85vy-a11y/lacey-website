-- 0012: حالة الإشعار عند الزبونة (مقروء / مخفي) دون المساس بطابور واتساب
ALTER TABLE notifications ADD COLUMN read_at INTEGER;
ALTER TABLE notifications ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
