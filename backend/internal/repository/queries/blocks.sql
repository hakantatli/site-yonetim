-- name: CreateBlock :one
INSERT INTO blocks (site_id, name)
VALUES ($1, $2)
RETURNING *;

-- name: ListBlocksBySiteID :many
SELECT * FROM blocks
WHERE site_id = $1
ORDER BY name ASC;

-- name: DeleteBlock :exec
DELETE FROM blocks
WHERE id = $1 AND site_id = $2;
