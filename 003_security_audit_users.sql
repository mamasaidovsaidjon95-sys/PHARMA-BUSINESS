-- v6: account administration, pharmacy-user linkage and audit trail
ALTER TABLE users ADD COLUMN IF NOT EXISTS pharmacy_id uuid REFERENCES pharmacies(id);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id,role);
CREATE TABLE IF NOT EXISTS audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL,
 resource text NOT NULL,
 resource_id text,
 http_status integer NOT NULL,
 ip_address text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_company_date ON audit_logs(company_id,created_at DESC);
