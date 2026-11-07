-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS site_admins (
    site_id    UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_site_admins_user_id ON site_admins (user_id);

INSERT INTO site_admins (site_id, user_id)
SELECT site_id, id
FROM users
WHERE role = 'admin' AND site_id IS NOT NULL
ON CONFLICT (site_id, user_id) DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS site_admins;
-- +goose StatementEnd
