-- +goose Up
CREATE OR REPLACE VIEW debt_summary AS
SELECT
    d.id,
    d.site_id,
    d.apartment_id,
    d.debtor_user_id,
    d.type,
    d.amount,
    d.due_month,
    d.description,
    d.status,
    d.created_at,
    COALESCE(SUM(p.amount), 0)                             AS paid_amount,
    GREATEST(0::numeric, d.amount - COALESCE(SUM(p.amount), 0)) AS remaining
FROM debts d
LEFT JOIN payments p ON p.debt_id = d.id
GROUP BY d.id;

-- +goose Down
CREATE OR REPLACE VIEW debt_summary AS
SELECT
    d.id,
    d.site_id,
    d.apartment_id,
    d.debtor_user_id,
    d.type,
    d.amount,
    d.due_month,
    d.description,
    d.status,
    d.created_at,
    COALESCE(SUM(p.amount), 0)             AS paid_amount,
    d.amount - COALESCE(SUM(p.amount), 0) AS remaining
FROM debts d
LEFT JOIN payments p ON p.debt_id = d.id
GROUP BY d.id;
