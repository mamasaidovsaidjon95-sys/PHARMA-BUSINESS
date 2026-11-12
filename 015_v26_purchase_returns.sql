-- v26: supplier purchase returns and supplier statement ledger
CREATE TABLE IF NOT EXISTS purchase_returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 supplier_id uuid NOT NULL REFERENCES suppliers(id), purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
 purchase_order_item_id uuid NOT NULL REFERENCES purchase_order_items(id), batch_id uuid NOT NULL REFERENCES inventory_batches(id),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0), unit_cost numeric(14,2) NOT NULL CHECK(unit_cost>=0),
 reason varchar(500) NOT NULL, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(company_id,supplier_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_order_item ON purchase_returns(purchase_order_item_id);
