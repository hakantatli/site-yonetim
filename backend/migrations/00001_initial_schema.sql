-- +goose Up
-- +goose StatementBegin

-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. SITES
-- ================================================================
CREATE TABLE sites (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT          NOT NULL,
    address          TEXT,
    apartment_limit  INT           NOT NULL DEFAULT 10,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 2. USERS
-- ================================================================
-- site_id: owner için NULL, admin için zorunlu, resident için zorunlu
CREATE TABLE users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id       UUID          REFERENCES sites(id) ON DELETE CASCADE,
    email         TEXT          NOT NULL UNIQUE,
    password_hash TEXT          NOT NULL,
    full_name     TEXT          NOT NULL,
    phone         TEXT,
    role          TEXT          NOT NULL CHECK (role IN ('owner', 'admin', 'resident')),
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_site_id ON users (site_id);
CREATE INDEX idx_users_role    ON users (role);

-- ================================================================
-- 3. REFRESH TOKENS
-- ================================================================
CREATE TABLE refresh_tokens (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT          NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ   NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ================================================================
-- 4. BLOCKS
-- ================================================================
CREATE TABLE blocks (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id    UUID          NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name       TEXT          NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (site_id, name)
);

-- ================================================================
-- 5. APARTMENTS
-- ================================================================
CREATE TABLE apartments (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID          NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    block_id        UUID          REFERENCES blocks(id) ON DELETE SET NULL,
    door_number     TEXT          NOT NULL,
    floor           INT,
    owner_user_id   UUID          REFERENCES users(id) ON DELETE SET NULL,
    tenant_user_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (site_id, block_id, door_number)
);

CREATE INDEX idx_apartments_site_id   ON apartments (site_id);
CREATE INDEX idx_apartments_is_active ON apartments (is_active);
CREATE INDEX idx_apartments_owner     ON apartments (owner_user_id);
CREATE INDEX idx_apartments_tenant    ON apartments (tenant_user_id);

-- ================================================================
-- 6. TENANT HISTORY
-- ================================================================
-- Her kiracı değişiminde kayıt oluşturulur.
-- debt_action: kiracı çıkışında yöneticinin borç kararı
CREATE TABLE tenant_history (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id    UUID          NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    tenant_user_id  UUID          NOT NULL REFERENCES users(id),
    started_at      DATE          NOT NULL,
    ended_at        DATE,
    debt_action     TEXT          CHECK (debt_action IN ('keep', 'transfer', 'delete')),
    notes           TEXT,
    recorded_by     UUID          REFERENCES users(id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 7. DUE RATES (Aidat Tarihi)
-- ================================================================
-- Her değişiklik yeni satır — geçmiş tahakkuklar etkilenmez.
CREATE TABLE due_rates (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID            NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    amount      NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    valid_from  DATE            NOT NULL,
    created_by  UUID            NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (site_id, valid_from)
);

CREATE INDEX idx_due_rates_site_valid ON due_rates (site_id, valid_from DESC);

-- ================================================================
-- 8. DEBTS (Borçlar / Tahakkuklar)
-- ================================================================
CREATE TABLE debts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID            NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    apartment_id    UUID            NOT NULL REFERENCES apartments(id),
    debtor_user_id  UUID            NOT NULL REFERENCES users(id),
    type            TEXT            NOT NULL
                        CHECK (type IN ('monthly_due', 'fixture', 'investment', 'other')),
    amount          NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    due_month       DATE,
    description     TEXT,
    status          TEXT            NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'partial', 'paid')),
    created_by      UUID            REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Aynı daireye aynı ay için birden fazla aylık aidat tahakkumu engellenir
CREATE UNIQUE INDEX idx_debts_monthly_unique
    ON debts (apartment_id, due_month)
    WHERE type = 'monthly_due';

CREATE INDEX idx_debts_site_id   ON debts (site_id);
CREATE INDEX idx_debts_debtor    ON debts (debtor_user_id);
CREATE INDEX idx_debts_apartment ON debts (apartment_id);
CREATE INDEX idx_debts_status    ON debts (status);
CREATE INDEX idx_debts_due_month ON debts (due_month);

-- ================================================================
-- 9. PAYMENTS (Ödemeler)
-- ================================================================
-- Kısmi ödeme: bir borç için birden fazla kayıt olabilir.
-- Kalan bakiye = debt.amount - SUM(payments.amount WHERE debt_id = ?)
CREATE TABLE payments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id         UUID            NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    site_id         UUID            NOT NULL REFERENCES sites(id),
    amount          NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    payment_method  TEXT            CHECK (payment_method IN ('cash', 'transfer')),
    payment_date    DATE            NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    recorded_by     UUID            NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_debt_id ON payments (debt_id);
CREATE INDEX idx_payments_site_id ON payments (site_id);
CREATE INDEX idx_payments_date    ON payments (payment_date);

-- ================================================================
-- 10. EXPENSE CATEGORIES (Masraf Kategorileri)
-- ================================================================
CREATE TABLE expense_categories (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID          NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name        TEXT          NOT NULL,
    is_default  BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (site_id, name)
);

-- ================================================================
-- 11. EXPENSES (Masraflar)
-- ================================================================
CREATE TABLE expenses (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id       UUID            NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    category_id   UUID            NOT NULL REFERENCES expense_categories(id),
    amount        NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    description   TEXT,
    expense_date  DATE            NOT NULL,
    receipt_note  TEXT,           -- İleride PDF rapor için hook noktası
    recorded_by   UUID            NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_site_id  ON expenses (site_id);
CREATE INDEX idx_expenses_category ON expenses (category_id);
CREATE INDEX idx_expenses_date     ON expenses (expense_date);

-- ================================================================
-- 12. ANNOUNCEMENTS (Duyurular)
-- ================================================================
CREATE TABLE announcements (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id      UUID          NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    title        TEXT          NOT NULL,
    content      TEXT          NOT NULL,
    priority     TEXT          NOT NULL DEFAULT 'normal'
                     CHECK (priority IN ('normal', 'important', 'urgent')),
    published_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by   UUID          NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_site ON announcements (site_id, published_at DESC);

-- ================================================================
-- VIEWS
-- ================================================================

-- Kalan borç hesabı
CREATE VIEW debt_summary AS
SELECT
    d.id,
    d.site_id,
    d.apartment_id,
    d.debtor_user_id,
    d.type,
    d.amount,
    d.due_month,
    d.description,
    d.status,
    d.created_at,
    COALESCE(SUM(p.amount), 0)              AS paid_amount,
    d.amount - COALESCE(SUM(p.amount), 0)  AS remaining
FROM debts d
LEFT JOIN payments p ON p.debt_id = d.id
GROUP BY d.id;

-- Şeffaf kasa: aylık gelir/gider özeti
CREATE VIEW monthly_cashflow AS
SELECT
    site_id,
    DATE_TRUNC('month', payment_date)  AS month,
    'income'                           AS flow_type,
    SUM(amount)                        AS total
FROM payments
GROUP BY site_id, DATE_TRUNC('month', payment_date)

UNION ALL

SELECT
    site_id,
    DATE_TRUNC('month', expense_date)  AS month,
    'expense'                          AS flow_type,
    SUM(amount)                        AS total
FROM expenses
GROUP BY site_id, DATE_TRUNC('month', expense_date);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS monthly_cashflow;
DROP VIEW IF EXISTS debt_summary;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS debts;
DROP TABLE IF EXISTS due_rates;
DROP TABLE IF EXISTS tenant_history;
DROP TABLE IF EXISTS apartments;
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sites;
DROP EXTENSION IF EXISTS "pgcrypto";
-- +goose StatementEnd
