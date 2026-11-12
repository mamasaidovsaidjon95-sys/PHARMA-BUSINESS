-- v20 daily sales targets per active company sales representative
CREATE TABLE IF NOT EXISTS sales_targets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id),
 target_date date NOT NULL,
 target_amount numeric(14,2) NOT NULL CHECK(target_amount>0),
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,user_id,target_date)
);
CREATE INDEX IF NOT EXISTS idx_sales_targets_company_date ON sales_targets(company_id,target_date);
CREATE INDEX IF NOT EXISTS idx_orders_sales_attribution ON orders(company_id,created_by,created_at) WHERE status<>'cancelled';
