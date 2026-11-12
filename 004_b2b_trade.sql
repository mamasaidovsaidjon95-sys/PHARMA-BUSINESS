-- v8: opt-in company directory and inter-company trade enquiries
ALTER TABLE companies ADD COLUMN IF NOT EXISTS b2b_visible boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS trade_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sender_company_id uuid NOT NULL REFERENCES companies(id),
 receiver_company_id uuid NOT NULL REFERENCES companies(id),
 sender_user_id uuid NOT NULL REFERENCES users(id),
 subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 160),
 message text NOT NULL CHECK (char_length(message) BETWEEN 3 AND 3000),
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','rejected','completed')),
 response_note text,
 responded_by uuid REFERENCES users(id),
 responded_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (sender_company_id <> receiver_company_id)
);
CREATE INDEX IF NOT EXISTS idx_trade_receiver ON trade_requests(receiver_company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_sender ON trade_requests(sender_company_id, created_at DESC);
