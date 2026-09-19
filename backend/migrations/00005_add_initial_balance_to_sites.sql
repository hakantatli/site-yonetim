-- +goose Up
-- +goose StatementBegin
ALTER TABLE sites ADD COLUMN initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE sites DROP COLUMN IF EXISTS initial_balance;
-- +goose StatementEnd
