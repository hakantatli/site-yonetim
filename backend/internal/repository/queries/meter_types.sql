-- name: CreateMeterType :one
INSERT INTO meter_types (site_id, name, unit, is_active)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListMeterTypesBySiteID :many
SELECT * FROM meter_types
WHERE site_id = $1 AND is_active = TRUE
ORDER BY name ASC;

-- name: ListAllMeterTypesBySiteID :many
SELECT * FROM meter_types
WHERE site_id = $1
ORDER BY is_active DESC, name ASC;

-- name: GetMeterTypeByID :one
SELECT * FROM meter_types
WHERE id = $1 AND site_id = $2
LIMIT 1;

-- name: UpdateMeterType :one
UPDATE meter_types
SET name = $3, unit = $4, is_active = $5
WHERE id = $1 AND site_id = $2
RETURNING *;

-- name: CountPeriodsByMeterTypeID :one
SELECT COUNT(*) FROM consumption_periods
WHERE meter_type_id = $1 AND site_id = $2;

-- name: DeleteMeterType :exec
DELETE FROM meter_types
WHERE id = $1 AND site_id = $2;
