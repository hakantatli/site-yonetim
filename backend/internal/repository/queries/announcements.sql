-- name: CreateAnnouncement :one
INSERT INTO announcements (
    site_id,
    title,
    content,
    priority,
    published_at,
    created_by
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: ListAnnouncementsBySite :many
SELECT
    a.id,
    a.site_id,
    a.title,
    a.content,
    a.priority,
    a.published_at,
    a.created_by,
    a.created_at,
    a.updated_at,
    u.full_name AS author_name
FROM announcements a
JOIN users u ON a.created_by = u.id
WHERE a.site_id = $1
ORDER BY a.published_at DESC;

-- name: GetAnnouncementByID :one
SELECT
    a.id,
    a.site_id,
    a.title,
    a.content,
    a.priority,
    a.published_at,
    a.created_by,
    a.created_at,
    a.updated_at,
    u.full_name AS author_name
FROM announcements a
JOIN users u ON a.created_by = u.id
WHERE a.id = $1 AND a.site_id = $2;

-- name: UpdateAnnouncement :one
UPDATE announcements
SET
    title = $3,
    content = $4,
    priority = $5,
    updated_at = NOW()
WHERE id = $1 AND site_id = $2
RETURNING *;

-- name: DeleteAnnouncement :exec
DELETE FROM announcements
WHERE id = $1 AND site_id = $2;
