-- Customer account center: photo, wishlist, addresses, product reviews
CREATE TABLE IF NOT EXISTS customer_photos (
  customer_id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, type TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wishlist (
  customer_id INTEGER NOT NULL, product_code TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (customer_id, product_code)
);
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, label TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', landmark TEXT NOT NULL DEFAULT '', is_default INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_addr_cust ON addresses(customer_id);
CREATE TABLE IF NOT EXISTS product_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, product_code TEXT NOT NULL, order_code TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', reply TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  UNIQUE (customer_id, product_code)
);
CREATE INDEX IF NOT EXISTS ix_rev_prod ON product_reviews(product_code, status);
ALTER TABLE customers ADD COLUMN photo_key TEXT;
ALTER TABLE customers ADD COLUMN photo_at INTEGER;
