-- name: CreateExpenseCategory :one
INSERT INTO expense_categories (site_id, name, is_default, is_active)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListExpenseCategoriesBySiteID :many
SELECT * FROM expense_categories
WHERE site_id = $1 AND is_active = TRUE
ORDER BY name ASC;

-- name: ListAllExpenseCategoriesBySiteID :many
SELECT * FROM expense_categories
WHERE site_id = $1
ORDER BY is_active DESC, name ASC;

-- name: GetExpenseCategoryByID :one
SELECT * FROM expense_categories
WHERE id = $1 AND site_id = $2
LIMIT 1;

-- name: UpdateExpenseCategory :one
UPDATE expense_categories
SET name = $3, is_active = $4
WHERE id = $1 AND site_id = $2
RETURNING *;

-- name: CountExpensesByCategoryID :one
SELECT COUNT(*) FROM expenses
WHERE category_id = $1 AND site_id = $2;

-- name: DeleteExpenseCategory :exec
DELETE FROM expense_categories
WHERE id = $1 AND site_id = $2;
