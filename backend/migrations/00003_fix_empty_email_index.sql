-- +goose Up
-- +goose StatementBegin

-- 1. Convert any empty or whitespace emails to NULL
UPDATE users SET email = NULL WHERE email IS NOT NULL AND TRIM(email) = '';

-- 2. Recreate unique index on email to only enforce uniqueness on non-empty values
DROP INDEX IF EXISTS idx_users_email_unique;
CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE email IS NOT NULL AND TRIM(email) != '';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_users_email_unique;
CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE email IS NOT NULL;

-- +goose StatementEnd
