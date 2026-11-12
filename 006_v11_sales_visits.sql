CREATE TABLE IF NOT EXISTS sales_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id),
 pharmacy_id uuid NOT NULL REFERENCES pharmacies(id),
 user_id uuid NOT NULL REFERENCES users(id),
 latitude numeric(10,7) NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude numeric(10,7) NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 accuracy_m numeric(10,2),
 note text,
 visited_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_visits_company_date ON sales_visits(company_id,visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_visits_user_date ON sales_visits(user_id,visited_at DESC);
