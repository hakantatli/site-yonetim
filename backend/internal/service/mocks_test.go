package service

import (
	"context"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
)

// MockUserRepository
type mockUserRepository struct {
	getByPhoneOrEmailFn func(ctx context.Context, identifier string) (*domain.User, string, error)
	getByPhoneFn        func(ctx context.Context, phone string) (*domain.User, string, error)
	getByEmailFn        func(ctx context.Context, email string) (*domain.User, string, error)
	getByIDFn           func(ctx context.Context, id string) (*domain.User, error)
	createFn            func(ctx context.Context, user *domain.User, passwordHash string) (*domain.User, error)
	countOwnersFn       func(ctx context.Context) (int64, error)
	listAdminsBySiteIDFn func(ctx context.Context, siteID string) ([]domain.User, error)
	updateUserDetailsFn func(ctx context.Context, id string, fullName string, phone string, email *string) (*domain.User, error)
	updateUserPasswordFn func(ctx context.Context, id string, passwordHash string) error
}

func (m *mockUserRepository) GetByPhoneOrEmail(ctx context.Context, identifier string) (*domain.User, string, error) {
	if m.getByPhoneOrEmailFn != nil {
		return m.getByPhoneOrEmailFn(ctx, identifier)
	}
	return nil, "", repository.ErrUserNotFound
}

func (m *mockUserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, string, error) {
	if m.getByPhoneFn != nil {
		return m.getByPhoneFn(ctx, phone)
	}
	return nil, "", repository.ErrUserNotFound
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, string, error) {
	if m.getByEmailFn != nil {
		return m.getByEmailFn(ctx, email)
	}
	return nil, "", repository.ErrUserNotFound
}

func (m *mockUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, id)
	}
	return nil, repository.ErrUserNotFound
}

func (m *mockUserRepository) Create(ctx context.Context, user *domain.User, passwordHash string) (*domain.User, error) {
	if m.createFn != nil {
		return m.createFn(ctx, user, passwordHash)
	}
	return user, nil
}

func (m *mockUserRepository) CountOwners(ctx context.Context) (int64, error) {
	if m.countOwnersFn != nil {
		return m.countOwnersFn(ctx)
	}
	return 0, nil
}

func (m *mockUserRepository) ListAdminsBySiteID(ctx context.Context, siteID string) ([]domain.User, error) {
	if m.listAdminsBySiteIDFn != nil {
		return m.listAdminsBySiteIDFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockUserRepository) UpdateUserDetails(ctx context.Context, id string, fullName string, phone string, email *string) (*domain.User, error) {
	if m.updateUserDetailsFn != nil {
		return m.updateUserDetailsFn(ctx, id, fullName, phone, email)
	}
	return &domain.User{
		ID:       id,
		FullName: fullName,
		Phone:    phone,
		Email:    email,
	}, nil
}

func (m *mockUserRepository) UpdateUserPassword(ctx context.Context, id string, passwordHash string) error {
	if m.updateUserPasswordFn != nil {
		return m.updateUserPasswordFn(ctx, id, passwordHash)
	}
	return nil
}


// MockTokenRepository
type mockTokenRepository struct {
	createRefreshTokenFn func(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error
	getRefreshTokenFn    func(ctx context.Context, tokenHash string) (string, time.Time, error)
	revokeRefreshTokenFn func(ctx context.Context, tokenHash string) error
	revokeUserRefreshTokensFn func(ctx context.Context, userID string) error
}

func (m *mockTokenRepository) CreateRefreshToken(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
	if m.createRefreshTokenFn != nil {
		return m.createRefreshTokenFn(ctx, userID, tokenHash, expiresAt)
	}
	return nil
}

func (m *mockTokenRepository) GetRefreshToken(ctx context.Context, tokenHash string) (string, time.Time, error) {
	if m.getRefreshTokenFn != nil {
		return m.getRefreshTokenFn(ctx, tokenHash)
	}
	return "", time.Time{}, repository.ErrTokenNotFound
}

func (m *mockTokenRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	if m.revokeRefreshTokenFn != nil {
		return m.revokeRefreshTokenFn(ctx, tokenHash)
	}
	return nil
}

func (m *mockTokenRepository) RevokeUserRefreshTokens(ctx context.Context, userID string) error {
	if m.revokeUserRefreshTokensFn != nil {
		return m.revokeUserRefreshTokensFn(ctx, userID)
	}
	return nil
}

// MockSiteRepository
type mockSiteRepository struct {
	createFn             func(ctx context.Context, name string, address *string, limit int32) (*domain.Site, error)
	getByIDFn            func(ctx context.Context, id string) (*domain.Site, error)
	listFn               func(ctx context.Context) ([]domain.Site, error)
	getDetailsFn         func(ctx context.Context, id string) (*domain.SiteDetail, error)
	updateLimitFn        func(ctx context.Context, id string, limit int32) (*domain.Site, error)
	createDefaultCatsFn  func(ctx context.Context, siteID string) error
}

func (m *mockSiteRepository) Create(ctx context.Context, name string, address *string, limit int32) (*domain.Site, error) {
	if m.createFn != nil {
		return m.createFn(ctx, name, address, limit)
	}
	return nil, nil
}

func (m *mockSiteRepository) GetByID(ctx context.Context, id string) (*domain.Site, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, id)
	}
	return nil, repository.ErrSiteNotFound
}

