-- v22: batch/lot inventory and expiry-date control
CREATE TABLE IF NOT EXISTS inventory_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id),
 product_id uuid NOT NULL REFERENCES products(id),
 batch_number varchar(100) NOT NULL,
 manufacture_date date,
 expiry_date date NOT NULL,
 received_quantity numeric(14,3) NOT NULL CHECK(received_quantity>0),
 unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(unit_cost>=0),
 supplier_name varchar(200),
 note text,
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,product_id,batch_number)
);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES inventory_batches(id);
CREATE INDEX IF NOT EXISTS idx_batches_company_expiry ON inventory_batches(company_id,expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(company_id,product_id);
CREATE INDEX IF NOT EXISTS idx_stock_batch ON stock_movements(batch_id);
