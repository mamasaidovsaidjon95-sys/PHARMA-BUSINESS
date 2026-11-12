-- v24: quarantined stock, auditable write-offs, and customer refund ledger.
CREATE TABLE IF NOT EXISTS inventory_quarantine (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 product_id uuid NOT NULL REFERENCES products(id), batch_id uuid NOT NULL REFERENCES inventory_batches(id),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0), reason varchar(500) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'quarantined' CHECK(status IN ('quarantined','written_off','released')),
 created_by uuid REFERENCES users(id), resolved_by uuid REFERENCES users(id), resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quarantine_company_status ON inventory_quarantine(company_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS order_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 order_id uuid NOT NULL REFERENCES orders(id), pharmacy_id uuid NOT NULL REFERENCES pharmacies(id),
 amount numeric(14,2) NOT NULL CHECK(amount>0), method varchar(20) NOT NULL CHECK(method IN ('cash','transfer')),
 reason varchar(500) NOT NULL, reference varchar(160), refunded_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_refunds_company_date ON order_refunds(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_refunds_order ON order_refunds(order_id);
ALTER TABLE inventory_quarantine ADD COLUMN IF NOT EXISTS resolution_note varchar(500);
