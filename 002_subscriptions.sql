-- Company onboarding and subscription lifecycle
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','basic','standard','pro'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','suspended','expired'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
UPDATE companies SET trial_ends_at=created_at+interval '14 days' WHERE trial_ends_at IS NULL AND plan='trial';
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status,subscription_ends_at);
