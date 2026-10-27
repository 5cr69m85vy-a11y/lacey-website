-- Lacey Store — schema v1 (Cloudflare D1)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  code TEXT PRIMARY KEY, sort INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL DEFAULT 0, old_price INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '', grp TEXT NOT NULL DEFAULT '', best INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL, updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY, sort INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1, data TEXT NOT NULL, updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE, email TEXT UNIQUE, google_sub TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', landmark TEXT NOT NULL DEFAULT '',
  wa_verified INTEGER NOT NULL DEFAULT 0, orders_count INTEGER NOT NULL DEFAULT 0, spent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, first_order_at INTEGER, last_order_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_seen ON customers(last_seen_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, customer_id INTEGER NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL, code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

CREATE TABLE IF NOT EXISTS orders (
  code TEXT PRIMARY KEY, id INTEGER NOT NULL, customer_id INTEGER,
  name TEXT NOT NULL, phone TEXT NOT NULL, city TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', landmark TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL, subtotal INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, shipping INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
  discount_codes TEXT NOT NULL DEFAULT '[]', pay_method TEXT NOT NULL DEFAULT 'cod',
  -- 0 cancelled, 1 received, 2 confirmed, 3 shipped, 4 on the way, 5 delivered
  status INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL, confirmed_at INTEGER, shipped_at INTEGER, delivering_at INTEGER, delivered_at INTEGER,
  cancelled_at INTEGER, cancel_reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_code TEXT NOT NULL, status INTEGER NOT NULL,
  at INTEGER NOT NULL, actor TEXT NOT NULL DEFAULT 'system', note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_code, at);

CREATE TABLE IF NOT EXISTS discount_codes (
  code TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'percent',          -- percent | amount | free_shipping
  value INTEGER NOT NULL DEFAULT 0, min_cart INTEGER NOT NULL DEFAULT 0,
  product_codes TEXT,                             -- JSON array, NULL = all products
  expires_at INTEGER, max_uses INTEGER, used INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1, stackable INTEGER NOT NULL DEFAULT 0,
  phone TEXT, auto INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, channel TEXT NOT NULL DEFAULT 'support', -- support | admin
  status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL, closed_at INTEGER
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, sender TEXT NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_msgs ON chat_messages(chat_id, at);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, customer_id INTEGER,
  rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_code TEXT NOT NULL UNIQUE, number TEXT NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL, data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, phone TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',      -- whatsapp | inapp
  template TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',         -- queued | sent | failed | skipped
  error TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, sent_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_notif_status ON notifications(status, created_at);

CREATE TABLE IF NOT EXISTS visits (day TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO counters(name,value) VALUES ('order_seq',1000);