func (m *mockSiteRepository) List(ctx context.Context) ([]domain.Site, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return nil, nil
}

func (m *mockSiteRepository) GetDetails(ctx context.Context, id string) (*domain.SiteDetail, error) {
	if m.getDetailsFn != nil {
		return m.getDetailsFn(ctx, id)
	}
	return nil, repository.ErrSiteNotFound
}

func (m *mockSiteRepository) UpdateLimit(ctx context.Context, id string, limit int32) (*domain.Site, error) {
	if m.updateLimitFn != nil {
		return m.updateLimitFn(ctx, id, limit)
	}
	return nil, nil
}

func (m *mockSiteRepository) CreateDefaultCategories(ctx context.Context, siteID string) error {
	if m.createDefaultCatsFn != nil {
		return m.createDefaultCatsFn(ctx, siteID)
	}
	return nil
}

// MockApartmentRepository
type mockApartmentRepository struct {
	createBlockFn              func(ctx context.Context, siteID string, name string) (*domain.Block, error)
	listBlocksFn               func(ctx context.Context, siteID string) ([]domain.Block, error)
	deleteBlockFn              func(ctx context.Context, id string, siteID string) error
	countActiveApartmentsFn    func(ctx context.Context, siteID string) (int64, error)
	listApartmentsFn           func(ctx context.Context, siteID string) ([]domain.Apartment, error)
	getApartmentByIDFn         func(ctx context.Context, id string, siteID string) (*domain.Apartment, error)
	createApartmentFn          func(ctx context.Context, siteID string, blockID *string, doorNumber string, floor *int32, ownerUserID *string, tenantUserID *string) (*domain.Apartment, error)
	updateApartmentFn          func(ctx context.Context, id string, siteID string, blockID *string, doorNumber string, floor *int32) (*domain.Apartment, error)
	softDeleteApartmentFn      func(ctx context.Context, id string, siteID string) error
	setApartmentOwnerFn        func(ctx context.Context, id string, siteID string, ownerUserID string) error
	setApartmentTenantFn       func(ctx context.Context, id string, siteID string, tenantUserID string) error
	removeApartmentTenantFn    func(ctx context.Context, id string, siteID string) error
	createTenantHistoryFn      func(ctx context.Context, apartmentID string, tenantUserID string, startedAt time.Time, recordedBy *string) error
	endTenantHistoryFn         func(ctx context.Context, apartmentID string, tenantUserID string, endedAt time.Time, debtAction string, notes *string) error
	listTenantHistoryFn        func(ctx context.Context, apartmentID string) ([]domain.TenantHistoryItem, error)
	transferOpenDebtsToOwnerFn func(ctx context.Context, apartmentID string, oldDebtorID string, newDebtorID string) error
	deleteOpenDebtsByDebtorFn  func(ctx context.Context, apartmentID string, debtorID string) error
}

