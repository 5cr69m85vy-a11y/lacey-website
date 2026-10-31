-- 0007: تاريخ الميلاد (الحد الأدنى 15 سنة) ونوع البشرة للروتين
ALTER TABLE customers ADD COLUMN birth TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN skin TEXT NOT NULL DEFAULT '';
