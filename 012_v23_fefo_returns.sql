-- v23: auditable FEFO allocations and partial goods returns.
CREATE TABLE IF NOT EXISTS order_batch_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id),
 batch_id uuid NOT NULL REFERENCES inventory_batches(id),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 movement_id uuid REFERENCES stock_movements(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_batch_allocations_order ON order_batch_allocations(order_id,product_id);
CREATE TABLE IF NOT EXISTS order_batch_returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id),
 order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id),
 allocation_id uuid NOT NULL REFERENCES order_batch_allocations(id),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 reason varchar(500) NOT NULL,
 received_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_batch_returns_allocation ON order_batch_returns(allocation_id);
CREATE INDEX IF NOT EXISTS idx_order_batch_returns_company ON order_batch_returns(company_id,created_at DESC);
