-- 0011: يوميات البشرة تُحفظ في حساب الزبونة
ALTER TABLE customers ADD COLUMN diary TEXT NOT NULL DEFAULT '';
