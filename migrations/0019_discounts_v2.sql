-- Discounts v2: name, start date, cap, per-customer limit, brand/category targeting, first-order, automatic discounts, usage log
ALTER TABLE discount_codes ADD COLUMN name TEXT;
ALTER TABLE discount_codes ADD COLUMN starts_at INTEGER;
ALTER TABLE discount_codes ADD COLUMN max_disc INTEGER;
ALTER TABLE discount_codes ADD COLUMN per_cust INTEGER;
ALTER TABLE discount_codes ADD COLUMN brands TEXT;
ALTER TABLE discount_codes ADD COLUMN cats TEXT;
ALTER TABLE discount_codes ADD COLUMN first_only INTEGER NOT NULL DEFAULT 0;
ALTER TABLE discount_codes ADD COLUMN autoapply INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS discount_uses (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, phone TEXT NOT NULL, order_code TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_discount_uses ON discount_uses(code, phone);
