package repository

import (
	"context"
	"errors"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrCategoryNotFound = errors.New("kategori bulunamadı")
	ErrExpenseNotFound  = errors.New("masraf kaydı bulunamadı")
)

type ExpenseRepository interface {
	// Categories
	CreateCategory(ctx context.Context, siteID string, name string) (*domain.ExpenseCategory, error)
	ListCategories(ctx context.Context, siteID string, activeOnly bool) ([]domain.ExpenseCategory, error)
	GetCategoryByID(ctx context.Context, id string, siteID string) (*domain.ExpenseCategory, error)
	UpdateCategory(ctx context.Context, id string, siteID string, name string, isActive bool) (*domain.ExpenseCategory, error)
	CountExpensesByCategory(ctx context.Context, categoryID string, siteID string) (int64, error)
	DeleteCategory(ctx context.Context, id string, siteID string) error

	// Expenses
	CreateExpense(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error)
	ListExpenses(ctx context.Context, siteID string, filter domain.ExpenseFilter) ([]domain.Expense, error)
	GetExpenseByID(ctx context.Context, id string, siteID string) (*domain.Expense, error)
	DeleteExpense(ctx context.Context, id string, siteID string) error
	GetExpenseStats(ctx context.Context, siteID string) (*domain.ExpenseStats, error)
	GetCategoryBreakdown(ctx context.Context, siteID string) ([]domain.CategoryBreakdownItem, error)
	GetTreasurySummary(ctx context.Context, siteID string) (*domain.TreasurySummary, error)
	UpdateSiteInitialBalance(ctx context.Context, siteID string, initialBalance float64) (float64, error)
}

type pgExpenseRepository struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewExpenseRepository(pool *pgxpool.Pool) ExpenseRepository {
	return &pgExpenseRepository{
		queries: db.New(pool),
		pool:    pool,
	}
}

// Category methods

func (r *pgExpenseRepository) CreateCategory(ctx context.Context, siteID string, name string) (*domain.ExpenseCategory, error) {
	row, err := r.queries.CreateExpenseCategory(ctx, db.CreateExpenseCategoryParams{
		SiteID:    StringToUUID(siteID),
		Name:      name,
		IsDefault: false,
		IsActive:  true,
	})
	if err != nil {
		return nil, err
	}
	return &domain.ExpenseCategory{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToString(row.SiteID),
		Name:      row.Name,
		IsDefault: row.IsDefault,
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
	}, nil
}

func (r *pgExpenseRepository) ListCategories(ctx context.Context, siteID string, activeOnly bool) ([]domain.ExpenseCategory, error) {
	if activeOnly {
		rows, err := r.queries.ListExpenseCategoriesBySiteID(ctx, StringToUUID(siteID))
		if err != nil {
			return nil, err
		}
		items := make([]domain.ExpenseCategory, len(rows))
		for i, row := range rows {
			items[i] = domain.ExpenseCategory{
				ID:        UUIDToString(row.ID),
				SiteID:    UUIDToString(row.SiteID),
				Name:      row.Name,
				IsDefault: row.IsDefault,
				IsActive:  row.IsActive,
				CreatedAt: row.CreatedAt.Time,
			}
		}
		return items, nil
	}

	rows, err := r.queries.ListAllExpenseCategoriesBySiteID(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}
	items := make([]domain.ExpenseCategory, len(rows))
	for i, row := range rows {
		items[i] = domain.ExpenseCategory{
			ID:        UUIDToString(row.ID),
			SiteID:    UUIDToString(row.SiteID),
			Name:      row.Name,
			IsDefault: row.IsDefault,
			IsActive:  row.IsActive,
			CreatedAt: row.CreatedAt.Time,
		}
	}
	return items, nil
}

func (r *pgExpenseRepository) GetCategoryByID(ctx context.Context, id string, siteID string) (*domain.ExpenseCategory, error) {
	row, err := r.queries.GetExpenseCategoryByID(ctx, db.GetExpenseCategoryByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCategoryNotFound
		}
		return nil, err
	}
	return &domain.ExpenseCategory{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToString(row.SiteID),
		Name:      row.Name,
		IsDefault: row.IsDefault,
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
	}, nil
}

