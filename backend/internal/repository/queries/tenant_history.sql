-- name: CreateTenantHistory :one
INSERT INTO tenant_history (
    apartment_id,
    tenant_user_id,
    started_at,
    recorded_by
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: EndTenantHistory :exec
UPDATE tenant_history
SET ended_at = $3, debt_action = $4, notes = $5
WHERE apartment_id = $1 AND tenant_user_id = $2 AND ended_at IS NULL;

-- name: ListTenantHistoryByApartmentID :many
SELECT 
    th.*,
    u.full_name AS tenant_full_name,
    u.email AS tenant_email,
    u.phone AS tenant_phone
FROM tenant_history th
JOIN users u ON u.id = th.tenant_user_id
WHERE th.apartment_id = $1
ORDER BY th.started_at DESC;
