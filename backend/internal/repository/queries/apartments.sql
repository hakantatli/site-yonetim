-- name: CountActiveApartmentsBySiteID :one
SELECT COUNT(*) FROM apartments
WHERE site_id = $1 AND is_active = TRUE;

-- name: ListApartmentsBySiteID :many
SELECT 
    a.id,
    a.site_id,
    a.block_id,
    b.name AS block_name,
    a.door_number,
    a.floor,
    a.owner_user_id,
    u_owner.full_name AS owner_full_name,
    u_owner.phone AS owner_phone,
    u_owner.email AS owner_email,
    a.tenant_user_id,
    u_tenant.full_name AS tenant_full_name,
    u_tenant.phone AS tenant_phone,
    u_tenant.email AS tenant_email,
    a.is_active,
    a.created_at,
    a.updated_at
FROM apartments a
LEFT JOIN blocks b ON b.id = a.block_id
LEFT JOIN users u_owner ON u_owner.id = a.owner_user_id
LEFT JOIN users u_tenant ON u_tenant.id = a.tenant_user_id
WHERE a.site_id = $1 AND a.is_active = TRUE
ORDER BY b.name ASC NULLS FIRST, a.door_number ASC;

-- name: GetApartmentByID :one
SELECT 
    a.id,
    a.site_id,
    a.block_id,
    b.name AS block_name,
    a.door_number,
    a.floor,
    a.owner_user_id,
    u_owner.full_name AS owner_full_name,
    u_owner.phone AS owner_phone,
    u_owner.email AS owner_email,
    a.tenant_user_id,
    u_tenant.full_name AS tenant_full_name,
    u_tenant.phone AS tenant_phone,
    u_tenant.email AS tenant_email,
    a.is_active,
    a.created_at,
    a.updated_at
FROM apartments a
LEFT JOIN blocks b ON b.id = a.block_id
LEFT JOIN users u_owner ON u_owner.id = a.owner_user_id
LEFT JOIN users u_tenant ON u_tenant.id = a.tenant_user_id
WHERE a.id = $1 AND a.site_id = $2
LIMIT 1;

-- name: CreateApartment :one
INSERT INTO apartments (
    site_id,
    block_id,
    door_number,
    floor,
    owner_user_id,
    tenant_user_id
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: UpdateApartment :one
UPDATE apartments
SET block_id = $3, door_number = $4, floor = $5, updated_at = NOW()
WHERE id = $1 AND site_id = $2
RETURNING *;

-- name: SoftDeleteApartment :exec
UPDATE apartments
SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND site_id = $2;

-- name: SetApartmentOwner :exec
UPDATE apartments
SET owner_user_id = $3, updated_at = NOW()
WHERE id = $1 AND site_id = $2;

-- name: SetApartmentTenant :exec
UPDATE apartments
SET tenant_user_id = $3, updated_at = NOW()
WHERE id = $1 AND site_id = $2;

-- name: RemoveApartmentTenant :exec
UPDATE apartments
SET tenant_user_id = NULL, updated_at = NOW()
WHERE id = $1 AND site_id = $2;
