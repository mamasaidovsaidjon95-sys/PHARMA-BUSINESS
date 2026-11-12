-- v18: platform subscription payment ledger (manual records; no payment gateway)
CREATE TABLE IF NOT EXISTS platform_subscription_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
 amount numeric(18,2) NOT NULL CHECK (amount > 0),
 currency text NOT NULL DEFAULT 'UZS' CHECK (currency = 'UZS'),
 method text NOT NULL CHECK (method IN ('cash','bank_transfer','card')),
 reference text,
 note text,
 paid_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_payments_company_date ON platform_subscription_payments(company_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_payments_date ON platform_subscription_payments(paid_at DESC);
