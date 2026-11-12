-- v13: safely retry the same offline/online order without creating duplicates.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_company_idempotency
  ON orders(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
