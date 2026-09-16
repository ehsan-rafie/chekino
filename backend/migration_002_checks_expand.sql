ALTER TABLE checks RENAME COLUMN person_id TO beneficiary_id;
ALTER INDEX idx_checks_person_id RENAME TO idx_checks_beneficiary_id;

ALTER TABLE checks ADD COLUMN owner_id INTEGER NOT NULL REFERENCES people(id);
ALTER TABLE checks ADD COLUMN party_id INTEGER NOT NULL REFERENCES people(id);
ALTER TABLE checks ADD COLUMN serial TEXT NOT NULL;
ALTER TABLE checks ADD COLUMN send_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE checks ADD COLUMN spend_date DATE;
ALTER TABLE checks ADD COLUMN notes TEXT;
ALTER TABLE checks ADD COLUMN receipt_image TEXT;
ALTER TABLE checks ADD COLUMN status_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE checks ADD COLUMN channels JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_checks_owner_id ON checks(owner_id);
CREATE INDEX idx_checks_party_id ON checks(party_id);

ALTER TABLE checks ADD CONSTRAINT uq_checks_company_serial UNIQUE (company_id, serial);
ALTER TABLE checks ADD CONSTRAINT uq_checks_company_sayad UNIQUE (company_id, sayad_id);
