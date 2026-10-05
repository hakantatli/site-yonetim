-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET must_change_password = TRUE WHERE role = 'resident';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
-- +goose StatementEnd
