-- +goose Up
-- +goose StatementBegin

-- 1. Update existing null or empty phones with placeholder
UPDATE users SET phone = '05000000000' WHERE email = 'admin@siteyonetim.local' AND (phone IS NULL OR phone = '');
UPDATE users SET phone = '0500' || LPAD(FLOOR(RANDOM() * 10000000)::text, 7, '0') WHERE phone IS NULL OR phone = '';

-- 2. Make phone NOT NULL and unique
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
CREATE UNIQUE INDEX idx_users_phone_unique ON users (phone);

-- 3. Make email optional (DROP NOT NULL) and unique when not null
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE email IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_users_phone_unique;
DROP INDEX IF EXISTS idx_users_email_unique;

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- +goose StatementEnd
