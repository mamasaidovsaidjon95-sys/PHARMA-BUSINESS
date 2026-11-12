-- v21: monthly targets and incentive settings for sales representatives
CREATE TABLE IF NOT EXISTS sales_monthly_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 month_start date NOT NULL CHECK (EXTRACT(DAY FROM month_start)=1),
 target_amount numeric(14,2) NOT NULL CHECK (target_amount>0),
 commission_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission_percent>=0 AND commission_percent<=100),
 bonus_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (bonus_amount>=0),
 bonus_threshold_percent numeric(5,2) NOT NULL DEFAULT 100 CHECK (bonus_threshold_percent>=0 AND bonus_threshold_percent<=1000),
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,user_id,month_start)
);
CREATE INDEX IF NOT EXISTS idx_sales_monthly_plans_company_month ON sales_monthly_plans(company_id,month_start);
