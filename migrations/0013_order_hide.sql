-- 0013: إخفاء الطلبات الملغاة من قائمة الزبونة (لا يُحذف الطلب من النظام)
ALTER TABLE orders ADD COLUMN cust_hidden INTEGER NOT NULL DEFAULT 0;
