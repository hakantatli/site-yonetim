-- name: TransferOpenDebtsToOwner :exec
UPDATE debts
SET debtor_user_id = $3, updated_at = NOW()
WHERE apartment_id = $1 AND debtor_user_id = $2 AND status != 'paid';

-- name: DeleteOpenDebtsByDebtor :exec
DELETE FROM debts
WHERE apartment_id = $1 AND debtor_user_id = $2 AND status != 'paid';

-- name: CreateDebt :one
INSERT INTO debts (
    site_id, apartment_id, debtor_user_id, type, amount, due_month, description, status, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: AccrueMonthlyDue :one
INSERT INTO debts (
    site_id, apartment_id, debtor_user_id, type, amount, due_month, description, status, created_by
) VALUES (
    $1, $2, $3, 'monthly_due', $4, $5, $6, 'open', $7
)
ON CONFLICT (apartment_id, due_month) WHERE type = 'monthly_due'
DO NOTHING
RETURNING id;

-- name: ListDebtsBySite :many
SELECT 
    ds.id,
    ds.site_id,
    ds.apartment_id,
    ds.debtor_user_id,
    ds.type,
    ds.amount,
    ds.due_month,
    ds.description,
    ds.status,
    ds.created_at,
    ds.paid_amount::NUMERIC(10,2) AS paid_amount,
    ds.remaining::NUMERIC(10,2) AS remaining,
    a.door_number,
    COALESCE(b.name, '') AS block_name,
    u.full_name AS debtor_full_name,
    u.phone AS debtor_phone
FROM debt_summary ds
JOIN apartments a ON a.id = ds.apartment_id
LEFT JOIN blocks b ON b.id = a.block_id
JOIN users u ON u.id = ds.debtor_user_id
WHERE ds.site_id = $1
  AND (sqlc.narg('status')::TEXT IS NULL OR ds.status = sqlc.narg('status'))
  AND (sqlc.narg('type')::TEXT IS NULL OR ds.type = sqlc.narg('type'))
  AND (sqlc.narg('apartment_id')::UUID IS NULL OR ds.apartment_id = sqlc.narg('apartment_id'))
  AND (sqlc.narg('debtor_user_id')::UUID IS NULL OR ds.debtor_user_id = sqlc.narg('debtor_user_id'))
ORDER BY ds.created_at DESC;

-- name: GetDebtDetailByID :one
SELECT 
    ds.id,
    ds.site_id,
    ds.apartment_id,
    ds.debtor_user_id,
    ds.type,
    ds.amount,
    ds.due_month,
    ds.description,
    ds.status,
    ds.created_at,
    ds.paid_amount::NUMERIC(10,2) AS paid_amount,
    ds.remaining::NUMERIC(10,2) AS remaining,
    a.door_number,
    COALESCE(b.name, '') AS block_name,
    u.full_name AS debtor_full_name,
    u.phone AS debtor_phone
FROM debt_summary ds
JOIN apartments a ON a.id = ds.apartment_id
LEFT JOIN blocks b ON b.id = a.block_id
JOIN users u ON u.id = ds.debtor_user_id
WHERE ds.id = $1 AND ds.site_id = $2;

-- name: ListActiveApartmentsForAccrual :many
SELECT 
    a.id, 
    a.site_id, 
    a.owner_user_id, 
    a.tenant_user_id
FROM apartments a
WHERE a.site_id = $1 AND a.is_active = TRUE;

-- name: GetDebtsStatsBySite :one
SELECT 
    COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total_amount,
    COALESCE(SUM(paid_amount), 0)::NUMERIC(12,2) AS total_paid,
    COALESCE(SUM(remaining), 0)::NUMERIC(12,2) AS total_remaining,
    COUNT(*)::INT AS total_count,
    COUNT(*) FILTER (WHERE status = 'open')::INT AS open_count,
    COUNT(*) FILTER (WHERE status = 'partial')::INT AS partial_count,
    COUNT(*) FILTER (WHERE status = 'paid')::INT AS paid_count
FROM debt_summary
WHERE site_id = $1;

-- name: DeleteDebtByID :exec
DELETE FROM debts
WHERE id = $1 AND site_id = $2;

-- name: UpdateDebtStatus :exec
UPDATE debts
SET status = $2, updated_at = NOW()
WHERE id = $1;

