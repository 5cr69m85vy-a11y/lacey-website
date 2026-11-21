-- 0015: فريقان منفصلان للموظفين (دعم / روتين) مع دور وصلاحيات إضافية يحددها المدير
ALTER TABLE staff ADD COLUMN team TEXT NOT NULL DEFAULT 'support';
ALTER TABLE staff ADD COLUMN role TEXT NOT NULL DEFAULT '';
ALTER TABLE staff ADD COLUMN perms TEXT NOT NULL DEFAULT '[]';
