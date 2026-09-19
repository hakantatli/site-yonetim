-- +goose Up
-- +goose StatementBegin
-- 1. debts tablosundaki type kısıtlamasına 'utility' (sayaç/tüketim) türü ekleme
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_type_check;
ALTER TABLE debts ADD CONSTRAINT debts_type_check CHECK (type IN ('monthly_due', 'fixture', 'investment', 'other', 'utility'));

-- 2. Sayaç / Hizmet Türleri tablosu (Su, Doğalgaz, Isı Payölçer, Elektrik vb.)
CREATE TABLE IF NOT EXISTS meter_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    unit        TEXT NOT NULL DEFAULT 'm³',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (site_id, name)
);

CREATE INDEX IF NOT EXISTS idx_meter_types_site_id ON meter_types (site_id);

-- 3. Faturalandırma ve Dağıtım Oturumları tablosu
CREATE TABLE IF NOT EXISTS consumption_periods (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id                      UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    meter_type_id                UUID NOT NULL REFERENCES meter_types(id) ON DELETE RESTRICT,
    period                       DATE NOT NULL,
    main_meter_previous          NUMERIC(12, 3) NOT NULL DEFAULT 0,
    main_meter_current           NUMERIC(12, 3) NOT NULL DEFAULT 0,
    total_billed_consumption     NUMERIC(12, 3) NOT NULL DEFAULT 0,
    total_apartments_consumption NUMERIC(12, 3) NOT NULL DEFAULT 0,
    common_area_consumption      NUMERIC(12, 3) NOT NULL DEFAULT 0,
    total_bill_amount            NUMERIC(10, 2) NOT NULL CHECK (total_bill_amount > 0),
    unit_cost                    NUMERIC(12, 4) NOT NULL DEFAULT 0,
    common_area_cost             NUMERIC(10, 2) NOT NULL DEFAULT 0,
    bill_date                    DATE,
    bill_no                      TEXT,
    description                  TEXT,
    created_by                   UUID REFERENCES users(id),
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumption_periods_site_id ON consumption_periods (site_id);
CREATE INDEX IF NOT EXISTS idx_consumption_periods_period ON consumption_periods (site_id, meter_type_id, period DESC);

-- 4. Daire Sayaç Okuma ve Borçlandırma Detayları tablosu
CREATE TABLE IF NOT EXISTS meter_readings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumption_period_id   UUID NOT NULL REFERENCES consumption_periods(id) ON DELETE CASCADE,
    apartment_id            UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    previous_reading        NUMERIC(12, 3) NOT NULL DEFAULT 0,
    current_reading         NUMERIC(12, 3) NOT NULL DEFAULT 0,
    consumption             NUMERIC(12, 3) NOT NULL DEFAULT 0,
    individual_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    common_area_amount      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount            NUMERIC(10, 2) NOT NULL DEFAULT 0,
    debt_id                 UUID REFERENCES debts(id) ON DELETE SET NULL,
    debtor_user_id          UUID REFERENCES users(id),
    reading_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (consumption_period_id, apartment_id)
);

CREATE INDEX IF NOT EXISTS idx_meter_readings_period ON meter_readings (consumption_period_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_apt ON meter_readings (apartment_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_debt ON meter_readings (debt_id);

-- 5. Mevcut tüm sitelere varsayılan Su ve Doğal Gaz sayaç türlerini tanımla
INSERT INTO meter_types (site_id, name, unit)
SELECT s.id, 'Su', 'm³'
FROM sites s
ON CONFLICT (site_id, name) DO NOTHING;

INSERT INTO meter_types (site_id, name, unit)
SELECT s.id, 'Doğal Gaz', 'm³'
FROM sites s
ON CONFLICT (site_id, name) DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS meter_readings;
DROP TABLE IF EXISTS consumption_periods;
DROP TABLE IF EXISTS meter_types;

ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_type_check;
ALTER TABLE debts ADD CONSTRAINT debts_type_check CHECK (type IN ('monthly_due', 'fixture', 'investment', 'other'));
-- +goose StatementEnd
