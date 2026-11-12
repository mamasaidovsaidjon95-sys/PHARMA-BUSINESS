CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE companies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 license_key text UNIQUE, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id),
 full_name text NOT NULL, email text NOT NULL UNIQUE, password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('super_admin','company_admin','manager','sales','pharmacy')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pharmacies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 name text NOT NULL, contact_name text, phone text, address text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 sku text, name text NOT NULL, manufacturer text, unit text NOT NULL DEFAULT 'dona',
 purchase_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price>=0),
 sale_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (sale_price>=0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,sku)
);
CREATE TABLE stock_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 product_id uuid NOT NULL REFERENCES products(id), movement_type text NOT NULL CHECK (movement_type IN ('in','out','adjustment')),
 quantity numeric(14,3) NOT NULL CHECK (quantity>0), unit_cost numeric(14,2) NOT NULL DEFAULT 0,
 reference text, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 pharmacy_id uuid NOT NULL REFERENCES pharmacies(id), status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','shipped','completed','cancelled')),
 payment_type text NOT NULL CHECK (payment_type IN ('cash','credit','transfer')),
 total numeric(14,2) NOT NULL DEFAULT 0, note text, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id), quantity numeric(14,3) NOT NULL CHECK (quantity>0),
 unit_price numeric(14,2) NOT NULL CHECK (unit_price>=0)
);
CREATE TABLE payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id),
 pharmacy_id uuid NOT NULL REFERENCES pharmacies(id), order_id uuid REFERENCES orders(id),
 amount numeric(14,2) NOT NULL CHECK (amount>0), method text NOT NULL CHECK (method IN ('cash','transfer')),
 note text, received_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_pharmacies_company ON pharmacies(company_id);
CREATE INDEX idx_orders_company_date ON orders(company_id,created_at DESC);
CREATE INDEX idx_stock_company_product ON stock_movements(company_id,product_id);
CREATE INDEX idx_payments_company_date ON payments(company_id,created_at DESC);
