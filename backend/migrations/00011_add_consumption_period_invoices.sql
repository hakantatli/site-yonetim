-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS consumption_period_invoices (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    consumption_period_id UUID          NOT NULL UNIQUE REFERENCES consumption_periods(id) ON DELETE CASCADE,
    file_name             TEXT          NOT NULL,
    file_type             TEXT          NOT NULL,
    file_size             INTEGER       NOT NULL CHECK (file_size > 0 AND file_size <= 2097152),
    file_data             BYTEA         NOT NULL,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumption_period_invoices_period_id ON consumption_period_invoices (consumption_period_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS consumption_period_invoices;
-- +goose StatementEnd
