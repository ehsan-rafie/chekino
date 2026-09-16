CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    max_people INTEGER,
    max_checks INTEGER,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ADD COLUMN plan_id INTEGER REFERENCES plans(id);
ALTER TABLE companies ADD COLUMN permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO plans (name, max_people, max_checks, features, price) VALUES
  ('پایه', 20, 50, '{"export": false, "reports": false, "multi_user": false}'::jsonb, 0),
  ('حرفه‌ای', 200, 1000, '{"export": true, "reports": true, "multi_user": false}'::jsonb, 490000),
  ('نامحدود', NULL, NULL, '{"export": true, "reports": true, "multi_user": true}'::jsonb, 1490000);

UPDATE companies SET plan_id = (SELECT id FROM plans WHERE name = 'پایه') WHERE plan_id IS NULL;
