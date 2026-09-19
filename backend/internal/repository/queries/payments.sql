-- name: CreatePayment :one
INSERT INTO payments (
    debt_id, site_id, amount, payment_method, payment_date, notes, recorded_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: ListPaymentsBySite :many
SELECT 
    p.id,
    p.debt_id,
    p.site_id,
    p.amount,
    p.payment_method,
    p.payment_date,
    p.notes,
    p.recorded_by,
    p.created_at,
    u.full_name AS recorded_by_name,
    d.type AS debt_type,
    d.due_month AS debt_due_month,
    d.description AS debt_description,
    d.amount AS debt_total_amount,
    a.door_number,
    COALESCE(b.name, '') AS block_name,
    debtor.full_name AS debtor_full_name,
    debtor.phone AS debtor_phone
FROM payments p
JOIN users u ON u.id = p.recorded_by
JOIN debts d ON d.id = p.debt_id
JOIN apartments a ON a.id = d.apartment_id
LEFT JOIN blocks b ON b.id = a.block_id
JOIN users debtor ON debtor.id = d.debtor_user_id
WHERE p.site_id = $1
  AND (sqlc.narg('debt_id')::UUID IS NULL OR p.debt_id = sqlc.narg('debt_id'))
  AND (sqlc.narg('apartment_id')::UUID IS NULL OR d.apartment_id = sqlc.narg('apartment_id'))
  AND (sqlc.narg('payment_method')::TEXT IS NULL OR p.payment_method = sqlc.narg('payment_method'))
  AND (sqlc.narg('start_date')::DATE IS NULL OR p.payment_date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::DATE IS NULL OR p.payment_date <= sqlc.narg('end_date'))
  AND (sqlc.narg('debtor_user_id')::UUID IS NULL OR d.debtor_user_id = sqlc.narg('debtor_user_id'))
ORDER BY p.payment_date DESC, p.created_at DESC;

-- name: ListPaymentsByDebt :many
SELECT 
    p.id,
    p.debt_id,
    p.site_id,
    p.amount,
    p.payment_method,
    p.payment_date,
    p.notes,
    p.recorded_by,
    p.created_at,
    u.full_name AS recorded_by_name
FROM payments p
JOIN users u ON u.id = p.recorded_by
WHERE p.debt_id = $1 AND p.site_id = $2
ORDER BY p.payment_date DESC, p.created_at DESC;

-- name: GetPaymentByID :one
SELECT 
    p.id,
    p.debt_id,
    p.site_id,
    p.amount,
    p.payment_method,
    p.payment_date,
    p.notes,
    p.recorded_by,
    p.created_at,
    u.full_name AS recorded_by_name,
    d.type AS debt_type,
    d.due_month AS debt_due_month,
    d.description AS debt_description,
    d.amount AS debt_total_amount,
    a.door_number,
    COALESCE(b.name, '') AS block_name,
    debtor.full_name AS debtor_full_name,
    debtor.phone AS debtor_phone
FROM payments p
JOIN users u ON u.id = p.recorded_by
JOIN debts d ON d.id = p.debt_id
JOIN apartments a ON a.id = d.apartment_id
LEFT JOIN blocks b ON b.id = a.block_id
JOIN users debtor ON debtor.id = d.debtor_user_id
WHERE p.id = $1 AND p.site_id = $2;

-- name: DeletePaymentByID :exec
DELETE FROM payments
WHERE id = $1 AND site_id = $2;

-- name: GetTotalPaidForDebt :one
SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS total_paid
FROM payments
WHERE debt_id = $1;

-- name: GetPaymentStatsBySite :one
SELECT 
    COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total_collected,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0)::NUMERIC(12,2) AS cash_total,
    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END), 0)::NUMERIC(12,2) AS transfer_total,
    COUNT(*)::INT AS total_count
FROM payments
WHERE site_id = $1;
