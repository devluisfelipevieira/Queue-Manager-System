-- Gerenciador de Guichê — database initialisation
-- Runs automatically the first time the PostgreSQL container starts.
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tables ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desks (
    id          SERIAL PRIMARY KEY,
    desk_number INTEGER      NOT NULL UNIQUE,
    name        VARCHAR(50)  NOT NULL,
    sector      VARCHAR(50)  NOT NULL,   -- 'protocolo' | 'divida_ativa'
    status      VARCHAR(20)  NOT NULL DEFAULT 'occupied', -- 'free' | 'occupied'
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL, -- 'recepcao' | 'mesa'
    desk_id       INTEGER,               -- NULL for recepcao
    desk_number   INTEGER,               -- NULL for recepcao
    sector        VARCHAR(50)            -- NULL for recepcao
);

-- ── Seed: desks ───────────────────────────────────────────────────────────────
INSERT INTO desks (desk_number, name, sector, status) VALUES
    (1, 'Mesa 1', 'protocolo',    'occupied'),
    (2, 'Mesa 2', 'protocolo',    'occupied'),
    (3, 'Mesa 3', 'protocolo',    'occupied'),
    (4, 'Mesa 4', 'protocolo',    'occupied'),
    (5, 'Mesa 5', 'divida_ativa', 'occupied'),
    (6, 'Mesa 6', 'divida_ativa', 'occupied'),
    (7, 'Mesa 7', 'divida_ativa', 'occupied')
ON CONFLICT (desk_number) DO NOTHING;

-- ── Seed: users (bcrypt via pgcrypto) ─────────────────────────────────────────
-- Passwords match usernames (e.g. user "mesa1" → password "mesa1").
-- Change before going to production.
INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'recepcao', crypt('recepcao', gen_salt('bf', 6)), 'recepcao', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'recepcao');

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa1', crypt('mesa1', gen_salt('bf', 6)), 'mesa', d.id, 1, 'protocolo'
FROM desks d WHERE d.desk_number = 1
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'mesa1');

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa2', crypt('mesa2', gen_salt('bf', 6)), 'mesa', d.id, 2, 'protocolo'
FROM desks d WHERE d.desk_number = 2
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'mesa2');

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa3', crypt('mesa3', gen_salt('bf', 6)), 'mesa', d.id, 3, 'protocolo'
FROM desks d WHERE d.desk_number = 3
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'mesa3');

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa4', crypt('mesa4', gen_salt('bf', 6)), 'mesa', d.id, 4, 'protocolo'
FROM desks d WHERE d.desk_number = 4
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'mesa4');

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa5', crypt('mesa5', gen_salt('bf', 6)), 'mesa', d.id, 5, 'divida_ativa'
FROM desks d WHERE d.desk_number = 5
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'mesa5');

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa6', crypt('mesa6', gen_salt('bf', 6)), 'mesa', d.id, 6, 'divida_ativa'
FROM desks d WHERE d.desk_number = 6
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'mesa6');

INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa7', crypt('mesa7', gen_salt('bf', 6)), 'mesa', d.id, 7, 'divida_ativa'
FROM desks d WHERE d.desk_number = 7
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'mesa7');
