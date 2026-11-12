-- v27: purchase unit-cost history per received purchase line
CREATE TABLE IF NOT EXISTS purchase_price_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id),
 product_id uuid NOT NULL REFERENCES products(id),
 supplier_id uuid NOT NULL REFERENCES suppliers(id),
 purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
 purchase_order_item_id uuid NOT NULL REFERENCES purchase_order_items(id),
 unit_cost numeric(14,2) NOT NULL CHECK(unit_cost>=0),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 recorded_by uuid REFERENCES users(id),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_price_history_product_date ON purchase_price_history(company_id,product_id,recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_price_history_supplier_date ON purchase_price_history(company_id,supplier_id,recorded_at DESC);
