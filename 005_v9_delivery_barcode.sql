-- Pharma Business v9: barcode lookup and delivery tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_barcode ON products(company_id, barcode) WHERE barcode IS NOT NULL AND barcode <> '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name varchar(160);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code varchar(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(company_id, tracking_code) WHERE tracking_code IS NOT NULL;
