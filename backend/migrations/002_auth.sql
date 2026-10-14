ALTER TABLE users ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX users_one_active_partner_per_stage
  ON users (partner_stage) WHERE role = 'partner' AND is_active;
