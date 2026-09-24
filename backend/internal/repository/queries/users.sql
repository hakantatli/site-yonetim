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
    is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
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
SELECT id, site_id, email, full_name, phone, role, is_active, created_at, updated_at
FROM users
WHERE site_id = $1 AND role = 'admin'
ORDER BY created_at DESC;

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
    updated_at = NOW()
WHERE id = $1
RETURNING *;

