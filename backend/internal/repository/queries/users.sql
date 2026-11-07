-- name: GetUserByPhoneOrEmail :one
SELECT * FROM users
WHERE phone = $1 OR (email = $1 AND email IS NOT NULL)
LIMIT 1;

-- name: GetUserByPhone :one
SELECT * FROM users
WHERE phone = $1
LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1
LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (
    site_id,
    phone,
    email,
    password_hash,
    full_name,
    role,
    is_active,
    must_change_password
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: UpdateUserStatus :one
UPDATE users
SET is_active = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CountUsersByRole :one
SELECT COUNT(*) FROM users
WHERE role = $1;

-- name: ListAdminsBySiteID :many
SELECT DISTINCT u.id, u.site_id, u.email, u.full_name, u.phone, u.role, u.is_active, u.must_change_password, u.created_at, u.updated_at
FROM users u
LEFT JOIN site_admins sa ON sa.user_id = u.id
WHERE (u.site_id = $1 OR sa.site_id = $1) AND u.role = 'admin'
ORDER BY u.created_at DESC;

-- name: UpdateUserDetails :one
UPDATE users
SET full_name = $2,
    phone = $3,
    email = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserPassword :one
UPDATE users
SET password_hash = $2,
    must_change_password = $3,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SetMustChangePassword :one
UPDATE users
SET must_change_password = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserSiteID :exec
UPDATE users
SET site_id = $2,
    updated_at = NOW()
WHERE id = $1;
