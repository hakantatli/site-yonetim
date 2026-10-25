-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS expense_invoices (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id  UUID          NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    file_name   TEXT          NOT NULL,
    file_type   TEXT          NOT NULL,
    file_size   INTEGER       NOT NULL CHECK (file_size > 0 AND file_size <= 2097152),
    file_data   BYTEA         NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_invoices_expense_id ON expense_invoices (expense_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS expense_invoices;
-- +goose StatementEnd
