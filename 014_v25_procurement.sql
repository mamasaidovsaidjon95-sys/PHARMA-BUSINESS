-- v25 supplier directory, purchasing documents and supplier payable ledger
CREATE TABLE IF NOT EXISTS suppliers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id),
 name varchar(200) NOT NULL,
 contact_name varchar(160), phone varchar(40), address varchar(500), note text,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,name)
);
CREATE TABLE IF NOT EXISTS purchase_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id),
 supplier_id uuid NOT NULL REFERENCES suppliers(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','received','cancelled')),
 total numeric(18,2) NOT NULL CHECK(total>=0), note text,
 created_by uuid REFERENCES users(id), received_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), received_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_date ON purchase_orders(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(company_id,supplier_id,status);
CREATE TABLE IF NOT EXISTS purchase_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 unit_cost numeric(14,2) NOT NULL CHECK(unit_cost>=0),
 batch_number varchar(100) NOT NULL,
 manufacture_date date,
 expiry_date date NOT NULL,
 CHECK(manufacture_date IS NULL OR manufacture_date<=expiry_date)
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_order ON purchase_order_items(purchase_order_id);
CREATE TABLE IF NOT EXISTS supplier_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id),
 supplier_id uuid NOT NULL REFERENCES suppliers(id),
 purchase_order_id uuid REFERENCES purchase_orders(id),
 amount numeric(18,2) NOT NULL CHECK(amount>0),
 method text NOT NULL CHECK(method IN ('cash','transfer','card')),
 reference varchar(160), note varchar(500), paid_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_company_date ON supplier_payments(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(company_id,supplier_id);
