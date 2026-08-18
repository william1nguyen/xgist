ALTER TABLE billing.subscriptions ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
