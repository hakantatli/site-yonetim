-- name: GetSiteByID :one
SELECT * FROM sites
WHERE id = $1 LIMIT 1;

-- name: ListSites :many
SELECT 
    s.id,
    s.name,
    s.address,
    s.apartment_limit,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT a.id)::int AS apartment_count,
    COUNT(DISTINCT sa.user_id)::int AS admin_count
FROM sites s
LEFT JOIN apartments a ON a.site_id = s.id AND a.is_active = TRUE
LEFT JOIN site_admins sa ON sa.site_id = s.id
GROUP BY s.id
ORDER BY s.created_at DESC;

-- name: CreateSite :one
INSERT INTO sites (name, address, apartment_limit)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateSiteLimit :one
UPDATE sites
SET apartment_limit = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetSiteDetails :one
SELECT 
    s.id,
    s.name,
    s.address,
    s.apartment_limit,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT a.id)::int AS apartment_count,
    COUNT(DISTINCT b.id)::int AS block_count,
    COUNT(DISTINCT u.id)::int AS resident_count
FROM sites s
LEFT JOIN apartments a ON a.site_id = s.id AND a.is_active = TRUE
LEFT JOIN blocks b ON b.site_id = s.id
LEFT JOIN users u ON u.site_id = s.id AND u.role = 'resident' AND u.is_active = TRUE
WHERE s.id = $1
GROUP BY s.id;

-- name: ListAllSiteIDs :many
SELECT id, name FROM sites ORDER BY name ASC;

-- name: AddSiteAdmin :exec
INSERT INTO site_admins (site_id, user_id)
VALUES ($1, $2)
ON CONFLICT (site_id, user_id) DO NOTHING;

-- name: IsUserAdminOfSite :one
SELECT EXISTS (
    SELECT 1 FROM site_admins
    WHERE site_id = $1 AND user_id = $2
) AS is_admin;

-- name: ListSitesByAdminID :many
SELECT 
    s.id,
    s.name,
    s.address,
    s.apartment_limit,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT a.id)::int AS apartment_count,
    COUNT(DISTINCT sa_all.user_id)::int AS admin_count
FROM sites s
INNER JOIN site_admins sa ON sa.site_id = s.id AND sa.user_id = $1
LEFT JOIN apartments a ON a.site_id = s.id AND a.is_active = TRUE
LEFT JOIN site_admins sa_all ON sa_all.site_id = s.id
GROUP BY s.id
ORDER BY s.created_at DESC;
