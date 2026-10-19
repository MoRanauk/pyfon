import { query } from '../db/pool.js';
await query(`CREATE OR REPLACE FUNCTION mark_manager_edit() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN IF current_setting('pyfon.csv_import', true) IS DISTINCT FROM 'on' THEN NEW.manager_edited := true; END IF; RETURN NEW; END $fn$`);
await query('DROP TRIGGER IF EXISTS catalog_items_manager_edit ON catalog_items');
await query('CREATE TRIGGER catalog_items_manager_edit BEFORE INSERT OR UPDATE ON catalog_items FOR EACH ROW EXECUTE FUNCTION mark_manager_edit()');
console.log('PASS: guard installed');
process.exit(0);
