-- 0018: بوت الدعم: ربط معرّف تلغرام بحساب موظف + تذكير «زبون ينتظر»
ALTER TABLE tg_recipients ADD COLUMN staff_id INTEGER;
ALTER TABLE chats ADD COLUMN tg_wait_at INTEGER NOT NULL DEFAULT 0;
