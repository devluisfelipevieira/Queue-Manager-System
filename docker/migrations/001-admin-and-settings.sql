-- Execute uma vez ao atualizar uma instalacao que ja possui volume PostgreSQL.
CREATE TABLE IF NOT EXISTS app_settings (
    id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    reminder_minutes INTEGER NOT NULL DEFAULT 10 CHECK (reminder_minutes BETWEEN 1 AND 240),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (id, reminder_minutes)
VALUES (1, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'admin', crypt('admin', gen_salt('bf', 10)), 'admin', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
