-- 0016: بوابة الموظفين: تغيير كلمة السر أول دخول، آخر دخول، حالة سير المحادثة
ALTER TABLE staff ADD COLUMN must_change INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN last_login INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chats ADD COLUMN wf TEXT NOT NULL DEFAULT '';
