CREATE TABLE IF NOT EXISTS money_entries (
  id bigserial PRIMARY KEY,
  entry_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  category text NOT NULL,
  cost_type text CHECK (cost_type IN ('direct','overhead')),
  amount_kes integer NOT NULL CHECK (amount_kes <> 0),
  job_ref text,
  party text,
  note text,
  reverses_id bigint REFERENCES money_entries(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text
);
CREATE INDEX IF NOT EXISTS money_date_idx ON money_entries (entry_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS money_job_idx ON money_entries (job_ref);
CREATE UNIQUE INDEX IF NOT EXISTS money_reverse_once ON money_entries (reverses_id) WHERE reverses_id IS NOT NULL;
CREATE OR REPLACE FUNCTION money_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'money entries cannot be removed'; END IF;
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
     AND NEW.id = OLD.id AND NEW.amount_kes = OLD.amount_kes AND NEW.kind = OLD.kind
     AND NEW.category = OLD.category AND NEW.entry_date = OLD.entry_date
     AND NEW.cost_type IS NOT DISTINCT FROM OLD.cost_type
     AND NEW.party IS NOT DISTINCT FROM OLD.party
     AND NEW.note IS NOT DISTINCT FROM OLD.note
     AND NEW.job_ref IS NOT DISTINCT FROM OLD.job_ref THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'money entries cannot be changed';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS money_guard_trg ON money_entries;
CREATE TRIGGER money_guard_trg BEFORE UPDATE OR DELETE ON money_entries FOR EACH ROW EXECUTE FUNCTION money_guard();
