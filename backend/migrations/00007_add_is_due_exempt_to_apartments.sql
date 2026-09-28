-- +goose Up
-- +goose StatementBegin
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS is_due_exempt BOOLEAN NOT NULL DEFAULT FALSE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE apartments DROP COLUMN IF EXISTS is_due_exempt;
-- +goose StatementEnd