func (m *mockApartmentRepository) CreateBlock(ctx context.Context, siteID string, name string) (*domain.Block, error) {
	if m.createBlockFn != nil {
		return m.createBlockFn(ctx, siteID, name)
	}
	return &domain.Block{ID: "block-1", SiteID: siteID, Name: name}, nil
}

func (m *mockApartmentRepository) ListBlocks(ctx context.Context, siteID string) ([]domain.Block, error) {
	if m.listBlocksFn != nil {
		return m.listBlocksFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockApartmentRepository) DeleteBlock(ctx context.Context, id string, siteID string) error {
	if m.deleteBlockFn != nil {
		return m.deleteBlockFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockApartmentRepository) CountActiveApartments(ctx context.Context, siteID string) (int64, error) {
	if m.countActiveApartmentsFn != nil {
		return m.countActiveApartmentsFn(ctx, siteID)
	}
	return 0, nil
}

func (m *mockApartmentRepository) ListApartments(ctx context.Context, siteID string) ([]domain.Apartment, error) {
	if m.listApartmentsFn != nil {
		return m.listApartmentsFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockApartmentRepository) GetApartmentByID(ctx context.Context, id string, siteID string) (*domain.Apartment, error) {
	if m.getApartmentByIDFn != nil {
		return m.getApartmentByIDFn(ctx, id, siteID)
	}
	return nil, repository.ErrApartmentNotFound
}

func (m *mockApartmentRepository) CreateApartment(ctx context.Context, siteID string, blockID *string, doorNumber string, floor *int32, ownerUserID *string, tenantUserID *string) (*domain.Apartment, error) {
	if m.createApartmentFn != nil {
		return m.createApartmentFn(ctx, siteID, blockID, doorNumber, floor, ownerUserID, tenantUserID)
	}
	return &domain.Apartment{ID: "apt-1", SiteID: siteID, DoorNumber: doorNumber}, nil
}

func (m *mockApartmentRepository) UpdateApartment(ctx context.Context, id string, siteID string, blockID *string, doorNumber string, floor *int32) (*domain.Apartment, error) {
	if m.updateApartmentFn != nil {
		return m.updateApartmentFn(ctx, id, siteID, blockID, doorNumber, floor)
	}
	return nil, nil
}

func (m *mockApartmentRepository) SoftDeleteApartment(ctx context.Context, id string, siteID string) error {
	if m.softDeleteApartmentFn != nil {
		return m.softDeleteApartmentFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockApartmentRepository) SetApartmentOwner(ctx context.Context, id string, siteID string, ownerUserID string) error {
	if m.setApartmentOwnerFn != nil {
		return m.setApartmentOwnerFn(ctx, id, siteID, ownerUserID)
	}
	return nil
}

func (m *mockApartmentRepository) SetApartmentTenant(ctx context.Context, id string, siteID string, tenantUserID string) error {
	if m.setApartmentTenantFn != nil {
		return m.setApartmentTenantFn(ctx, id, siteID, tenantUserID)
	}
	return nil
}

func (m *mockApartmentRepository) RemoveApartmentTenant(ctx context.Context, id string, siteID string) error {
	if m.removeApartmentTenantFn != nil {
		return m.removeApartmentTenantFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockApartmentRepository) CreateTenantHistory(ctx context.Context, apartmentID string, tenantUserID string, startedAt time.Time, recordedBy *string) error {
	if m.createTenantHistoryFn != nil {
		return m.createTenantHistoryFn(ctx, apartmentID, tenantUserID, startedAt, recordedBy)
	}
	return nil
}

func (m *mockApartmentRepository) EndTenantHistory(ctx context.Context, apartmentID string, tenantUserID string, endedAt time.Time, debtAction string, notes *string) error {
	if m.endTenantHistoryFn != nil {
		return m.endTenantHistoryFn(ctx, apartmentID, tenantUserID, endedAt, debtAction, notes)
	}
	return nil
}

func (m *mockApartmentRepository) ListTenantHistory(ctx context.Context, apartmentID string) ([]domain.TenantHistoryItem, error) {
	if m.listTenantHistoryFn != nil {
		return m.listTenantHistoryFn(ctx, apartmentID)
	}
	return nil, nil
}

func (m *mockApartmentRepository) TransferOpenDebtsToOwner(ctx context.Context, apartmentID string, oldDebtorID string, newDebtorID string) error {
	if m.transferOpenDebtsToOwnerFn != nil {
		return m.transferOpenDebtsToOwnerFn(ctx, apartmentID, oldDebtorID, newDebtorID)
	}
	return nil
}

func (m *mockApartmentRepository) DeleteOpenDebtsByDebtor(ctx context.Context, apartmentID string, debtorID string) error {
	if m.deleteOpenDebtsByDebtorFn != nil {
		return m.deleteOpenDebtsByDebtorFn(ctx, apartmentID, debtorID)
	}
	return nil
}

// MockDueRepository
type mockDueRepository struct {
	getHistoryFn func(ctx context.Context, siteID string) ([]domain.DueRate, error)
	getCurrentFn func(ctx context.Context, siteID string, targetDate string) (*domain.DueRate, error)
	upsertFn     func(ctx context.Context, siteID string, amount float64, validFrom string, createdBy string) (*domain.DueRate, error)
}

func (m *mockDueRepository) GetHistory(ctx context.Context, siteID string) ([]domain.DueRate, error) {
	if m.getHistoryFn != nil {
		return m.getHistoryFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockDueRepository) GetCurrent(ctx context.Context, siteID string, targetDate string) (*domain.DueRate, error) {
	if m.getCurrentFn != nil {
		return m.getCurrentFn(ctx, siteID, targetDate)
	}
	return nil, nil
}

func (m *mockDueRepository) Upsert(ctx context.Context, siteID string, amount float64, validFrom string, createdBy string) (*domain.DueRate, error) {
	if m.upsertFn != nil {
		return m.upsertFn(ctx, siteID, amount, validFrom, createdBy)
	}
	return &domain.DueRate{Amount: amount, ValidFrom: validFrom}, nil
}

// MockDebtRepository
type mockDebtRepository struct {
	createFn                        func(ctx context.Context, debt *domain.Debt) (*domain.Debt, error)
	accrueMonthlyDueFn              func(ctx context.Context, siteID, apartmentID, debtorUserID string, amount float64, dueMonth string, description string, createdBy *string) (string, error)
	listFn                          func(ctx context.Context, filter domain.DebtFilter) ([]domain.DebtDetail, error)
	getByIDFn                       func(ctx context.Context, id, siteID string) (*domain.DebtDetail, error)
	getStatsFn                      func(ctx context.Context, siteID string) (*domain.DebtStats, error)
	listActiveApartmentsForAccrualFn func(ctx context.Context, siteID string) ([]db.ListActiveApartmentsForAccrualRow, error)
	transferOpenDebtsToOwnerFn      func(ctx context.Context, apartmentID, oldTenantID, ownerID string) error
	deleteOpenDebtsByDebtorFn       func(ctx context.Context, apartmentID, debtorID string) error
	deleteFn                        func(ctx context.Context, id, siteID string) error
	updateStatusFn                  func(ctx context.Context, id string, status domain.DebtStatus) error
}

func (m *mockDebtRepository) Create(ctx context.Context, debt *domain.Debt) (*domain.Debt, error) {
	if m.createFn != nil {
		return m.createFn(ctx, debt)
	}
	return debt, nil
}

func (m *mockDebtRepository) AccrueMonthlyDue(ctx context.Context, siteID, apartmentID, debtorUserID string, amount float64, dueMonth string, description string, createdBy *string) (string, error) {
	if m.accrueMonthlyDueFn != nil {
		return m.accrueMonthlyDueFn(ctx, siteID, apartmentID, debtorUserID, amount, dueMonth, description, createdBy)
	}
	return "debt-id", nil
}

func (m *mockDebtRepository) List(ctx context.Context, filter domain.DebtFilter) ([]domain.DebtDetail, error) {
	if m.listFn != nil {
		return m.listFn(ctx, filter)
	}
	return nil, nil
}

func (m *mockDebtRepository) GetByID(ctx context.Context, id, siteID string) (*domain.DebtDetail, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, id, siteID)
	}
	return nil, domain.ErrDebtNotFound
}

func (m *mockDebtRepository) GetStats(ctx context.Context, siteID string) (*domain.DebtStats, error) {
	if m.getStatsFn != nil {
		return m.getStatsFn(ctx, siteID)
	}
	return &domain.DebtStats{}, nil
}

func (m *mockDebtRepository) ListActiveApartmentsForAccrual(ctx context.Context, siteID string) ([]db.ListActiveApartmentsForAccrualRow, error) {
	if m.listActiveApartmentsForAccrualFn != nil {
		return m.listActiveApartmentsForAccrualFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockDebtRepository) TransferOpenDebtsToOwner(ctx context.Context, apartmentID, oldTenantID, ownerID string) error {
	if m.transferOpenDebtsToOwnerFn != nil {
		return m.transferOpenDebtsToOwnerFn(ctx, apartmentID, oldTenantID, ownerID)
	}
	return nil
}

func (m *mockDebtRepository) DeleteOpenDebtsByDebtor(ctx context.Context, apartmentID, debtorID string) error {
	if m.deleteOpenDebtsByDebtorFn != nil {
		return m.deleteOpenDebtsByDebtorFn(ctx, apartmentID, debtorID)
	}
	return nil
}

func (m *mockDebtRepository) Delete(ctx context.Context, id, siteID string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockDebtRepository) UpdateStatus(ctx context.Context, id string, status domain.DebtStatus) error {
	if m.updateStatusFn != nil {
		return m.updateStatusFn(ctx, id, status)
	}
	return nil
}

// MockPaymentRepository
type mockPaymentRepository struct {
	createFn              func(ctx context.Context, p *domain.Payment) (*domain.Payment, error)
	listBySiteFn          func(ctx context.Context, siteID string, filter domain.PaymentFilter) ([]domain.PaymentDetail, error)
	listByDebtFn          func(ctx context.Context, debtID, siteID string) ([]domain.PaymentDetail, error)
	getByIDFn             func(ctx context.Context, id, siteID string) (*domain.PaymentDetail, error)
	deleteFn              func(ctx context.Context, id, siteID string) error
	getTotalPaidForDebtFn func(ctx context.Context, debtID string) (float64, error)
	getStatsFn            func(ctx context.Context, siteID string) (*domain.PaymentStats, error)
}

func (m *mockPaymentRepository) Create(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
	if m.createFn != nil {
		return m.createFn(ctx, p)
	}
	return p, nil
}

func (m *mockPaymentRepository) ListBySite(ctx context.Context, siteID string, filter domain.PaymentFilter) ([]domain.PaymentDetail, error) {
	if m.listBySiteFn != nil {
		return m.listBySiteFn(ctx, siteID, filter)
	}
	return nil, nil
}

func (m *mockPaymentRepository) ListByDebt(ctx context.Context, debtID, siteID string) ([]domain.PaymentDetail, error) {
	if m.listByDebtFn != nil {
		return m.listByDebtFn(ctx, debtID, siteID)
	}
	return nil, nil
}

func (m *mockPaymentRepository) GetByID(ctx context.Context, id, siteID string) (*domain.PaymentDetail, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, id, siteID)
	}
	return nil, nil
}

func (m *mockPaymentRepository) Delete(ctx context.Context, id, siteID string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockPaymentRepository) GetTotalPaidForDebt(ctx context.Context, debtID string) (float64, error) {
	if m.getTotalPaidForDebtFn != nil {
		return m.getTotalPaidForDebtFn(ctx, debtID)
	}
	return 0, nil
}

func (m *mockPaymentRepository) GetStats(ctx context.Context, siteID string) (*domain.PaymentStats, error) {
	if m.getStatsFn != nil {
		return m.getStatsFn(ctx, siteID)
	}
	return &domain.PaymentStats{}, nil
}

// MockExpenseRepository
type mockExpenseRepository struct {
	createCategoryFn           func(ctx context.Context, siteID string, name string) (*domain.ExpenseCategory, error)
	listCategoriesFn           func(ctx context.Context, siteID string, activeOnly bool) ([]domain.ExpenseCategory, error)
	getCategoryByIDFn          func(ctx context.Context, id string, siteID string) (*domain.ExpenseCategory, error)
	updateCategoryFn           func(ctx context.Context, id string, siteID string, name string, isActive bool) (*domain.ExpenseCategory, error)
	countExpensesByCategoryFn  func(ctx context.Context, categoryID string, siteID string) (int64, error)
	deleteCategoryFn           func(ctx context.Context, id string, siteID string) error
	createExpenseFn            func(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error)
	listExpensesFn             func(ctx context.Context, siteID string, filter domain.ExpenseFilter) ([]domain.Expense, error)
	getExpenseByIDFn           func(ctx context.Context, id string, siteID string) (*domain.Expense, error)
	deleteExpenseFn            func(ctx context.Context, id string, siteID string) error
	getExpenseStatsFn          func(ctx context.Context, siteID string) (*domain.ExpenseStats, error)
	getCategoryBreakdownFn     func(ctx context.Context, siteID string) ([]domain.CategoryBreakdownItem, error)
	getTreasurySummaryFn      func(ctx context.Context, siteID string) (*domain.TreasurySummary, error)
	updateSiteInitialBalanceFn func(ctx context.Context, siteID string, initialBalance float64) (float64, error)
}

func (m *mockExpenseRepository) CreateCategory(ctx context.Context, siteID string, name string) (*domain.ExpenseCategory, error) {
	if m.createCategoryFn != nil {
		return m.createCategoryFn(ctx, siteID, name)
	}
	return &domain.ExpenseCategory{ID: "cat-1", SiteID: siteID, Name: name, IsActive: true}, nil
}

func (m *mockExpenseRepository) ListCategories(ctx context.Context, siteID string, activeOnly bool) ([]domain.ExpenseCategory, error) {
	if m.listCategoriesFn != nil {
		return m.listCategoriesFn(ctx, siteID, activeOnly)
	}
	return nil, nil
}

func (m *mockExpenseRepository) GetCategoryByID(ctx context.Context, id string, siteID string) (*domain.ExpenseCategory, error) {
	if m.getCategoryByIDFn != nil {
		return m.getCategoryByIDFn(ctx, id, siteID)
	}
	return nil, nil
}

func (m *mockExpenseRepository) UpdateCategory(ctx context.Context, id string, siteID string, name string, isActive bool) (*domain.ExpenseCategory, error) {
	if m.updateCategoryFn != nil {
		return m.updateCategoryFn(ctx, id, siteID, name, isActive)
	}
	return nil, nil
}

func (m *mockExpenseRepository) CountExpensesByCategory(ctx context.Context, categoryID string, siteID string) (int64, error) {
	if m.countExpensesByCategoryFn != nil {
		return m.countExpensesByCategoryFn(ctx, categoryID, siteID)
	}
	return 0, nil
}

func (m *mockExpenseRepository) DeleteCategory(ctx context.Context, id string, siteID string) error {
	if m.deleteCategoryFn != nil {
		return m.deleteCategoryFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockExpenseRepository) CreateExpense(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error) {
	if m.createExpenseFn != nil {
		return m.createExpenseFn(ctx, siteID, req, recordedBy)
	}
	return &domain.Expense{ID: "exp-1", SiteID: siteID, Amount: req.Amount}, nil
}

func (m *mockExpenseRepository) ListExpenses(ctx context.Context, siteID string, filter domain.ExpenseFilter) ([]domain.Expense, error) {
	if m.listExpensesFn != nil {
		return m.listExpensesFn(ctx, siteID, filter)
	}
	return nil, nil
}

func (m *mockExpenseRepository) GetExpenseByID(ctx context.Context, id string, siteID string) (*domain.Expense, error) {
	if m.getExpenseByIDFn != nil {
		return m.getExpenseByIDFn(ctx, id, siteID)
	}
	return nil, repository.ErrExpenseNotFound
}

func (m *mockExpenseRepository) DeleteExpense(ctx context.Context, id string, siteID string) error {
	if m.deleteExpenseFn != nil {
		return m.deleteExpenseFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockExpenseRepository) GetExpenseStats(ctx context.Context, siteID string) (*domain.ExpenseStats, error) {
	if m.getExpenseStatsFn != nil {
		return m.getExpenseStatsFn(ctx, siteID)
	}
	return &domain.ExpenseStats{}, nil
}

func (m *mockExpenseRepository) GetCategoryBreakdown(ctx context.Context, siteID string) ([]domain.CategoryBreakdownItem, error) {
	if m.getCategoryBreakdownFn != nil {
		return m.getCategoryBreakdownFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockExpenseRepository) GetTreasurySummary(ctx context.Context, siteID string) (*domain.TreasurySummary, error) {
	if m.getTreasurySummaryFn != nil {
		return m.getTreasurySummaryFn(ctx, siteID)
	}
	return &domain.TreasurySummary{}, nil
}

func (m *mockExpenseRepository) UpdateSiteInitialBalance(ctx context.Context, siteID string, initialBalance float64) (float64, error) {
	if m.updateSiteInitialBalanceFn != nil {
		return m.updateSiteInitialBalanceFn(ctx, siteID, initialBalance)
	}
	return initialBalance, nil
}

// MockMeterRepository
type mockMeterRepository struct {
	createMeterTypeFn                   func(ctx context.Context, siteID, name, unit string, isActive bool) (*domain.MeterType, error)
	listMeterTypesFn                    func(ctx context.Context, siteID string, activeOnly bool) ([]domain.MeterType, error)
	getMeterTypeByIDFn                  func(ctx context.Context, id, siteID string) (*domain.MeterType, error)
	updateMeterTypeFn                   func(ctx context.Context, id, siteID, name, unit string, isActive bool) (*domain.MeterType, error)
	deleteMeterTypeFn                   func(ctx context.Context, id, siteID string) error
	countPeriodsByMeterTypeFn           func(ctx context.Context, meterTypeID, siteID string) (int64, error)
	getPreviousReadingsFn               func(ctx context.Context, siteID, meterTypeID string) (float64, []domain.ApartmentLastReading, error)
	createConsumptionPeriodWithReadings func(ctx context.Context, period *domain.ConsumptionPeriod, readings []domain.MeterReading) (*domain.ConsumptionPeriod, []domain.MeterReading, error)
	listConsumptionPeriodsFn            func(ctx context.Context, siteID string) ([]domain.ConsumptionPeriod, error)
	getConsumptionPeriodFn              func(ctx context.Context, id, siteID string) (*domain.ConsumptionPeriod, []domain.MeterReading, error)
	deleteConsumptionPeriodFn           func(ctx context.Context, id, siteID string) ([]string, error)
	getResidentMeterHistoryFn           func(ctx context.Context, apartmentID string) ([]domain.ResidentMeterHistoryItem, error)
}

func (m *mockMeterRepository) CreateMeterType(ctx context.Context, siteID, name, unit string, isActive bool) (*domain.MeterType, error) {
	if m.createMeterTypeFn != nil {
		return m.createMeterTypeFn(ctx, siteID, name, unit, isActive)
	}
	return &domain.MeterType{ID: "mt-1", SiteID: siteID, Name: name, Unit: unit, IsActive: isActive}, nil
}

func (m *mockMeterRepository) ListMeterTypes(ctx context.Context, siteID string, activeOnly bool) ([]domain.MeterType, error) {
	if m.listMeterTypesFn != nil {
		return m.listMeterTypesFn(ctx, siteID, activeOnly)
	}
	return nil, nil
}

func (m *mockMeterRepository) GetMeterTypeByID(ctx context.Context, id, siteID string) (*domain.MeterType, error) {
	if m.getMeterTypeByIDFn != nil {
		return m.getMeterTypeByIDFn(ctx, id, siteID)
	}
	return nil, nil
}

func (m *mockMeterRepository) UpdateMeterType(ctx context.Context, id, siteID, name, unit string, isActive bool) (*domain.MeterType, error) {
	if m.updateMeterTypeFn != nil {
		return m.updateMeterTypeFn(ctx, id, siteID, name, unit, isActive)
	}
	return nil, nil
}

func (m *mockMeterRepository) DeleteMeterType(ctx context.Context, id, siteID string) error {
	if m.deleteMeterTypeFn != nil {
		return m.deleteMeterTypeFn(ctx, id, siteID)
	}
	return nil
}

func (m *mockMeterRepository) CountPeriodsByMeterType(ctx context.Context, meterTypeID, siteID string) (int64, error) {
	if m.countPeriodsByMeterTypeFn != nil {
		return m.countPeriodsByMeterTypeFn(ctx, meterTypeID, siteID)
	}
	return 0, nil
}

func (m *mockMeterRepository) GetPreviousReadings(ctx context.Context, siteID, meterTypeID string) (float64, []domain.ApartmentLastReading, error) {
	if m.getPreviousReadingsFn != nil {
		return m.getPreviousReadingsFn(ctx, siteID, meterTypeID)
	}
	return 0, nil, nil
}

func (m *mockMeterRepository) CreateConsumptionPeriodWithReadings(ctx context.Context, period *domain.ConsumptionPeriod, readings []domain.MeterReading) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
	if m.createConsumptionPeriodWithReadings != nil {
		return m.createConsumptionPeriodWithReadings(ctx, period, readings)
	}
	return period, readings, nil
}

func (m *mockMeterRepository) ListConsumptionPeriods(ctx context.Context, siteID string) ([]domain.ConsumptionPeriod, error) {
	if m.listConsumptionPeriodsFn != nil {
		return m.listConsumptionPeriodsFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockMeterRepository) GetConsumptionPeriod(ctx context.Context, id, siteID string) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
	if m.getConsumptionPeriodFn != nil {
		return m.getConsumptionPeriodFn(ctx, id, siteID)
	}
	return nil, nil, nil
}

func (m *mockMeterRepository) DeleteConsumptionPeriod(ctx context.Context, id, siteID string) ([]string, error) {
	if m.deleteConsumptionPeriodFn != nil {
		return m.deleteConsumptionPeriodFn(ctx, id, siteID)
	}
	return nil, nil
}

func (m *mockMeterRepository) GetResidentMeterHistory(ctx context.Context, apartmentID string) ([]domain.ResidentMeterHistoryItem, error) {
	if m.getResidentMeterHistoryFn != nil {
		return m.getResidentMeterHistoryFn(ctx, apartmentID)
	}
	return nil, nil
}

// MockAnnouncementRepository
type mockAnnouncementRepository struct {
	createFn     func(ctx context.Context, siteID string, title string, content string, priority domain.AnnouncementPriority, publishedAt time.Time, createdBy string) (*domain.Announcement, error)
	listBySiteFn func(ctx context.Context, siteID string) ([]domain.Announcement, error)
	getByIDFn    func(ctx context.Context, id string, siteID string) (*domain.Announcement, error)
	updateFn     func(ctx context.Context, id string, siteID string, title string, content string, priority domain.AnnouncementPriority) (*domain.Announcement, error)
	deleteFn     func(ctx context.Context, id string, siteID string) error
}

func (m *mockAnnouncementRepository) Create(ctx context.Context, siteID string, title string, content string, priority domain.AnnouncementPriority, publishedAt time.Time, createdBy string) (*domain.Announcement, error) {
	if m.createFn != nil {
		return m.createFn(ctx, siteID, title, content, priority, publishedAt, createdBy)
	}
	return &domain.Announcement{ID: "ann-1", SiteID: siteID, Title: title, Content: content, Priority: priority}, nil
}

func (m *mockAnnouncementRepository) ListBySite(ctx context.Context, siteID string) ([]domain.Announcement, error) {
	if m.listBySiteFn != nil {
		return m.listBySiteFn(ctx, siteID)
	}
	return nil, nil
}

func (m *mockAnnouncementRepository) GetByID(ctx context.Context, id string, siteID string) (*domain.Announcement, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, id, siteID)
	}
	return nil, nil
}

func (m *mockAnnouncementRepository) Update(ctx context.Context, id string, siteID string, title string, content string, priority domain.AnnouncementPriority) (*domain.Announcement, error) {
	if m.updateFn != nil {
		return m.updateFn(ctx, id, siteID, title, content, priority)
	}
	return nil, nil
}

func (m *mockAnnouncementRepository) Delete(ctx context.Context, id string, siteID string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, id, siteID)
	}
	return nil
}