func (r *pgExpenseRepository) UpdateCategory(ctx context.Context, id string, siteID string, name string, isActive bool) (*domain.ExpenseCategory, error) {
	row, err := r.queries.UpdateExpenseCategory(ctx, db.UpdateExpenseCategoryParams{
		ID:       StringToUUID(id),
		SiteID:   StringToUUID(siteID),
		Name:     name,
		IsActive: isActive,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCategoryNotFound
		}
		return nil, err
	}
	return &domain.ExpenseCategory{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToString(row.SiteID),
		Name:      row.Name,
		IsDefault: row.IsDefault,
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
	}, nil
}

func (r *pgExpenseRepository) CountExpensesByCategory(ctx context.Context, categoryID string, siteID string) (int64, error) {
	return r.queries.CountExpensesByCategoryID(ctx, db.CountExpensesByCategoryIDParams{
		CategoryID: StringToUUID(categoryID),
		SiteID:     StringToUUID(siteID),
	})
}

func (r *pgExpenseRepository) DeleteCategory(ctx context.Context, id string, siteID string) error {
	return r.queries.DeleteExpenseCategory(ctx, db.DeleteExpenseCategoryParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

// Expense methods

func (r *pgExpenseRepository) CreateExpense(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error) {
	created, err := r.queries.CreateExpense(ctx, db.CreateExpenseParams{
		SiteID:      StringToUUID(siteID),
		CategoryID:  StringToUUID(req.CategoryID),
		Amount:      Float64ToNumeric(req.Amount),
		Description: PtrStringToText(req.Description),
		ExpenseDate: StringToDate(req.ExpenseDate),
		ReceiptNote: PtrStringToText(req.ReceiptNote),
		RecordedBy:  StringToUUID(recordedBy),
	})
	if err != nil {
		return nil, err
	}

	return r.GetExpenseByID(ctx, UUIDToString(created.ID), siteID)
}

func (r *pgExpenseRepository) ListExpenses(ctx context.Context, siteID string, filter domain.ExpenseFilter) ([]domain.Expense, error) {
	rows, err := r.queries.ListExpensesBySite(ctx, db.ListExpensesBySiteParams{
		SiteID:     StringToUUID(siteID),
		CategoryID: PtrStringToUUID(filter.CategoryID),
		StartDate:  PtrStringToDate(filter.StartDate),
		EndDate:    PtrStringToDate(filter.EndDate),
	})
	if err != nil {
		return nil, err
	}

	items := make([]domain.Expense, len(rows))
	for i, row := range rows {
		items[i] = domain.Expense{
			ID:             UUIDToString(row.ID),
			SiteID:         UUIDToString(row.SiteID),
			CategoryID:     UUIDToString(row.CategoryID),
			CategoryName:   row.CategoryName,
			Amount:         NumericToFloat64(row.Amount),
			Description:    TextToPtrString(row.Description),
			ExpenseDate:    DateToString(row.ExpenseDate),
			ReceiptNote:    TextToPtrString(row.ReceiptNote),
			RecordedBy:     UUIDToString(row.RecordedBy),
			RecordedByName: row.RecordedByName,
			CreatedAt:      row.CreatedAt.Time,
			UpdatedAt:      row.UpdatedAt.Time,
		}
	}
	return items, nil
}

func (r *pgExpenseRepository) GetExpenseByID(ctx context.Context, id string, siteID string) (*domain.Expense, error) {
	row, err := r.queries.GetExpenseByID(ctx, db.GetExpenseByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrExpenseNotFound
		}
		return nil, err
	}

	return &domain.Expense{
		ID:             UUIDToString(row.ID),
		SiteID:         UUIDToString(row.SiteID),
		CategoryID:     UUIDToString(row.CategoryID),
		CategoryName:   row.CategoryName,
		Amount:         NumericToFloat64(row.Amount),
		Description:    TextToPtrString(row.Description),
		ExpenseDate:    DateToString(row.ExpenseDate),
		ReceiptNote:    TextToPtrString(row.ReceiptNote),
		RecordedBy:     UUIDToString(row.RecordedBy),
		RecordedByName: row.RecordedByName,
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}, nil
}

func (r *pgExpenseRepository) DeleteExpense(ctx context.Context, id string, siteID string) error {
	return r.queries.DeleteExpenseByID(ctx, db.DeleteExpenseByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

func (r *pgExpenseRepository) GetExpenseStats(ctx context.Context, siteID string) (*domain.ExpenseStats, error) {
	stats, err := r.queries.GetExpenseStatsBySite(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}
	return &domain.ExpenseStats{
		TotalAmount:     NumericToFloat64(stats.TotalAmount),
		ThisMonthAmount: NumericToFloat64(stats.ThisMonthAmount),
		TotalCount:      stats.TotalCount,
	}, nil
}

func (r *pgExpenseRepository) GetCategoryBreakdown(ctx context.Context, siteID string) ([]domain.CategoryBreakdownItem, error) {
	rows, err := r.queries.GetCategoryBreakdownBySite(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}

	var total float64
	items := make([]domain.CategoryBreakdownItem, len(rows))
	for i, row := range rows {
		amt := NumericToFloat64(row.TotalAmount)
		total += amt
		items[i] = domain.CategoryBreakdownItem{
			CategoryID:   UUIDToString(row.CategoryID),
			CategoryName: row.CategoryName,
			TotalAmount:  amt,
			ExpenseCount: row.ExpenseCount,
		}
	}

	for i := range items {
		if total > 0 {
			items[i].Percentage = (items[i].TotalAmount / total) * 100
		}
	}

	return items, nil
}

func (r *pgExpenseRepository) GetTreasurySummary(ctx context.Context, siteID string) (*domain.TreasurySummary, error) {
	siteUUID := StringToUUID(siteID)

	totalIncomeNum, err := r.queries.GetTotalIncomeBySite(ctx, siteUUID)
	if err != nil {
		return nil, err
	}
	totalIncome := NumericToFloat64(totalIncomeNum)

	thisMonthIncomeNum, err := r.queries.GetThisMonthIncomeBySite(ctx, siteUUID)
	if err != nil {
		return nil, err
	}
	thisMonthIncome := NumericToFloat64(thisMonthIncomeNum)

	expenseStats, err := r.GetExpenseStats(ctx, siteID)
	if err != nil {
		return nil, err
	}

	categoryBreakdown, err := r.GetCategoryBreakdown(ctx, siteID)
	if err != nil {
		return nil, err
	}

	cashflowRows, err := r.queries.GetMonthlyCashflowBySite(ctx, siteUUID)
	if err != nil {
		return nil, err
	}

	flowMap := make(map[string]*domain.MonthlyFlowItem)
	var order []string
	for _, row := range cashflowRows {
		item, exists := flowMap[row.MonthStr]
		if !exists {
			item = &domain.MonthlyFlowItem{Month: row.MonthStr}
			flowMap[row.MonthStr] = item
			order = append(order, row.MonthStr)
		}
		amt := NumericToFloat64(row.Total)
		if row.FlowType == "income" {
			item.Income = amt
		} else if row.FlowType == "expense" {
			item.Expense = amt
		}
		item.Net = item.Income - item.Expense
	}

	monthlyFlow := make([]domain.MonthlyFlowItem, len(order))
	for i, m := range order {
		monthlyFlow[i] = *flowMap[m]
	}

	initBalanceNum, err := r.queries.GetSiteInitialBalance(ctx, siteUUID)
	if err != nil {
		return nil, err
	}
	initialBalance := NumericToFloat64(initBalanceNum)

	return &domain.TreasurySummary{
		InitialBalance:    initialBalance,
		TotalIncome:       totalIncome,
		TotalExpense:      expenseStats.TotalAmount,
		NetBalance:        initialBalance + totalIncome - expenseStats.TotalAmount,
		ThisMonthIncome:   thisMonthIncome,
		ThisMonthExpense:  expenseStats.ThisMonthAmount,
		ThisMonthNet:      thisMonthIncome - expenseStats.ThisMonthAmount,
		CategoryBreakdown: categoryBreakdown,
		MonthlyFlow:       monthlyFlow,
	}, nil
}

func (r *pgExpenseRepository) UpdateSiteInitialBalance(ctx context.Context, siteID string, initialBalance float64) (float64, error) {
	updated, err := r.queries.UpdateSiteInitialBalance(ctx, db.UpdateSiteInitialBalanceParams{
		ID:             StringToUUID(siteID),
		InitialBalance: Float64ToNumeric(initialBalance),
	})
	if err != nil {
		return 0, err
	}
	return NumericToFloat64(updated), nil
}

