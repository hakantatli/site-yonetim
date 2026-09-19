-- name: GetDueRateHistory :many
SELECT 
    dr.id, 
    dr.site_id, 
    dr.amount, 
    dr.valid_from, 
    dr.created_by, 
    dr.created_at, 
    COALESCE(u.full_name, '') AS created_by_name
FROM due_rates dr
LEFT JOIN users u ON u.id = dr.created_by
WHERE dr.site_id = $1
ORDER BY dr.valid_from DESC;

-- name: GetCurrentDueRate :one
SELECT 
    dr.id, 
    dr.site_id, 
    dr.amount, 
    dr.valid_from, 
    dr.created_by, 
    dr.created_at
FROM due_rates dr
WHERE dr.site_id = $1 AND dr.valid_from <= $2
ORDER BY dr.valid_from DESC
LIMIT 1;

-- name: UpsertDueRate :one
INSERT INTO due_rates (site_id, amount, valid_from, created_by)
VALUES ($1, $2, $3, $4)
ON CONFLICT (site_id, valid_from)
DO UPDATE SET amount = EXCLUDED.amount
RETURNING id, site_id, amount, valid_from, created_by, created_at;
