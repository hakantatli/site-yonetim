-- name: GetTotalIncomeBySite :one
SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS total_income
FROM payments
WHERE site_id = $1;

-- name: GetThisMonthIncomeBySite :one
SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS this_month_income
FROM payments
WHERE site_id = $1 AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)::DATE;

-- name: GetMonthlyCashflowBySite :many
SELECT
    TO_CHAR(month, 'YYYY-MM')::TEXT AS month_str,
    flow_type,
    SUM(total)::NUMERIC(10,2) AS total
FROM monthly_cashflow
WHERE site_id = $1
GROUP BY TO_CHAR(month, 'YYYY-MM'), flow_type
ORDER BY month_str DESC;

-- name: GetSiteInitialBalance :one
SELECT initial_balance
FROM sites
WHERE id = $1;

-- name: UpdateSiteInitialBalance :one
UPDATE sites
SET initial_balance = $2, updated_at = NOW()
WHERE id = $1
RETURNING initial_balance;

