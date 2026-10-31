-- 0008: أقسام الدعم (خدمة العملاء / روتين)، إيصالات القراءة، مؤشر الكتابة، روتين محفوظ، موافقة التسويق
ALTER TABLE chats ADD COLUMN dept TEXT NOT NULL DEFAULT 'service';
ALTER TABLE chats ADD COLUMN staff_seen_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chats ADD COLUMN cust_seen_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chats ADD COLUMN staff_typing_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN routine TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN mkt INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_chats_dept ON chats(dept, status);
