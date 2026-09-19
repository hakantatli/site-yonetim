-- name: CreateExpense :one
INSERT INTO expenses (
    site_id,
    category_id,
    amount,
    description,
    expense_date,
    receipt_note,
    recorded_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: ListExpensesBySite :many
SELECT
    e.id,
    e.site_id,
    e.category_id,
    c.name AS category_name,
    e.amount,
    e.description,
    e.expense_date,
    e.receipt_note,
    e.recorded_by,
    u.full_name AS recorded_by_name,
    e.created_at,
    e.updated_at
FROM expenses e
JOIN expense_categories c ON c.id = e.category_id
JOIN users u ON u.id = e.recorded_by
WHERE e.site_id = $1
  AND (sqlc.narg('category_id')::UUID IS NULL OR e.category_id = sqlc.narg('category_id'))
  AND (sqlc.narg('start_date')::DATE IS NULL OR e.expense_date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::DATE IS NULL OR e.expense_date <= sqlc.narg('end_date'))
ORDER BY e.expense_date DESC, e.created_at DESC;

-- name: GetExpenseByID :one
SELECT
    e.id,
    e.site_id,
    e.category_id,
    c.name AS category_name,
    e.amount,
    e.description,
    e.expense_date,
    e.receipt_note,
    e.recorded_by,
    u.full_name AS recorded_by_name,
    e.created_at,
    e.updated_at
FROM expenses e
JOIN expense_categories c ON c.id = e.category_id
JOIN users u ON u.id = e.recorded_by
WHERE e.id = $1 AND e.site_id = $2
LIMIT 1;

-- name: DeleteExpenseByID :exec
DELETE FROM expenses
WHERE id = $1 AND site_id = $2;

-- name: GetExpenseStatsBySite :one
SELECT
    COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS total_amount,
    COALESCE(SUM(CASE WHEN expense_date >= DATE_TRUNC('month', CURRENT_DATE)::DATE THEN amount ELSE 0 END), 0)::NUMERIC(10,2) AS this_month_amount,
    COUNT(*)::BIGINT AS total_count
FROM expenses
WHERE site_id = $1;

-- name: GetCategoryBreakdownBySite :many
SELECT
    c.id AS category_id,
    c.name AS category_name,
    COALESCE(SUM(e.amount), 0)::NUMERIC(10,2) AS total_amount,
    COUNT(e.id)::BIGINT AS expense_count
FROM expense_categories c
LEFT JOIN expenses e ON e.category_id = c.id
WHERE c.site_id = $1
GROUP BY c.id, c.name
HAVING COUNT(e.id) > 0
ORDER BY total_amount DESC;
