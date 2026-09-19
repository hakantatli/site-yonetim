-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (
    user_id,
    token_hash,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetRefreshToken :one
SELECT * FROM refresh_tokens
WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
LIMIT 1;

-- name: RevokeRefreshToken :one
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE token_hash = $1
RETURNING *;

-- name: RevokeUserRefreshTokens :exec
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL;
