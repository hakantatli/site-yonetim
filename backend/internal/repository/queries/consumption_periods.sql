-- name: GetLastMainMeterReading :one
SELECT COALESCE(main_meter_current, 0)::NUMERIC(12, 3) AS last_reading
FROM consumption_periods
WHERE site_id = $1 AND meter_type_id = $2
ORDER BY period DESC, created_at DESC
LIMIT 1;

-- name: GetLastApartmentReadings :many
WITH latest_period AS (
    SELECT id
    FROM consumption_periods
    WHERE site_id = $1 AND meter_type_id = $2
    ORDER BY period DESC, created_at DESC
    LIMIT 1
)
SELECT
    a.id AS apartment_id,
    a.door_number,
    b.name AS block_name,
    COALESCE(r.current_reading, 0)::NUMERIC(12, 3) AS last_reading
FROM apartments a
LEFT JOIN blocks b ON a.block_id = b.id
LEFT JOIN latest_period lp ON TRUE
LEFT JOIN meter_readings r ON r.consumption_period_id = lp.id AND r.apartment_id = a.id
WHERE a.site_id = $1 AND a.is_active = TRUE
ORDER BY b.name NULLS FIRST, a.door_number ASC;

-- name: CreateConsumptionPeriod :one
INSERT INTO consumption_periods (
    site_id,
    meter_type_id,
    period,
    main_meter_previous,
    main_meter_current,
    total_billed_consumption,
    total_apartments_consumption,
    common_area_consumption,
    total_bill_amount,
    unit_cost,
    common_area_cost,
    bill_date,
    bill_no,
    description,
    created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
) RETURNING *;

-- name: ListConsumptionPeriodsBySite :many
SELECT
    cp.*,
    mt.name AS meter_type_name,
    mt.unit AS meter_type_unit,
    COUNT(mr.id)::BIGINT AS reading_count
FROM consumption_periods cp
JOIN meter_types mt ON cp.meter_type_id = mt.id
LEFT JOIN meter_readings mr ON mr.consumption_period_id = cp.id
WHERE cp.site_id = $1
GROUP BY cp.id, mt.name, mt.unit
ORDER BY cp.period DESC, cp.created_at DESC;

-- name: GetConsumptionPeriodByID :one
SELECT
    cp.*,
    mt.name AS meter_type_name,
    mt.unit AS meter_type_unit
FROM consumption_periods cp
JOIN meter_types mt ON cp.meter_type_id = mt.id
WHERE cp.id = $1 AND cp.site_id = $2
LIMIT 1;

-- name: DeleteConsumptionPeriod :exec
DELETE FROM consumption_periods
WHERE id = $1 AND site_id = $2;

-- name: CreateMeterReading :one
INSERT INTO meter_readings (
    consumption_period_id,
    apartment_id,
    previous_reading,
    current_reading,
    consumption,
    individual_amount,
    common_area_amount,
    total_amount,
    debt_id,
    debtor_user_id,
    reading_date,
    notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
) RETURNING *;

-- name: ListMeterReadingsByPeriodID :many
SELECT
    mr.*,
    a.door_number,
    b.name AS block_name,
    u.full_name AS debtor_full_name,
    u.phone AS debtor_phone,
    d.status AS debt_status
FROM meter_readings mr
JOIN apartments a ON mr.apartment_id = a.id
LEFT JOIN blocks b ON a.block_id = b.id
LEFT JOIN users u ON mr.debtor_user_id = u.id
LEFT JOIN debts d ON mr.debt_id = d.id
WHERE mr.consumption_period_id = $1
ORDER BY b.name NULLS FIRST, a.door_number ASC;

-- name: GetResidentMeterHistoryByApartmentID :many
SELECT
    mr.id AS reading_id,
    mr.reading_date,
    mr.previous_reading,
    mr.current_reading,
    mr.consumption,
    mr.individual_amount,
    mr.common_area_amount,
    mr.total_amount,
    d.id AS debt_id,
    d.status AS debt_status,
    cp.period,
    cp.bill_date,
    cp.bill_no,
    cp.total_bill_amount,
    cp.unit_cost,
    cp.total_billed_consumption,
    cp.common_area_consumption,
    mt.name AS meter_type_name,
    mt.unit AS meter_type_unit
FROM meter_readings mr
JOIN consumption_periods cp ON mr.consumption_period_id = cp.id
JOIN meter_types mt ON cp.meter_type_id = mt.id
LEFT JOIN debts d ON mr.debt_id = d.id
WHERE mr.apartment_id = $1
ORDER BY cp.period DESC, mr.created_at DESC;

-- name: GetDebtIDsByPeriodID :many
SELECT debt_id FROM meter_readings
WHERE consumption_period_id = $1 AND debt_id IS NOT NULL;
