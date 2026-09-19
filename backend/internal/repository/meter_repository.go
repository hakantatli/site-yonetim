package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MeterRepository interface {
	CreateMeterType(ctx context.Context, siteID, name, unit string, isActive bool) (*domain.MeterType, error)
	ListMeterTypes(ctx context.Context, siteID string, activeOnly bool) ([]domain.MeterType, error)
	GetMeterTypeByID(ctx context.Context, id, siteID string) (*domain.MeterType, error)
	UpdateMeterType(ctx context.Context, id, siteID, name, unit string, isActive bool) (*domain.MeterType, error)
	DeleteMeterType(ctx context.Context, id, siteID string) error
	CountPeriodsByMeterType(ctx context.Context, meterTypeID, siteID string) (int64, error)

	GetPreviousReadings(ctx context.Context, siteID, meterTypeID string) (float64, []domain.ApartmentLastReading, error)
	CreateConsumptionPeriodWithReadings(ctx context.Context, period *domain.ConsumptionPeriod, readings []domain.MeterReading) (*domain.ConsumptionPeriod, []domain.MeterReading, error)
	ListConsumptionPeriods(ctx context.Context, siteID string) ([]domain.ConsumptionPeriod, error)
	GetConsumptionPeriod(ctx context.Context, id, siteID string) (*domain.ConsumptionPeriod, []domain.MeterReading, error)
	DeleteConsumptionPeriod(ctx context.Context, id, siteID string) ([]string, error)
	GetResidentMeterHistory(ctx context.Context, apartmentID string) ([]domain.ResidentMeterHistoryItem, error)
}

type meterRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewMeterRepository(pool *pgxpool.Pool) MeterRepository {
	return &meterRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *meterRepository) CreateMeterType(ctx context.Context, siteID, name, unit string, isActive bool) (*domain.MeterType, error) {
	row, err := r.queries.CreateMeterType(ctx, db.CreateMeterTypeParams{
		SiteID:   StringToUUID(siteID),
		Name:     name,
		Unit:     unit,
		IsActive: isActive,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create meter type: %w", err)
	}
	return toDomainMeterType(row), nil
}

func (r *meterRepository) ListMeterTypes(ctx context.Context, siteID string, activeOnly bool) ([]domain.MeterType, error) {
	siteUUID := StringToUUID(siteID)
	if activeOnly {
		rows, err := r.queries.ListMeterTypesBySiteID(ctx, siteUUID)
		if err != nil {
			return nil, fmt.Errorf("failed to list active meter types: %w", err)
		}
		res := make([]domain.MeterType, len(rows))
		for i, row := range rows {
			res[i] = *toDomainMeterType(row)
		}
		return res, nil
	}

	rows, err := r.queries.ListAllMeterTypesBySiteID(ctx, siteUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to list all meter types: %w", err)
	}
	res := make([]domain.MeterType, len(rows))
	for i, row := range rows {
		res[i] = *toDomainMeterType(row)
	}
	return res, nil
}

func (r *meterRepository) GetMeterTypeByID(ctx context.Context, id, siteID string) (*domain.MeterType, error) {
	row, err := r.queries.GetMeterTypeByID(ctx, db.GetMeterTypeByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get meter type: %w", err)
	}
	return toDomainMeterType(row), nil
}

func (r *meterRepository) UpdateMeterType(ctx context.Context, id, siteID, name, unit string, isActive bool) (*domain.MeterType, error) {
	row, err := r.queries.UpdateMeterType(ctx, db.UpdateMeterTypeParams{
		ID:       StringToUUID(id),
		SiteID:   StringToUUID(siteID),
		Name:     name,
		Unit:     unit,
		IsActive: isActive,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update meter type: %w", err)
	}
	return toDomainMeterType(row), nil
}

func (r *meterRepository) DeleteMeterType(ctx context.Context, id, siteID string) error {
	return r.queries.DeleteMeterType(ctx, db.DeleteMeterTypeParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

func (r *meterRepository) CountPeriodsByMeterType(ctx context.Context, meterTypeID, siteID string) (int64, error) {
	return r.queries.CountPeriodsByMeterTypeID(ctx, db.CountPeriodsByMeterTypeIDParams{
		MeterTypeID: StringToUUID(meterTypeID),
		SiteID:      StringToUUID(siteID),
	})
}

func (r *meterRepository) GetPreviousReadings(ctx context.Context, siteID, meterTypeID string) (float64, []domain.ApartmentLastReading, error) {
	siteUUID := StringToUUID(siteID)
	meterTypeUUID := StringToUUID(meterTypeID)

	var lastMainReading float64
	mainVal, err := r.queries.GetLastMainMeterReading(ctx, db.GetLastMainMeterReadingParams{
		SiteID:      siteUUID,
		MeterTypeID: meterTypeUUID,
	})
	if err == nil {
		lastMainReading = NumericToFloat64(mainVal)
	}

	aptRows, err := r.queries.GetLastApartmentReadings(ctx, db.GetLastApartmentReadingsParams{
		SiteID:      siteUUID,
		MeterTypeID: meterTypeUUID,
	})
	if err != nil {
		return 0, nil, fmt.Errorf("failed to get last apartment readings: %w", err)
	}

	apts := make([]domain.ApartmentLastReading, len(aptRows))
	for i, row := range aptRows {
		apts[i] = domain.ApartmentLastReading{
			ApartmentID: UUIDToString(row.ApartmentID),
			DoorNumber:  row.DoorNumber,
			BlockName:   TextToPtrString(row.BlockName),
			LastReading: NumericToFloat64(row.LastReading),
		}
	}

	return lastMainReading, apts, nil
}

func (r *meterRepository) CreateConsumptionPeriodWithReadings(
	ctx context.Context,
	period *domain.ConsumptionPeriod,
	readings []domain.MeterReading,
) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	periodDate, err := time.Parse("2006-01-02", period.Period)
	if err != nil {
		// try YYYY-MM
		pMonth, err2 := time.Parse("2006-01", period.Period)
		if err2 != nil {
			return nil, nil, fmt.Errorf("invalid period format: %w", err)
		}
		periodDate = pMonth
	}

	pRow, err := qtx.CreateConsumptionPeriod(ctx, db.CreateConsumptionPeriodParams{
		SiteID:                     StringToUUID(period.SiteID),
		MeterTypeID:                StringToUUID(period.MeterTypeID),
		Period:                     pgtype.Date{Time: periodDate, Valid: true},
		MainMeterPrevious:          Float64ToNumeric3(period.MainMeterPrevious),
		MainMeterCurrent:           Float64ToNumeric3(period.MainMeterCurrent),
		TotalBilledConsumption:     Float64ToNumeric3(period.TotalBilledConsumption),
		TotalApartmentsConsumption: Float64ToNumeric3(period.TotalApartmentsConsumption),
		CommonAreaConsumption:      Float64ToNumeric3(period.CommonAreaConsumption),
		TotalBillAmount:            Float64ToNumeric(period.TotalBillAmount),
		UnitCost:                   Float64ToNumeric4(period.UnitCost),
		CommonAreaCost:             Float64ToNumeric(period.CommonAreaCost),
		BillDate:                   PtrStringToDate(period.BillDate),
		BillNo:                     PtrStringToText(period.BillNo),
		Description:                PtrStringToText(period.Description),
		CreatedBy:                  PtrStringToUUID(period.CreatedBy),
	})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create consumption period: %w", err)
	}

	createdReadings := make([]domain.MeterReading, len(readings))
	for i, rd := range readings {
		readingDate, _ := time.Parse("2006-01-02", rd.ReadingDate)
		if readingDate.IsZero() {
			readingDate = time.Now()
		}

		rRow, err := qtx.CreateMeterReading(ctx, db.CreateMeterReadingParams{
			ConsumptionPeriodID: pRow.ID,
			ApartmentID:         StringToUUID(rd.ApartmentID),
			PreviousReading:     Float64ToNumeric3(rd.PreviousReading),
			CurrentReading:      Float64ToNumeric3(rd.CurrentReading),
			Consumption:         Float64ToNumeric3(rd.Consumption),
			IndividualAmount:    Float64ToNumeric(rd.IndividualAmount),
			CommonAreaAmount:    Float64ToNumeric(rd.CommonAreaAmount),
			TotalAmount:         Float64ToNumeric(rd.TotalAmount),
			DebtID:              PtrStringToUUID(rd.DebtID),
			DebtorUserID:        PtrStringToUUID(rd.DebtorUserID),
			ReadingDate:         pgtype.Date{Time: readingDate, Valid: true},
			Notes:               PtrStringToText(rd.Notes),
		})
		if err != nil {
			return nil, nil, fmt.Errorf("failed to create meter reading: %w", err)
		}

		createdReadings[i] = domain.MeterReading{
			ID:                  UUIDToString(rRow.ID),
			ConsumptionPeriodID: UUIDToString(rRow.ConsumptionPeriodID),
			ApartmentID:         UUIDToString(rRow.ApartmentID),
			DoorNumber:          rd.DoorNumber,
			BlockName:           rd.BlockName,
			DebtorUserID:        rd.DebtorUserID,
			DebtorFullName:      rd.DebtorFullName,
			DebtorPhone:         rd.DebtorPhone,
			PreviousReading:     rd.PreviousReading,
			CurrentReading:      rd.CurrentReading,
			Consumption:         rd.Consumption,
			IndividualAmount:    rd.IndividualAmount,
			CommonAreaAmount:    rd.CommonAreaAmount,
			TotalAmount:         rd.TotalAmount,
			DebtID:              rd.DebtID,
			ReadingDate:         DateToString(rRow.ReadingDate),
			Notes:               rd.Notes,
			CreatedAt:           rRow.CreatedAt.Time,
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("failed to commit tx: %w", err)
	}

	period.ID = UUIDToString(pRow.ID)
	period.CreatedAt = pRow.CreatedAt.Time
	period.UpdatedAt = pRow.UpdatedAt.Time
	period.ReadingCount = int64(len(readings))

	return period, createdReadings, nil
}

func (r *meterRepository) ListConsumptionPeriods(ctx context.Context, siteID string) ([]domain.ConsumptionPeriod, error) {
	rows, err := r.queries.ListConsumptionPeriodsBySite(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, fmt.Errorf("failed to list consumption periods: %w", err)
	}

	res := make([]domain.ConsumptionPeriod, len(rows))
	for i, row := range rows {
		res[i] = domain.ConsumptionPeriod{
			ID:                         UUIDToString(row.ID),
			SiteID:                     UUIDToString(row.SiteID),
			MeterTypeID:                UUIDToString(row.MeterTypeID),
			MeterTypeName:              row.MeterTypeName,
			MeterTypeUnit:              row.MeterTypeUnit,
			Period:                     DateToString(row.Period),
			MainMeterPrevious:          NumericToFloat64(row.MainMeterPrevious),
			MainMeterCurrent:           NumericToFloat64(row.MainMeterCurrent),
			TotalBilledConsumption:     NumericToFloat64(row.TotalBilledConsumption),
			TotalApartmentsConsumption: NumericToFloat64(row.TotalApartmentsConsumption),
			CommonAreaConsumption:      NumericToFloat64(row.CommonAreaConsumption),
			TotalBillAmount:            NumericToFloat64(row.TotalBillAmount),
			UnitCost:                   NumericToFloat64(row.UnitCost),
			CommonAreaCost:             NumericToFloat64(row.CommonAreaCost),
			BillDate:                   DateToPtrString(row.BillDate),
			BillNo:                     TextToPtrString(row.BillNo),
			Description:                TextToPtrString(row.Description),
			ReadingCount:               row.ReadingCount,
			CreatedBy:                  UUIDToPtrString(row.CreatedBy),
			CreatedAt:                  row.CreatedAt.Time,
			UpdatedAt:                  row.UpdatedAt.Time,
		}
	}
	return res, nil
}

func (r *meterRepository) GetConsumptionPeriod(ctx context.Context, id, siteID string) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
	pUUID := StringToUUID(id)
	sUUID := StringToUUID(siteID)

	pRow, err := r.queries.GetConsumptionPeriodByID(ctx, db.GetConsumptionPeriodByIDParams{
		ID:     pUUID,
		SiteID: sUUID,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("period not found: %w", err)
	}

	rRows, err := r.queries.ListMeterReadingsByPeriodID(ctx, pUUID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to list readings: %w", err)
	}

	period := &domain.ConsumptionPeriod{
		ID:                         UUIDToString(pRow.ID),
		SiteID:                     UUIDToString(pRow.SiteID),
		MeterTypeID:                UUIDToString(pRow.MeterTypeID),
		MeterTypeName:              pRow.MeterTypeName,
		MeterTypeUnit:              pRow.MeterTypeUnit,
		Period:                     DateToString(pRow.Period),
		MainMeterPrevious:          NumericToFloat64(pRow.MainMeterPrevious),
		MainMeterCurrent:           NumericToFloat64(pRow.MainMeterCurrent),
		TotalBilledConsumption:     NumericToFloat64(pRow.TotalBilledConsumption),
		TotalApartmentsConsumption: NumericToFloat64(pRow.TotalApartmentsConsumption),
		CommonAreaConsumption:      NumericToFloat64(pRow.CommonAreaConsumption),
		TotalBillAmount:            NumericToFloat64(pRow.TotalBillAmount),
		UnitCost:                   NumericToFloat64(pRow.UnitCost),
		CommonAreaCost:             NumericToFloat64(pRow.CommonAreaCost),
		BillDate:                   DateToPtrString(pRow.BillDate),
		BillNo:                     TextToPtrString(pRow.BillNo),
		Description:                TextToPtrString(pRow.Description),
		ReadingCount:               int64(len(rRows)),
		CreatedBy:                  UUIDToPtrString(pRow.CreatedBy),
		CreatedAt:                  pRow.CreatedAt.Time,
		UpdatedAt:                  pRow.UpdatedAt.Time,
	}

	readings := make([]domain.MeterReading, len(rRows))
	for i, row := range rRows {
		debtStatus := TextToPtrString(row.DebtStatus)
		readings[i] = domain.MeterReading{
			ID:                  UUIDToString(row.ID),
			ConsumptionPeriodID: UUIDToString(row.ConsumptionPeriodID),
			ApartmentID:         UUIDToString(row.ApartmentID),
			DoorNumber:          row.DoorNumber,
			BlockName:           TextToPtrString(row.BlockName),
			DebtorUserID:        UUIDToPtrString(row.DebtorUserID),
			DebtorFullName:      TextToPtrString(row.DebtorFullName),
			DebtorPhone:         TextToPtrString(row.DebtorPhone),
			PreviousReading:     NumericToFloat64(row.PreviousReading),
			CurrentReading:      NumericToFloat64(row.CurrentReading),
			Consumption:         NumericToFloat64(row.Consumption),
			IndividualAmount:    NumericToFloat64(row.IndividualAmount),
			CommonAreaAmount:    NumericToFloat64(row.CommonAreaAmount),
			TotalAmount:         NumericToFloat64(row.TotalAmount),
			DebtID:              UUIDToPtrString(row.DebtID),
			DebtStatus:          debtStatus,
			ReadingDate:         DateToString(row.ReadingDate),
			Notes:               TextToPtrString(row.Notes),
			CreatedAt:           row.CreatedAt.Time,
		}
	}

	return period, readings, nil
}

func (r *meterRepository) DeleteConsumptionPeriod(ctx context.Context, id, siteID string) ([]string, error) {
	pUUID := StringToUUID(id)
	sUUID := StringToUUID(siteID)

	debtUUIDs, err := r.queries.GetDebtIDsByPeriodID(ctx, pUUID)
	if err != nil && err != pgx.ErrNoRows {
		return nil, fmt.Errorf("failed to get debt ids: %w", err)
	}

	err = r.queries.DeleteConsumptionPeriod(ctx, db.DeleteConsumptionPeriodParams{
		ID:     pUUID,
		SiteID: sUUID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to delete consumption period: %w", err)
	}

	deletedDebtIDs := make([]string, 0, len(debtUUIDs))
	for _, du := range debtUUIDs {
		if du.Valid {
			deletedDebtIDs = append(deletedDebtIDs, uuid.UUID(du.Bytes).String())
		}
	}
	return deletedDebtIDs, nil
}

func (r *meterRepository) GetResidentMeterHistory(ctx context.Context, apartmentID string) ([]domain.ResidentMeterHistoryItem, error) {
	rows, err := r.queries.GetResidentMeterHistoryByApartmentID(ctx, StringToUUID(apartmentID))
	if err != nil {
		return nil, fmt.Errorf("failed to get resident meter history: %w", err)
	}

	res := make([]domain.ResidentMeterHistoryItem, len(rows))
	for i, row := range rows {
		debtStatus := TextToPtrString(row.DebtStatus)

		res[i] = domain.ResidentMeterHistoryItem{
			ReadingID:              UUIDToString(row.ReadingID),
			ReadingDate:            DateToString(row.ReadingDate),
			PreviousReading:        NumericToFloat64(row.PreviousReading),
			CurrentReading:         NumericToFloat64(row.CurrentReading),
			Consumption:            NumericToFloat64(row.Consumption),
			IndividualAmount:       NumericToFloat64(row.IndividualAmount),
			CommonAreaAmount:       NumericToFloat64(row.CommonAreaAmount),
			TotalAmount:            NumericToFloat64(row.TotalAmount),
			DebtID:                 UUIDToPtrString(row.DebtID),
			DebtStatus:             debtStatus,
			Period:                 DateToString(row.Period),
			BillDate:               DateToPtrString(row.BillDate),
			BillNo:                 TextToPtrString(row.BillNo),
			TotalBillAmount:        NumericToFloat64(row.TotalBillAmount),
			UnitCost:               NumericToFloat64(row.UnitCost),
			TotalBilledConsumption: NumericToFloat64(row.TotalBilledConsumption),
			CommonAreaConsumption:  NumericToFloat64(row.CommonAreaConsumption),
			MeterTypeName:          row.MeterTypeName,
			MeterTypeUnit:          row.MeterTypeUnit,
		}
	}
	return res, nil
}

func toDomainMeterType(m db.MeterTypes) *domain.MeterType {
	return &domain.MeterType{
		ID:        UUIDToString(m.ID),
		SiteID:    UUIDToString(m.SiteID),
		Name:      m.Name,
		Unit:      m.Unit,
		IsActive:  m.IsActive,
		CreatedAt: m.CreatedAt.Time,
	}
}
