import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { ownerApi } from '../../api/owner';
import { dueApi } from '../../api/due';
import { paymentApi } from '../../api/payment';
import { expenseApi } from '../../api/expense';
import { meterApi } from '../../api/meter';
import { announcementApi } from '../../api/announcement';
import { useAuthStore } from '../../store/auth';
import { authApi } from '../../api/auth';
import { toast } from '../../store/toast';
import { MonthlyReportModal } from '../../components/reports/MonthlyReportModal';
import { MeterTypesModal } from '../../components/meters/MeterTypesModal';
import { MeterDistributionModal } from '../../components/meters/MeterDistributionModal';
import { MeterDistributionDetailModal } from '../../components/meters/MeterDistributionDetailModal';
import { AnnouncementModal } from '../../components/announcements/AnnouncementModal';
import type { Apartment, CreateApartmentRequest, ResidentInput, RemoveTenantRequest } from '../../types/apartment';
import type { SetDueRatePayload, CreateManualDebtPayload, CreateBulkDebtPayload, DebtType, DebtDetail } from '../../types/due';
import type { RecordPaymentRequest, PaymentMethod } from '../../types/payment';
import type { ExpenseCategory, CreateExpensePayload } from '../../types/expense';
import type { Announcement } from '../../types/announcement';
import {
  Building,
  Plus,
  Home,
  Layers,
  LogOut,
  ArrowLeft,
  UserCheck,
  UserX,
  History,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  Shield,
  Search,
  Receipt,
  BadgeDollarSign,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  Banknote,
  Calendar,
  Users,
  Wallet,
  TrendingDown,
  TrendingUp,
  Tag,
  FileText,
  Pencil,
  Landmark,
  Printer,
  Gauge,
  Megaphone,
  Info,
  AlertCircle,
} from 'lucide-react';

export function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const siteIdQuery = searchParams.get('siteId') || undefined;
  const isOwnerViewing = user?.role === 'owner';

  const [activeTab, setActiveTab] = useState<'apartments' | 'blocks' | 'dues' | 'debts' | 'payments' | 'expenses' | 'treasury' | 'meters' | 'announcements'>('apartments');
  const [search, setSearch] = useState('');

  // Modals state
  const [isAptModalOpen, setIsAptModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');

  // Meter Modals State
  const [isMeterTypesModalOpen, setIsMeterTypesModalOpen] = useState(false);
  const [isMeterDistModalOpen, setIsMeterDistModalOpen] = useState(false);
  const [selectedPeriodForDetail, setSelectedPeriodForDetail] = useState<string | null>(null);

  // Announcement Modals State
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedAnnouncementForEdit, setSelectedAnnouncementForEdit] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [announcementSearch, setAnnouncementSearch] = useState('');

  // Resident Modals
  const [activeAptForAction, setActiveAptForAction] = useState<Apartment | null>(null);
  const [residentModalMode, setResidentModalMode] = useState<'owner' | 'tenant' | null>(null);
  const [residentForm, setResidentForm] = useState<ResidentInput>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });

  // Remove Tenant Modal
  const [isRemoveTenantModalOpen, setIsRemoveTenantModalOpen] = useState(false);
  const [removeTenantForm, setRemoveTenantForm] = useState<RemoveTenantRequest>({
    debt_action: 'keep',
    notes: '',
  });

  // History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Monthly Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<'income' | 'expense'>('income');

  // Site Details (when owner views a specific site)
  const { data: siteDetails } = useQuery({
    queryKey: ['owner', 'site', siteIdQuery],
    queryFn: () => ownerApi.getSiteDetails(siteIdQuery!),
    enabled: isOwnerViewing && !!siteIdQuery,
  });
  const currentSiteName = siteDetails?.name || 'Site Yönetimi';

  // New Apartment Form
  const [newApt, setNewApt] = useState<CreateApartmentRequest>({
    door_number: '',
    floor: undefined,
    block_id: undefined,
    owner: undefined,
    tenant: undefined,
  });
  const [hasOwnerOnCreate, setHasOwnerOnCreate] = useState(false);
  const [hasTenantOnCreate, setHasTenantOnCreate] = useState(false);
  const [aptError, setAptError] = useState<string | null>(null);

  // Queries
  const { data: apartments = [], isLoading: isLoadingApts } = useQuery({
    queryKey: ['admin', 'apartments', siteIdQuery],
    queryFn: () => adminApi.listApartments(siteIdQuery),
  });

  const { data: blocks = [], isLoading: isLoadingBlocks } = useQuery({
    queryKey: ['admin', 'blocks', siteIdQuery],
    queryFn: () => adminApi.listBlocks(siteIdQuery),
  });

  const { data: tenantHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['admin', 'tenant-history', activeAptForAction?.id],
    queryFn: () => adminApi.listTenantHistory(activeAptForAction!.id),
    enabled: !!activeAptForAction && isHistoryModalOpen,
  });

  // Mutations
  const createAptMutation = useMutation({
    mutationFn: (payload: CreateApartmentRequest) => adminApi.createApartment(payload, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'apartments', siteIdQuery] });
      setIsAptModalOpen(false);
      setNewApt({ door_number: '', floor: undefined, block_id: undefined });
      setHasOwnerOnCreate(false);
      setHasTenantOnCreate(false);
      setAptError(null);
      toast.success('Daire başarıyla eklendi.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setAptError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setAptError('Daire eklenirken hata oluştu');
      }
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.softDeleteApartment(id, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'apartments', siteIdQuery] });
      toast.success('Daire pasife alındı.');
    },
    onError: () => {
      toast.error('Daire pasife alınırken hata oluştu.');
    },
  });

  const createBlockMutation = useMutation({
    mutationFn: (name: string) => adminApi.createBlock(name, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocks', siteIdQuery] });
      setNewBlockName('');
      setIsBlockModalOpen(false);
      toast.success('Blok başarıyla oluşturuldu.');
    },
    onError: () => {
      toast.error('Blok oluşturulurken hata oluştu.');
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBlock(id, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocks', siteIdQuery] });
      toast.success('Blok silindi.');
    },
    onError: () => {
      toast.error('Blok silinirken hata oluştu.');
    },
  });

  const setResidentMutation = useMutation({
    mutationFn: ({ aptId, res, mode }: { aptId: string; res: ResidentInput; mode: 'owner' | 'tenant' }) =>
      mode === 'owner'
        ? adminApi.setOwner(aptId, res, siteIdQuery)
        : adminApi.setTenant(aptId, res, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'apartments', siteIdQuery] });
      setResidentModalMode(null);
      setActiveAptForAction(null);
      setResidentForm({ full_name: '', email: '', phone: '', password: '' });
      toast.success('Sakin bilgileri başarıyla kaydedildi.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Sakin atanırken hata oluştu';
      toast.error(msg);
    },
  });

  const removeTenantMutation = useMutation({
    mutationFn: ({ aptId, payload }: { aptId: string; payload: RemoveTenantRequest }) =>
      adminApi.removeTenant(aptId, payload, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'apartments', siteIdQuery] });
      setIsRemoveTenantModalOpen(false);
      setActiveAptForAction(null);
      setRemoveTenantForm({ debt_action: 'keep', notes: '' });
      toast.success('Kiracı başarıyla çıkarıldı.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Kiracı çıkarılırken hata oluştu';
      toast.error(msg);
    },
  });

  // Due & Debt State
  const [isSetDueModalOpen, setIsSetDueModalOpen] = useState(false);
  const [dueForm, setDueForm] = useState<SetDueRatePayload>({
    amount: 1000,
    effective_type: 'this_month',
    valid_from: '',
  });
  const [dueError, setDueError] = useState<string | null>(null);
  const [accrueSuccess, setAccrueSuccess] = useState<string | null>(null);

  // Debts Filter & Modal State
  const [debtStatusFilter, setDebtStatusFilter] = useState<string>('all');
  const [debtTypeFilter, setDebtTypeFilter] = useState<string>('all');
  const [debtAptFilter, setDebtAptFilter] = useState<string>('all');
  const [isManualDebtModalOpen, setIsManualDebtModalOpen] = useState(false);
  const [debtTargetMode, setDebtTargetMode] = useState<'single' | 'all'>('single');
  const [bulkDebtorTarget, setBulkDebtorTarget] = useState<'owner' | 'auto'>('owner');
  const [manualDebtForm, setManualDebtForm] = useState<CreateManualDebtPayload>({
    apartment_id: '',
    type: 'fixture',
    amount: 0,
    description: '',
  });
  const [manualDebtError, setManualDebtError] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtDetail | null>(null);
  const [paymentForm, setPaymentForm] = useState<{
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    notes: string;
  }>({
    amount: 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Debt Payment History Modal State
  const [isDebtPaymentHistoryModalOpen, setIsDebtPaymentHistoryModalOpen] = useState(false);
  const [selectedDebtForHistory, setSelectedDebtForHistory] = useState<DebtDetail | null>(null);

  // Payments Tab Filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [paymentAptFilter, setPaymentAptFilter] = useState<string>('all');
  const [paymentStartDate, setPaymentStartDate] = useState<string>('');
  const [paymentEndDate, setPaymentEndDate] = useState<string>('');

  // Expenses Tab State & Filters
  const [expenseCatFilter, setExpenseCatFilter] = useState<string>('all');
  const [expenseStartDate, setExpenseStartDate] = useState<string>('');
  const [expenseEndDate, setExpenseEndDate] = useState<string>('');

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<CreateExpensePayload>({
    category_id: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_note: '',
  });
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Initial Balance Modal State
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);
  const [initialBalanceForm, setInitialBalanceForm] = useState<number>(0);
  const [initialBalanceError, setInitialBalanceError] = useState<string | null>(null);

  // Due & Debt Queries
  const { data: dueSummary, isLoading: isLoadingDues } = useQuery({
    queryKey: ['admin', 'dues', siteIdQuery],
    queryFn: () => dueApi.getDueRates(siteIdQuery),
  });

  const { data: debtData, isLoading: isLoadingDebts } = useQuery({
    queryKey: ['admin', 'debts', siteIdQuery, debtStatusFilter, debtTypeFilter, debtAptFilter],
    queryFn: () =>
      dueApi.getDebts({
        siteId: siteIdQuery,
        status: debtStatusFilter !== 'all' ? debtStatusFilter : undefined,
        type: debtTypeFilter !== 'all' ? debtTypeFilter : undefined,
        apartment_id: debtAptFilter !== 'all' ? debtAptFilter : undefined,
      }),
  });

  // Payments Queries
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['admin', 'payments', siteIdQuery, paymentMethodFilter, paymentAptFilter, paymentStartDate, paymentEndDate],
    queryFn: () =>
      paymentApi.getPayments({
        siteId: siteIdQuery,
        payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
        apartment_id: paymentAptFilter !== 'all' ? paymentAptFilter : undefined,
        start_date: paymentStartDate || undefined,
        end_date: paymentEndDate || undefined,
      }),
  });

  const { data: paymentStats } = useQuery({
    queryKey: ['admin', 'payment-stats', siteIdQuery],
    queryFn: () => paymentApi.getPaymentStats(siteIdQuery),
  });

  const { data: debtPayments = [], isLoading: isLoadingDebtPayments } = useQuery({
    queryKey: ['admin', 'debt-payments', selectedDebtForHistory?.id],
    queryFn: () => paymentApi.getPaymentsByDebt(selectedDebtForHistory!.id, siteIdQuery),
    enabled: !!selectedDebtForHistory && isDebtPaymentHistoryModalOpen,
  });

  // Expense & Treasury Queries
  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['admin', 'expense-categories', siteIdQuery],
    queryFn: () => expenseApi.listCategories(true, siteIdQuery),
  });

  const { data: allExpenseCategories = [] } = useQuery({
    queryKey: ['admin', 'all-expense-categories', siteIdQuery],
    queryFn: () => expenseApi.listCategories(false, siteIdQuery),
    enabled: isCategoryModalOpen,
  });

  const { data: expenseData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['admin', 'expenses', siteIdQuery, expenseCatFilter, expenseStartDate, expenseEndDate],
    queryFn: () =>
      expenseApi.listExpenses(
        {
          category_id: expenseCatFilter !== 'all' ? expenseCatFilter : undefined,
          start_date: expenseStartDate || undefined,
          end_date: expenseEndDate || undefined,
        },
        siteIdQuery
      ),
  });

  const { data: treasuryData, isLoading: isLoadingTreasury } = useQuery({
    queryKey: ['admin', 'treasury', siteIdQuery],
    queryFn: () => expenseApi.getAdminTreasury(siteIdQuery),
  });

  // Due & Debt Mutations
  const setDueMutation = useMutation({
    mutationFn: (payload: SetDueRatePayload) => dueApi.setDueRate(payload, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dues', siteIdQuery] });
      setIsSetDueModalOpen(false);
      setDueError(null);
      toast.success('Aidat tutarı başarıyla güncellendi.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setDueError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setDueError('Aidat güncellenirken hata oluştu');
      }
    },
  });

  const accrueMutation = useMutation({
    mutationFn: () => dueApi.accrueMonthlyDues(undefined, siteIdQuery),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts'] });
      setAccrueSuccess(
        `${data.target_month} dönemi için ${data.created_count} daireye toplam ₺${(
          data.created_count * data.amount
        ).toLocaleString('tr-TR')} aidat borcu tahakkuk ettirildi. (${data.skipped_count} daire atlandı/zaten yansıtılmıştı)`
      );
      toast.success(`${data.target_month} dönemi aidatları tahakkuk ettirildi.`);
      setTimeout(() => setAccrueSuccess(null), 8000);
    },
    onError: () => {
      toast.error('Tahakkuk oluşturulurken hata oluştu. Lütfen sitede tanımlı geçerli bir aidat tutarı olduğundan emin olun.');
    },
  });

  const createDebtMutation = useMutation({
    mutationFn: (payload: CreateManualDebtPayload) => dueApi.createManualDebt(payload, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts'] });
      setIsManualDebtModalOpen(false);
      setManualDebtForm({ apartment_id: '', type: 'fixture', amount: 0, description: '' });
      setManualDebtError(null);
      toast.success('Borç kaydı başarıyla oluşturuldu.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setManualDebtError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setManualDebtError('Borç kaydı oluşturulurken hata oluştu');
      }
    },
  });

  const createBulkDebtMutation = useMutation({
    mutationFn: (payload: CreateBulkDebtPayload) => dueApi.createBulkDebt(payload, siteIdQuery),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts'] });
      setIsManualDebtModalOpen(false);
      setManualDebtForm({ apartment_id: '', type: 'fixture', amount: 0, description: '' });
      setDebtTargetMode('single');
      setManualDebtError(null);
      setAccrueSuccess(
        `Toplu Borçlandırma Başarılı: ${data.created_count} daireye toplam ₺${data.total_amount.toLocaleString(
          'tr-TR'
        )} borç tahakkuk ettirildi.${data.skipped_count > 0 ? ` (${data.skipped_count} daire ev sahibi bulunamadığı için atlandı)` : ''}`
      );
      toast.success(`${data.created_count} daireye toplu borç tahakkuk ettirildi.`);
      setTimeout(() => setAccrueSuccess(null), 8000);
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setManualDebtError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setManualDebtError('Toplu borç kaydı oluşturulurken hata oluştu');
      }
    },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: (id: string) => dueApi.deleteDebt(id, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts'] });
      toast.success('Borç başarıyla silindi.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Borç silinirken hata oluştu';
      toast.error(msg);
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (payload: RecordPaymentRequest) => paymentApi.recordPayment(payload, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts'] });
      setIsPaymentModalOpen(false);
      setSelectedDebtForPayment(null);
      setPaymentError(null);
      toast.success('Ödeme başarıyla kaydedildi.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setPaymentError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setPaymentError('Ödeme kaydedilirken hata oluştu');
      }
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => paymentApi.deletePayment(id, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts'] });
      if (selectedDebtForHistory) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'debt-payments', selectedDebtForHistory.id] });
      }
      toast.success('Ödeme kaydı silindi.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ödeme silinirken hata oluştu';
      toast.error(msg);
    },
  });

  // Expense & Category Mutations
  const createExpenseMutation = useMutation({
    mutationFn: (payload: CreateExpensePayload) => expenseApi.createExpense(payload, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'treasury'] });
      setIsExpenseModalOpen(false);
      setExpenseForm({
        category_id: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_note: '',
      });
      setExpenseError(null);
      toast.success('Masraf kaydı başarıyla eklendi.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setExpenseError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setExpenseError('Masraf kaydı eklenirken hata oluştu');
      }
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => expenseApi.deleteExpense(id, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'treasury'] });
      toast.success('Masraf kaydı silindi.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Masraf silinirken hata oluştu';
      toast.error(msg);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => expenseApi.createCategory({ name }, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-expense-categories'] });
      setNewCategoryName('');
      setCategoryError(null);
      toast.success('Kategori başarıyla oluşturuldu.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setCategoryError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setCategoryError('Kategori eklenirken hata oluştu');
      }
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name, is_active }: { id: string; name: string; is_active?: boolean }) =>
      expenseApi.updateCategory(id, { name, is_active }, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-expense-categories'] });
      setEditingCategory(null);
      setCategoryError(null);
      toast.success('Kategori güncellendi.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setCategoryError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setCategoryError('Kategori güncellenirken hata oluştu');
      }
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => expenseApi.deleteCategory(id, siteIdQuery),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-expense-categories'] });
      toast.success(data?.message || 'Kategori başarıyla silindi.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Kategori silinirken hata oluştu';
      toast.error(msg);
    },
  });

  const updateInitialBalanceMutation = useMutation({
    mutationFn: (initialBalance: number) =>
      expenseApi.updateInitialBalance({ initial_balance: initialBalance }, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'treasury'] });
      setIsInitialBalanceModalOpen(false);
      setInitialBalanceError(null);
      toast.success('Devir bakiyesi güncellendi.');
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setInitialBalanceError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setInitialBalanceError('Devir bakiyesi güncellenirken hata oluştu');
      }
    },
  });

  // Meters & Consumption Periods
  const { data: consumptionPeriods = [], isLoading: isLoadingPeriods } = useQuery({
    queryKey: ['admin', 'consumption-periods', siteIdQuery],
    queryFn: () => meterApi.listConsumptionPeriods(siteIdQuery),
    enabled: activeTab === 'meters',
  });

  const deletePeriodMutation = useMutation({
    mutationFn: (id: string) => meterApi.deleteConsumptionPeriod(id, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'consumption-periods', siteIdQuery] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts', siteIdQuery] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'meter-previous-readings', siteIdQuery] });
      toast.success('Faturalandırma dönemi silindi.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Faturalandırma oturumu silinemedi');
    },
  });

  const meterTotalBilled = useMemo(() => {
    return consumptionPeriods.reduce((sum, p) => sum + p.total_bill_amount, 0);
  }, [consumptionPeriods]);

  const meterThisMonthBilled = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    return consumptionPeriods
      .filter((p) => p.period.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + p.total_bill_amount, 0);
  }, [consumptionPeriods]);

  // Announcements Query & Mutation
  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['admin', 'announcements', siteIdQuery],
    queryFn: () => announcementApi.listAnnouncements(siteIdQuery),
    enabled: activeTab === 'announcements',
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id: string) => announcementApi.deleteAnnouncement(id, siteIdQuery),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements', siteIdQuery] });
      setAnnouncementToDelete(null);
      toast.success('Duyuru başarıyla silindi.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Duyuru silinirken bir hata oluştu');
    },
  });

  const filteredAnnouncements = useMemo(() => {
    if (!announcementSearch.trim()) return announcements;
    const q = announcementSearch.toLowerCase();
    return announcements.filter(
      (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
    );
  }, [announcements, announcementSearch]);

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    navigate('/login');
  };

  const filteredApartments = apartments.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.door_number.toLowerCase().includes(q) ||
      (a.block_name && a.block_name.toLowerCase().includes(q)) ||
      (a.owner_full_name && a.owner_full_name.toLowerCase().includes(q)) ||
      (a.tenant_full_name && a.tenant_full_name.toLowerCase().includes(q))
    );
  });

  const occupiedTenants = apartments.filter((a) => a.tenant_user_id).length;
  const occupiedOwners = apartments.filter((a) => a.owner_user_id && !a.tenant_user_id).length;
  const emptyCount = apartments.filter((a) => !a.tenant_user_id && !a.owner_user_id).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOwnerViewing && (
              <button
                onClick={() => navigate('/owner/sites')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors mr-1 cursor-pointer"
                title="Owner Paneline Dön"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 leading-tight">
                  {isOwnerViewing && siteDetails ? `${siteDetails.name} — Yönetim Paneli` : 'Site Yönetim Paneli'}
                </h1>
                {isOwnerViewing ? (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Owner Görünümü
                  </span>
                ) : (
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Yönetici
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Daireler, Sakinler ve Blok Yapılandırması</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>{user?.full_name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium py-1.5 px-3 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block mb-1">Toplam Daire</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{apartments.length}</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">Kayıtlı aktif daireler</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block mb-1">Kiracılı Daireler</span>
            <span className="text-2xl font-bold text-indigo-600">{occupiedTenants}</span>
            <span className="text-[11px] text-slate-400 block mt-1">Aktif kiracılı daire</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block mb-1">Ev Sahibi Oturan</span>
            <span className="text-2xl font-bold text-emerald-600">{occupiedOwners}</span>
            <span className="text-[11px] text-slate-400 block mt-1">Malik ikametli daire</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block mb-1">Boş Daireler</span>
            <span className="text-2xl font-bold text-slate-600">{emptyCount}</span>
            <span className="text-[11px] text-slate-400 block mt-1">Sakin atanmamış daire</span>
          </div>
        </div>

        {/* Tab & Action Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('apartments')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'apartments'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Daireler ({apartments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('blocks')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'blocks'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Bloklar ({blocks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('dues')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'dues'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Aidat Ayarları</span>
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'debts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BadgeDollarSign className="w-4 h-4" />
              <span>Borçlar ({debtData?.stats?.total_count || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'payments'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Tahsilatlar ({paymentStats?.total_count || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'expenses'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Masraflar ({expenseData?.stats?.total_count || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('treasury')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'treasury'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Şeffaf Kasa</span>
            </button>
            <button
              onClick={() => setActiveTab('meters')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'meters'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>Sayaç & Tüketim ({consumptionPeriods.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'announcements'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Megaphone className="w-4 h-4 text-indigo-600" />
              <span>Duyurular ({announcements.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'announcements' && (
              <button
                onClick={() => {
                  setSelectedAnnouncementForEdit(null);
                  setIsAnnouncementModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Duyuru Yayınla</span>
              </button>
            )}
            {activeTab === 'meters' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMeterTypesModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sayaç Türleri</span>
                </button>
                <button
                  onClick={() => setIsMeterDistModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Sayaç Okuma & Fatura Dağıt</span>
                </button>
              </div>
            )}
            {activeTab === 'treasury' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setReportModalType('income');
                    setIsReportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                  title="Aylık Gelir (Tahsilat) Raporunu Yazdır"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aylık Gelir Raporu</span>
                </button>
                <button
                  onClick={() => {
                    setReportModalType('expense');
                    setIsReportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                  title="Aylık Gider (Masraf) Raporunu Yazdır"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-600" />
                  <span>Aylık Gider Raporu</span>
                </button>
                <button
                  onClick={() => {
                    setInitialBalanceForm(treasuryData?.initial_balance ?? 0);
                    setInitialBalanceError(null);
                    setIsInitialBalanceModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Devir Bakiyesi Belirle</span>
                </button>
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setReportModalType('expense');
                    setIsReportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                  title="Aylık Gider (Masraf) Raporunu Yazdır"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-600" />
                  <span>Aylık Gider Raporu</span>
                </button>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kategorileri Yönet</span>
                </button>
                <button
                  onClick={() => {
                    setIsExpenseModalOpen(true);
                    setExpenseError(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Masraf Ekle</span>
                </button>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setReportModalType('income');
                    setIsReportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                  title="Aylık Gelir (Tahsilat) Raporunu Yazdır"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aylık Gelir Raporu</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('debts');
                    setDebtStatusFilter('open');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Açık Borçlardan Ödeme Al</span>
                </button>
              </div>
            )}

            {activeTab === 'dues' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (window.confirm('Bu ay için tüm aktif dairelere aidat borcu yansıtılsın mı?')) {
                      accrueMutation.mutate();
                    }
                  }}
                  disabled={accrueMutation.isPending}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${accrueMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Bu Ayı Tahakkuk Ettir</span>
                </button>
                <button
                  onClick={() => setIsSetDueModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aidat Tutarı Güncelle</span>
                </button>
              </div>
            )}

            {activeTab === 'debts' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsManualDebtModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Borç Ekle (Demirbaş / Diğer)</span>
                </button>
              </div>
            )}

            {activeTab === 'apartments' && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Kapı no, kişi veya blok ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                </div>
                <button
                  onClick={() => setIsAptModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Daire Ekle</span>
                </button>
              </>
            )}

            {activeTab === 'blocks' && (
              <button
                onClick={() => setIsBlockModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Blok Tanımla</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Daireler Tablosu */}
        {activeTab === 'apartments' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoadingApts ? (
              <div className="p-12 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <span className="text-xs">Daireler yükleniyor...</span>
              </div>
            ) : filteredApartments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Home className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  {search ? 'Aramaya uygun daire bulunamadı' : 'Kayıtlı daire bulunmuyor'}
                </h3>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                  {search
                    ? 'Arama kriterlerinizi değiştirerek tekrar deneyebilirsiniz.'
                    : 'Yeni daireler tanımlayarak kat maliki ve kiracı atamalarını yapın.'}
                </p>
                {!search && (
                  <button
                    onClick={() => setIsAptModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>İlk Daireyi Ekle</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Daire / Blok</th>
                      <th className="px-5 py-3.5">Ev Sahibi (Malik)</th>
                      <th className="px-5 py-3.5">Kiracı</th>
                      <th className="px-5 py-3.5">Durum</th>
                      <th className="px-5 py-3.5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredApartments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Daire & Blok */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              {apt.door_number}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block text-sm">
                                {apt.block_name ? `${apt.block_name} - No: ${apt.door_number}` : `No: ${apt.door_number}`}
                              </span>
                              {apt.floor !== null && apt.floor !== undefined && (
                                <span className="text-[11px] text-slate-400">Kat: {apt.floor}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Ev Sahibi */}
                        <td className="px-5 py-4">
                          {apt.owner_full_name ? (
                            <div>
                              <span className="font-semibold text-slate-900 block">{apt.owner_full_name}</span>
                              <span className="text-[11px] text-slate-400 block">{apt.owner_email}</span>
                              {apt.owner_phone && (
                                <span className="text-[11px] text-slate-400 block">{apt.owner_phone}</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveAptForAction(apt);
                                setResidentModalMode('owner');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Malik Ata</span>
                            </button>
                          )}
                        </td>

                        {/* Kiracı */}
                        <td className="px-5 py-4">
                          {apt.tenant_full_name ? (
                            <div>
                              <span className="font-semibold text-indigo-900 block">{apt.tenant_full_name}</span>
                              <span className="text-[11px] text-slate-400 block">{apt.tenant_email}</span>
                              {apt.tenant_phone && (
                                <span className="text-[11px] text-slate-400 block">{apt.tenant_phone}</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveAptForAction(apt);
                                setResidentModalMode('tenant');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-800 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Kiracı Ata</span>
                            </button>
                          )}
                        </td>

                        {/* Durum */}
                        <td className="px-5 py-4">
                          {apt.tenant_user_id ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Kiracılı
                            </span>
                          ) : apt.owner_user_id ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Malik İkametinde
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Boş
                            </span>
                          )}
                        </td>

                        {/* İşlemler */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {apt.tenant_user_id && (
                              <button
                                onClick={() => {
                                  setActiveAptForAction(apt);
                                  setIsRemoveTenantModalOpen(true);
                                }}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Kiracıyı Çıkar / Borç Devri"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setActiveAptForAction(apt);
                                setIsHistoryModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Kiracı Geçmişi"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`${apt.door_number} nolu daireyi pasife almak istediğinize emin misiniz? Tüm geçmiş kayıtlar korunacaktır.`)) {
                                  softDeleteMutation.mutate(apt.id);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Daireyi Pasife Al (Sil)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Blok Yönetimi */}
        {activeTab === 'blocks' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Sitedeki Bloklar</h3>
                <p className="text-xs text-slate-500">Daireleri gruplamak için A Blok, B Blok vb. tanımlayabilirsiniz</p>
              </div>
              <button
                onClick={() => setIsBlockModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Blok Ekle</span>
              </button>
            </div>

            {isLoadingBlocks ? (
              <div className="text-center p-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <span>Bloklar yükleniyor...</span>
              </div>
            ) : blocks.length === 0 ? (
              <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Layers className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-medium">Henüz bir blok tanımlanmadı (Müstakil veya tek bina)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {blocks.map((blk) => (
                  <div key={blk.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{blk.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`${blk.name} bloğunu silmek istediğinize emin misiniz?`)) {
                          deleteBlockMutation.mutate(blk.id);
                        }
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Bloğu Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Success Feedback Alert */}
        {accrueSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{accrueSuccess}</span>
          </div>
        )}

        {/* Tab 3: Aidat Ayarları */}
        {activeTab === 'dues' && (
          <div className="space-y-6">
            {/* Aidat Bilgi Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Aktif Aidat */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Mevcut Aktif Aidat</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Aktif
                  </span>
                </div>
                {dueSummary?.current_rate ? (
                  <div>
                    <span className="text-2xl font-black text-slate-900">
                      ₺{dueSummary.current_rate.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {dueSummary.current_rate.valid_from} tarihinden itibaren geçerli
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-400">Henüz aidat tanımlanmadı</span>
                    <span className="text-[11px] text-slate-400 block mt-1">Lütfen aidat tutarı belirleyin</span>
                  </div>
                )}
              </div>

              {/* Gelecek Aidat Planı */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Planlanan Aidat Değişikliği</span>
                  {dueSummary?.upcoming_rate && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Zamanlanmış
                    </span>
                  )}
                </div>
                {dueSummary?.upcoming_rate ? (
                  <div>
                    <span className="text-2xl font-black text-blue-600">
                      ₺{dueSummary.upcoming_rate.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-blue-500 block mt-1">
                      {dueSummary.upcoming_rate.valid_from} tarihinden itibaren geçerli olacak
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-400">İleri tarihli plan yok</span>
                    <span className="text-[11px] text-slate-400 block mt-1">Gelecek ay için yeni tutar girilebilir</span>
                  </div>
                )}
              </div>

              {/* Tahakkuk Bilgilendirme */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">Otomatik Tahakkuk (Cron)</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Sistem her ayın 1'inde gece 00:00'da tüm aktif dairelere otomatik olarak aidat borcu yansıtır.
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      if (window.confirm('Bu ay için tüm dairelere aidat borcu yansıtılsın mı?')) {
                        accrueMutation.mutate();
                      }
                    }}
                    disabled={accrueMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${accrueMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>Bu Ayı Manuel Tahakkuk Ettir</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Aidat Geçmişi Tablosu */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Aidat Değişim Geçmişi</h3>
                  <p className="text-xs text-slate-500">Geçmiş aidat değişimleri ve yürürlüğe giriş tarihleri</p>
                </div>
              </div>

              {isLoadingDues ? (
                <div className="text-center p-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <span>Aidat geçmişi yükleniyor...</span>
                </div>
              ) : !dueSummary?.history || dueSummary.history.length === 0 ? (
                <div className="text-center p-8 text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span>Henüz bir aidat tutarı kaydı bulunmuyor.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3">Aidat Tutarı</th>
                      <th className="px-5 py-3">Geçerlilik Başlangıcı</th>
                      <th className="px-5 py-3">Belirleyen Yetkili</th>
                      <th className="px-5 py-3">Kayıt Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dueSummary.history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 text-sm">
                          ₺{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-800">{item.valid_from}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {item.created_by_name || 'Yönetici'}
                        </td>
                        <td className="px-5 py-4 text-slate-400">
                          {new Date(item.created_at).toLocaleDateString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Borçlar & Tahakkuklar */}
        {activeTab === 'debts' && (
          <div className="space-y-6">
            {/* Borç Özet Metrikleri */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Toplam Tahakkuk</span>
                <span className="text-2xl font-bold text-slate-900">
                  ₺{debtData?.stats ? debtData.stats.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">{debtData?.stats?.total_count || 0} toplam borç kaydı</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Tahsil Edilen Tutar</span>
                <span className="text-2xl font-bold text-emerald-600">
                  ₺{debtData?.stats ? debtData.stats.total_paid.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">{debtData?.stats?.paid_count || 0} tamamen ödendi</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Kalan Açık Bakiye</span>
                <span className="text-2xl font-bold text-rose-600">
                  ₺{debtData?.stats ? debtData.stats.total_remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">{debtData?.stats?.open_count || 0} açık, {debtData?.stats?.partial_count || 0} kısmi</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Tahsilat Oranı</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {debtData?.stats && debtData.stats.total_amount > 0
                    ? `%${Math.round((debtData.stats.total_paid / debtData.stats.total_amount) * 100)}`
                    : '%0'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Ödenen / Toplam borç</span>
              </div>
            </div>

            {/* Filtreleme ve Tablo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Durum Filtresi */}
                  <select
                    value={debtStatusFilter}
                    onChange={(e) => setDebtStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="open">Açık (Ödenmedi)</option>
                    <option value="partial">Kısmi Ödendi</option>
                    <option value="paid">Tamamen Ödendi</option>
                  </select>

                  {/* Tür Filtresi */}
                  <select
                    value={debtTypeFilter}
                    onChange={(e) => setDebtTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="all">Tüm Borç Türleri</option>
                    <option value="monthly_due">Aylık Aidat</option>
                    <option value="fixture">Demirbaş Gideri</option>
                    <option value="investment">Ekstra Yatırım</option>
                    <option value="other">Diğer</option>
                  </select>

                  {/* Daire Filtresi */}
                  <select
                    value={debtAptFilter}
                    onChange={(e) => setDebtAptFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium max-w-[200px]"
                  >
                    <option value="all">Tüm Daireler</option>
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.block_name ? `${a.block_name} ` : ''}No: {a.door_number}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  Toplam {debtData?.debts?.length || 0} borç listelendi
                </span>
              </div>

              {isLoadingDebts ? (
                <div className="text-center p-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <span>Borç kayıtları yükleniyor...</span>
                </div>
              ) : !debtData?.debts || debtData.debts.length === 0 ? (
                <div className="text-center p-8 text-slate-400">
                  <BadgeDollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span>Seçili kriterlere uygun borç kaydı bulunamadı.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">Daire</th>
                        <th className="px-4 py-3">Borçlu (Muhatap)</th>
                        <th className="px-4 py-3">Tür</th>
                        <th className="px-4 py-3">Dönem / Açıklama</th>
                        <th className="px-4 py-3">Toplam Tutar</th>
                        <th className="px-4 py-3">Ödenen</th>
                        <th className="px-4 py-3">Kalan Bakiye</th>
                        <th className="px-4 py-3">Durum</th>
                        <th className="px-4 py-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {debtData.debts.map((debt) => (
                        <tr key={debt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {debt.block_name ? `${debt.block_name} ` : ''}No: {debt.door_number}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-900 block">{debt.debtor_full_name}</span>
                            <span className="text-[11px] text-slate-400 block">{debt.debtor_phone}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {debt.type === 'monthly_due' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Aylık Aidat
                              </span>
                            )}
                            {debt.type === 'fixture' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Demirbaş
                              </span>
                            )}
                            {debt.type === 'investment' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Yatırım
                              </span>
                            )}
                            {debt.type === 'other' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Diğer
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-slate-800 block">
                              {debt.due_month ? debt.due_month.substring(0, 7) : '-'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                              {debt.description || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            ₺{debt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-emerald-600">
                                ₺{debt.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                / ₺{debt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  debt.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.round((debt.paid_amount / debt.amount) * 100))}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-rose-600">
                            ₺{debt.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5">
                            {debt.status === 'paid' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Ödendi
                              </span>
                            )}
                            {debt.status === 'partial' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Kısmi
                              </span>
                            )}
                            {debt.status === 'open' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Açık
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {debt.remaining > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedDebtForPayment(debt);
                                    setPaymentForm({
                                      amount: debt.remaining,
                                      payment_method: 'cash',
                                      payment_date: new Date().toISOString().split('T')[0],
                                      notes: '',
                                    });
                                    setPaymentError(null);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                                  title="Tahsilat / Ödeme Girişi"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Ödeme Al</span>
                                </button>
                              )}

                              {debt.paid_amount > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedDebtForHistory(debt);
                                    setIsDebtPaymentHistoryModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Ödeme Geçmişi"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                              )}

                              {debt.paid_amount === 0 && (
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Daire ${debt.door_number} için tanımlanan "${debt.description || 'Borç'}" kaydını (₺${debt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}) silmek istediğinize emin misiniz?`
                                      )
                                    ) {
                                      deleteDebtMutation.mutate(debt.id);
                                    }
                                  }}
                                  disabled={deleteDebtMutation.isPending}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  title="Borcu Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Tahsilatlar */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Finansal Metrik Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Toplam Tahsilat</span>
                <span className="text-2xl font-bold text-emerald-600">
                  ₺{paymentStats ? paymentStats.total_collected.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">{paymentStats?.total_count || 0} adet tahsilat işlemi</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Nakit Tahsilat</span>
                <span className="text-2xl font-bold text-slate-900">
                  ₺{paymentStats ? paymentStats.cash_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Elden teslim alınan</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Banka / Havale / EFT</span>
                <span className="text-2xl font-bold text-blue-600">
                  ₺{paymentStats ? paymentStats.transfer_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Hesaba gelen ödemeler</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Toplam İşlem Adedi</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {paymentStats?.total_count || 0}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Kayıtlı makbuz/işlem</span>
              </div>
            </div>

            {/* Filtreleme ve Tablo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Ödeme Yöntemi Filtresi */}
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="all">Tüm Yöntemler</option>
                    <option value="cash">Nakit</option>
                    <option value="transfer">Banka Havalesi / EFT</option>
                  </select>

                  {/* Daire Filtresi */}
                  <select
                    value={paymentAptFilter}
                    onChange={(e) => setPaymentAptFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium max-w-[200px]"
                  >
                    <option value="all">Tüm Daireler</option>
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.block_name ? `${a.block_name} ` : ''}No: {a.door_number}
                      </option>
                    ))}
                  </select>

                  {/* Tarih Filtreleri */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Başlangıç:</span>
                    <input
                      type="date"
                      value={paymentStartDate}
                      onChange={(e) => setPaymentStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Bitiş:</span>
                    <input
                      type="date"
                      value={paymentEndDate}
                      onChange={(e) => setPaymentEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  {(paymentMethodFilter !== 'all' || paymentAptFilter !== 'all' || paymentStartDate || paymentEndDate) && (
                    <button
                      onClick={() => {
                        setPaymentMethodFilter('all');
                        setPaymentAptFilter('all');
                        setPaymentStartDate('');
                        setPaymentEndDate('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium underline cursor-pointer"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  Toplam {payments.length} tahsilat kaydı
                </span>
              </div>

              {isLoadingPayments ? (
                <div className="text-center p-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <span>Tahsilat kayıtları yükleniyor...</span>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center p-8 text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span>Kayıtlı tahsilat bulunamadı.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">Ödeme Tarihi</th>
                        <th className="px-4 py-3">Daire</th>
                        <th className="px-4 py-3">Ödeyen (Borçlu)</th>
                        <th className="px-4 py-3">Borç Türü & Dönem</th>
                        <th className="px-4 py-3">Tutar</th>
                        <th className="px-4 py-3">Yöntem</th>
                        <th className="px-4 py-3">Not / Açıklama</th>
                        <th className="px-4 py-3">Kaydeden</th>
                        <th className="px-4 py-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {p.payment_date}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {p.block_name ? `${p.block_name} ` : ''}No: {p.door_number}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-900 block">{p.debtor_full_name}</span>
                            <span className="text-[11px] text-slate-400 block">{p.debtor_phone}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {p.debt_type === 'monthly_due' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Aidat {p.debt_due_month ? `(${p.debt_due_month.substring(0, 7)})` : ''}
                                </span>
                              )}
                              {p.debt_type === 'fixture' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Demirbaş
                                </span>
                              )}
                              {p.debt_type === 'investment' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  Yatırım
                                </span>
                              )}
                              {p.debt_type === 'other' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  Diğer
                                </span>
                              )}
                            </div>
                            {p.debt_description && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-[180px] mt-0.5">
                                {p.debt_description}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-emerald-600 text-sm">
                            ₺{p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5">
                            {p.payment_method === 'cash' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Banknote className="w-3 h-3" />
                                Nakit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <CreditCard className="w-3 h-3" />
                                Havale / EFT
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 text-[11px] max-w-[200px] truncate">
                            {p.notes || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                            {p.recorded_by_name}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `₺${p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} tutarındaki bu ödeme kaydını silmek istediğinize emin misiniz? İlgili borcun açık bakiyesi artacaktır.`
                                  )
                                ) {
                                  deletePaymentMutation.mutate(p.id);
                                }
                              }}
                              disabled={deletePaymentMutation.isPending}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Ödemeyi İptal Et / Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Masraflar */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Finansal Metrik Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">Toplam Masraf</span>
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-2xl font-bold text-rose-600">
                  ₺{expenseData?.stats ? expenseData.stats.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {expenseData?.stats?.total_count || 0} adet harcama kaydı
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">Bu Ayki Masraf</span>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-600">
                  ₺{expenseData?.stats ? expenseData.stats.this_month_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Bu ay yapılan harcamalar</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">Toplam Harcama Adedi</span>
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {expenseData?.stats?.total_count || 0}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Sistemdeki tüm masraflar</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">Kategori Çeşidi</span>
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {expenseCategories.length}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Aktif masraf kategorisi</span>
              </div>
            </div>

            {/* Filtreleme ve Tablo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Kategori Filtresi */}
                  <select
                    value={expenseCatFilter}
                    onChange={(e) => setExpenseCatFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="all">Tüm Kategoriler</option>
                    {allExpenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {!c.is_active ? '(Pasif)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Tarih Filtreleri */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Başlangıç:</span>
                    <input
                      type="date"
                      value={expenseStartDate}
                      onChange={(e) => setExpenseStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Bitiş:</span>
                    <input
                      type="date"
                      value={expenseEndDate}
                      onChange={(e) => setExpenseEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  {(expenseCatFilter !== 'all' || expenseStartDate || expenseEndDate) && (
                    <button
                      onClick={() => {
                        setExpenseCatFilter('all');
                        setExpenseStartDate('');
                        setExpenseEndDate('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium underline cursor-pointer"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  Toplam {expenseData?.expenses?.length || 0} masraf kaydı
                </span>
              </div>

              {isLoadingExpenses ? (
                <div className="text-center p-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <span>Masraf kayıtları yükleniyor...</span>
                </div>
              ) : !expenseData?.expenses || expenseData.expenses.length === 0 ? (
                <div className="text-center p-8 text-slate-400">
                  <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span>Kayıtlı masraf bulunamadı.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">Harcama Tarihi</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3">Açıklama</th>
                        <th className="px-4 py-3">Fiş / Makbuz No</th>
                        <th className="px-4 py-3">Tutar</th>
                        <th className="px-4 py-3">Kaydeden</th>
                        <th className="px-4 py-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenseData.expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {exp.expense_date}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs border border-blue-100/60 font-medium">
                              <Tag className="w-3 h-3 text-blue-500" />
                              {exp.category_name}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 font-medium max-w-xs">
                            {exp.description}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                            {exp.receipt_note ? (
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                {exp.receipt_note}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-rose-600 text-sm whitespace-nowrap">
                            -₺{exp.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                            {exp.recorded_by_name || 'Yönetici'}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `₺${exp.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} tutarındaki "${exp.description}" masraf kaydını silmek istediğinize emin misiniz?`
                                  )
                                ) {
                                  deleteExpenseMutation.mutate(exp.id);
                                }
                              }}
                              disabled={deleteExpenseMutation.isPending}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Masrafı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Şeffaf Kasa */}
        {activeTab === 'treasury' && (
          <div className="space-y-6">
            {isLoadingTreasury ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-xs text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Kasa ve finansal veriler yükleniyor...</span>
              </div>
            ) : (
              <>
                {/* Kasa Durum Metrikleri */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Net Bakiye */}
                  <div className={`p-6 rounded-2xl border shadow-xs ${
                    (treasuryData?.net_balance ?? 0) >= 0 
                      ? 'bg-emerald-500 text-white border-emerald-600' 
                      : 'bg-rose-600 text-white border-rose-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Net Kasa Bakiyesi</span>
                      <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold tracking-tight">
                      ₺{treasuryData ? treasuryData.net_balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20 text-xs flex items-center justify-between opacity-95">
                      <span>Bu Ayki Net Değişim:</span>
                      <span className="font-bold font-mono">
                        {(treasuryData?.this_month_net ?? 0) >= 0 ? '+' : ''}₺
                        {treasuryData ? treasuryData.this_month_net.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                      </span>
                    </div>
                  </div>

                  {/* Açılış / Devir Bakiyesi */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Açılış / Devir Bakiyesi</span>
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                        <Landmark className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      ₺{treasuryData ? treasuryData.initial_balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                      <span>Başlangıç Durumu:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setInitialBalanceForm(treasuryData?.initial_balance ?? 0);
                          setInitialBalanceError(null);
                          setIsInitialBalanceModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Düzenle</span>
                      </button>
                    </div>
                  </div>

                  {/* Toplam Gelir */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Gelir (Tahsilat)</span>
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                      ₺{treasuryData ? treasuryData.total_income.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                      <span>Bu Ay Tahsil Edilen:</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        +₺{treasuryData ? treasuryData.this_month_income.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                      </span>
                    </div>
                  </div>

                  {/* Toplam Gider */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Gider (Masraf)</span>
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
                      ₺{treasuryData ? treasuryData.total_expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                      <span>Bu Ay Harcanan:</span>
                      <span className="font-bold text-rose-600 font-mono">
                        -₺{treasuryData ? treasuryData.this_month_expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                      </span>
                    </div>
                  </div>
                </div>

            {/* İki Kolonlu Bölüm: Kategori Dağılımı ve Aylık Nakit Akışı */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kategori Bazlı Gider Dağılımı (1 Kolon) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 lg:col-span-1">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Giderlerin Kategori Dağılımı</h4>
                  </div>
                </div>

                {!treasuryData?.category_breakdown || treasuryData.category_breakdown.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Henüz kategorize edilmiş gider kaydı yok.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {treasuryData.category_breakdown.map((cat) => (
                      <div key={cat.category_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{cat.category_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">
                              ₺{cat.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono w-10 text-right">
                              %{cat.percentage.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Aylık Nakit Akışı Geçmişi Tablosu (2 Kolon) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Aylık Nakit Akışı</h4>
                  </div>
                  <span className="text-xs text-slate-400">Son 12 ayın gelir / gider dengesi</span>
                </div>

                {!treasuryData?.monthly_flow || treasuryData.monthly_flow.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Aylık nakit akışı verisi bulunamadı.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-2.5">Dönem (Ay)</th>
                          <th className="px-4 py-2.5">Gelir (Tahsilat)</th>
                          <th className="px-4 py-2.5">Gider (Masraf)</th>
                          <th className="px-4 py-2.5 text-right">Net Bakiye</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {treasuryData.monthly_flow.map((m) => (
                          <tr key={m.month} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px]">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {m.month}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-600">
                              +₺{m.income.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 font-bold text-rose-600">
                              -₺{m.expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 font-extrabold text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs ${
                                  m.net >= 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {m.net >= 0 ? '+' : ''}₺
                                {m.net.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: SAYAÇ OKUMA & FATURALANDIRMA */}
        {/* ========================================================================= */}
        {activeTab === 'meters' && (
          <div className="space-y-6">
            {/* Metrik Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Toplam Dağıtılan Faturalar</span>
                <span className="text-2xl font-bold text-slate-900 font-mono">
                  ₺{meterTotalBilled.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Tüm sayaç faturaları toplamı</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Bu Ayki Sayaç Faturaları</span>
                <span className="text-2xl font-bold text-blue-600 font-mono">
                  ₺{meterThisMonthBilled.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Cari dönem sayaç giderleri</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Toplam Fatura Oturumu</span>
                <span className="text-2xl font-bold text-indigo-600 font-mono">
                  {consumptionPeriods.length}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Faturalandırma kaydı</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Sayaç Türleri</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-emerald-600">Su / Gaz</span>
                  <button
                    onClick={() => setIsMeterTypesModalOpen(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer hover:underline"
                  >
                    Yönet
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">Sitede aktif sayaçlar</span>
              </div>
            </div>

            {/* Fatura Dağıtım Geçmişi Tablosu */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Fatura Dağıtım ve Sayaç Kayıtları</h3>
                    <p className="text-xs text-slate-500">
                      Tüketim oranında dairelere paylaştırılmış ana faturalar ve endeksler
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMeterDistModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Sayaç Okuma & Fatura Dağıt</span>
                </button>
              </div>

              {isLoadingPeriods ? (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs">Sayaç kayıtları yükleniyor...</span>
                </div>
              ) : consumptionPeriods.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <Gauge className="w-12 h-12 stroke-1 text-slate-300 mx-auto" />
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">Henüz kayıtlı bir sayaç faturası bulunmuyor</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Su veya doğalgaz faturanızı dairelerin süzme sayaç tüketimlerine göre paylaştırmak için yeni okuma başlatın.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMeterDistModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>İlk Faturayı Dağıt</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">Dönem (Ay)</th>
                        <th className="px-4 py-3">Hizmet Türü</th>
                        <th className="px-4 py-3">Fatura Tutarı</th>
                        <th className="px-4 py-3">Fatura Tüketimi</th>
                        <th className="px-4 py-3">Birim Maliyet</th>
                        <th className="px-4 py-3">Ortak Alan Payı</th>
                        <th className="px-4 py-3">Dağıtılan Daire</th>
                        <th className="px-4 py-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consumptionPeriods.map((cp) => (
                        <tr key={cp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {cp.period.substring(0, 7)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {cp.meter_type_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold font-mono text-slate-900">
                            ₺{cp.total_bill_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-700">
                            {cp.total_billed_consumption} {cp.meter_type_unit}
                          </td>
                          <td className="px-4 py-3 font-mono text-indigo-700 font-bold">
                            ₺{cp.unit_cost.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / {cp.meter_type_unit}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {cp.common_area_consumption} {cp.meter_type_unit}{' '}
                            <span className="text-[10px] text-slate-400">
                              (₺{cp.common_area_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {cp.reading_count} Daire
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedPeriodForDetail(cp.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                              >
                                Detaylar
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `"${cp.meter_type_name} (${cp.period.substring(0, 7)})" faturalandırma oturumunu silmek istediğinize emin misiniz? ` +
                                        `Bu işleme bağlı henüz ödenmemiş borç kayıtları da silinecektir.`
                                    )
                                  ) {
                                    deletePeriodMutation.mutate(cp.id);
                                  }
                                }}
                                disabled={deletePeriodMutation.isPending}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Faturayı ve Borçları Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-6">
            {/* Metrik Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Toplam Duyuru
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {announcements.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Yayınlanan tüm duyurular</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Acil Duyurular
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-rose-600 tracking-tight">
                  {announcements.filter((a) => a.priority === 'urgent').length}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Kritik ve acil durum bildirimleri</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Önemli Duyurular
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-600 tracking-tight">
                  {announcements.filter((a) => a.priority === 'important').length}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Öncelikli genel duyurular</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Son Yayın Tarihi
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base font-bold text-slate-900 tracking-tight truncate">
                  {announcements[0]
                    ? new Date(announcements[0].published_at).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">En son paylaşılan duyuru</p>
              </div>
            </div>

            {/* Arama & İşlemler Barı */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Duyurularda ara..."
                  value={announcementSearch}
                  onChange={(e) => setAnnouncementSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-400">
                  Toplam {filteredAnnouncements.length} duyuru
                </span>
                <button
                  onClick={() => {
                    setSelectedAnnouncementForEdit(null);
                    setIsAnnouncementModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Duyuru Yayınla</span>
                </button>
              </div>
            </div>

            {/* Duyuru Listesi */}
            {isLoadingAnnouncements ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200 p-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
                <span className="text-sm font-medium">Duyurular yükleniyor...</span>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-500">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Henüz Duyuru Bulunmuyor</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {announcementSearch
                    ? 'Arama kriterlerinize uygun duyuru bulunamadı.'
                    : 'Site sakinleri için henüz bir duyuru veya bilgilendirme yayınlanmamış.'}
                </p>
                {!announcementSearch && (
                  <button
                    onClick={() => {
                      setSelectedAnnouncementForEdit(null);
                      setIsAnnouncementModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>İlk Duyuruyu Yayınla</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl border shadow-xs overflow-hidden transition-all hover:shadow-md ${
                      item.priority === 'urgent'
                        ? 'border-rose-200/80 hover:border-rose-300'
                        : item.priority === 'important'
                        ? 'border-amber-200/80 hover:border-amber-300'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Kart Başlığı */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                      <div className="flex items-center gap-3">
                        {item.priority === 'urgent' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0 shadow-2xs">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Acil
                          </span>
                        ) : item.priority === 'important' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Önemli
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shrink-0 shadow-2xs">
                            <Info className="w-3.5 h-3.5" />
                            Normal
                          </span>
                        )}

                        <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setSelectedAnnouncementForEdit(item);
                            setIsAnnouncementModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors"
                          title="Duyuruyu Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAnnouncementToDelete(item)}
                          className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Duyuruyu Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Kart İçeriği */}
                    <div className="p-5 sm:p-6">
                      <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-100/80 font-sans">
                        {item.content}
                      </div>
                    </div>

                    {/* Kart Alt Bilgisi */}
                    <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
                      <div className="flex items-center gap-2">
                        <span>Yayınlayan:</span>
                        <strong className="text-slate-800 font-semibold">
                          {item.author_name || 'Site Yöneticisi'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(item.published_at).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal: Yeni Daire Ekle */}
      {isAptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Yeni Daire Ekle</h3>
              <button onClick={() => setIsAptModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {aptError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{aptError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanedApt = {
                  ...newApt,
                  owner: newApt.owner ? {
                    ...newApt.owner,
                    email: newApt.owner.email?.trim() || undefined,
                  } : undefined,
                  tenant: newApt.tenant ? {
                    ...newApt.tenant,
                    email: newApt.tenant.email?.trim() || undefined,
                  } : undefined,
                };
                createAptMutation.mutate(cleanedApt);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blok (Opsiyonel)</label>
                  <select
                    value={newApt.block_id || ''}
                    onChange={(e) => setNewApt({ ...newApt, block_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="">Bloksuz</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kapı No *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 1 veya 12A"
                    value={newApt.door_number}
                    onChange={(e) => setNewApt({ ...newApt, door_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kat (Opsiyonel)</label>
                  <input
                    type="number"
                    placeholder="Örn: 3"
                    value={newApt.floor ?? ''}
                    onChange={(e) => setNewApt({ ...newApt, floor: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Ev Sahibi toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={hasOwnerOnCreate}
                    onChange={(e) => {
                      setHasOwnerOnCreate(e.target.checked);
                      if (!e.target.checked) setNewApt({ ...newApt, owner: undefined });
                      else setNewApt({ ...newApt, owner: { full_name: '', email: '', phone: '', password: '' } });
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">Ev Sahibi (Kat Maliki) Bilgisi Ekle</span>
                </label>

                {hasOwnerOnCreate && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="Ad Soyad *"
                      value={newApt.owner?.full_name || ''}
                      onChange={(e) => setNewApt({ ...newApt, owner: { ...newApt.owner!, full_name: e.target.value } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Telefon Numarası *"
                      value={newApt.owner?.phone || ''}
                      onChange={(e) => setNewApt({ ...newApt, owner: { ...newApt.owner!, phone: e.target.value } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="email"
                      placeholder="E-posta (Opsiyonel)"
                      value={newApt.owner?.email || ''}
                      onChange={(e) => setNewApt({ ...newApt, owner: { ...newApt.owner!, email: e.target.value || undefined } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="password"
                      required
                      placeholder="Giriş Şifresi *"
                      value={newApt.owner?.password || ''}
                      onChange={(e) => setNewApt({ ...newApt, owner: { ...newApt.owner!, password: e.target.value } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Kiracı toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={hasTenantOnCreate}
                    onChange={(e) => {
                      setHasTenantOnCreate(e.target.checked);
                      if (!e.target.checked) setNewApt({ ...newApt, tenant: undefined });
                      else setNewApt({ ...newApt, tenant: { full_name: '', phone: '', email: '', password: '' } });
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">Kiracı Bilgisi Ekle</span>
                </label>

                {hasTenantOnCreate && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="Kiracı Ad Soyad *"
                      value={newApt.tenant?.full_name || ''}
                      onChange={(e) => setNewApt({ ...newApt, tenant: { ...newApt.tenant!, full_name: e.target.value } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Kiracı Telefon *"
                      value={newApt.tenant?.phone || ''}
                      onChange={(e) => setNewApt({ ...newApt, tenant: { ...newApt.tenant!, phone: e.target.value } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="email"
                      placeholder="Kiracı E-posta (Opsiyonel)"
                      value={newApt.tenant?.email || ''}
                      onChange={(e) => setNewApt({ ...newApt, tenant: { ...newApt.tenant!, email: e.target.value || undefined } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="password"
                      required
                      placeholder="Kiracı Giriş Şifresi *"
                      value={newApt.tenant?.password || ''}
                      onChange={(e) => setNewApt({ ...newApt, tenant: { ...newApt.tenant!, password: e.target.value } })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createAptMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createAptMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Daireyi Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Yeni Blok Ekle */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Yeni Blok Tanımla</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newBlockName.trim()) createBlockMutation.mutate(newBlockName.trim());
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                placeholder="Örn: A Blok, B Blok, Doğu Blok"
                value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createBlockMutation.isPending}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sakin Ata (Malik veya Kiracı) */}
      {residentModalMode && activeAptForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {residentModalMode === 'owner' ? 'Ev Sahibi (Malik) Ata' : 'Kiracı Ata'} — Daire {activeAptForAction.door_number}
              </h3>
              <button onClick={() => setResidentModalMode(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setResidentMutation.mutate({
                  aptId: activeAptForAction.id,
                  res: {
                    ...residentForm,
                    email: residentForm.email?.trim() || undefined,
                  },
                  mode: residentModalMode,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ad Soyad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ad Soyad"
                  value={residentForm.full_name}
                  onChange={(e) => setResidentForm({ ...residentForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefon Numarası *</label>
                <input
                  type="tel"
                  required
                  placeholder="05xx xxx xx xx"
                  value={residentForm.phone}
                  onChange={(e) => setResidentForm({ ...residentForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-posta Adresi (Opsiyonel)</label>
                <input
                  type="email"
                  placeholder="ornek@mail.com"
                  value={residentForm.email || ''}
                  onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giriş Şifresi Belirle *</label>
                <input
                  type="password"
                  required
                  placeholder="Sakin için giriş şifresi giriniz"
                  value={residentForm.password || ''}
                  onChange={(e) => setResidentForm({ ...residentForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResidentModalMode(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={setResidentMutation.isPending}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                >
                  {setResidentMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kiracı Çıkar & Borç Yönetimi (Kural 4) */}
      {isRemoveTenantModalOpen && activeAptForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <UserX className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Kiracı Çıkışı — Daire {activeAptForAction.door_number}</h3>
              </div>
              <button onClick={() => setIsRemoveTenantModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              <strong>{activeAptForAction.tenant_full_name}</strong> kiracı kaydından düşürülecektir. Ödenmemiş aidat/borçlar için bir karar seçiniz:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                removeTenantMutation.mutate({
                  aptId: activeAptForAction.id,
                  payload: removeTenantForm,
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="debt_action"
                    value="keep"
                    checked={removeTenantForm.debt_action === 'keep'}
                    onChange={() => setRemoveTenantForm({ ...removeTenantForm, debt_action: 'keep' })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Eski Kiracıda Bırak</span>
                    <span className="text-[11px] text-slate-500">Borç silinmez, eski kiracının ekstresinde kalmaya devam eder.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="debt_action"
                    value="transfer"
                    checked={removeTenantForm.debt_action === 'transfer'}
                    onChange={() => setRemoveTenantForm({ ...removeTenantForm, debt_action: 'transfer' })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Ev Sahibine Devret</span>
                    <span className="text-[11px] text-slate-500">
                      Ödenmemiş açık borçlar doğrudan ev sahibine yansıtılır (Ev sahibi kayıtlı olmalıdır).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="debt_action"
                    value="delete"
                    checked={removeTenantForm.debt_action === 'delete'}
                    onChange={() => setRemoveTenantForm({ ...removeTenantForm, debt_action: 'delete' })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-rose-700 block">Borcu Sil</span>
                    <span className="text-[11px] text-slate-500">Bu kiracıya ait açık borçlar sistemden kalıcı olarak silinir.</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahliye Notu (Opsiyonel)</label>
                <textarea
                  rows={2}
                  placeholder="Örn: Sözleşme bitimi, depozito mahsubu yapıldı vb."
                  value={removeTenantForm.notes || ''}
                  onChange={(e) => setRemoveTenantForm({ ...removeTenantForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl resize-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRemoveTenantModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={removeTenantMutation.isPending}
                  className="px-3.5 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700"
                >
                  {removeTenantMutation.isPending ? 'İşleniyor...' : 'Çıkışı Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kiracı Geçmişi */}
      {isHistoryModalOpen && activeAptForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Daire {activeAptForAction.door_number} — Kiracı Geçmişi
                </h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="text-center p-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <span>Geçmiş yükleniyor...</span>
              </div>
            ) : tenantHistory.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-xs">
                Bu daire için geçmiş kiracı kaydı bulunmamaktadır.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {tenantHistory.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{item.tenant_full_name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(item.started_at).toLocaleDateString('tr-TR')} —{' '}
                        {item.ended_at ? new Date(item.ended_at).toLocaleDateString('tr-TR') : 'Aktif'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mb-1">
                      <span>{item.tenant_email}</span>
                      {item.tenant_phone && <span className="ml-2">({item.tenant_phone})</span>}
                    </div>
                    {item.debt_action && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Borç Kararı:</span>
                        <span className="font-semibold text-indigo-700 capitalize">{item.debt_action}</span>
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-slate-600 mt-1 italic">"{item.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Yeni Aidat Tutarı Belirle */}
      {isSetDueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Yeni Aidat Tutarı Belirle</h3>
              </div>
              <button onClick={() => setIsSetDueModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {dueError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{dueError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDueMutation.mutate(dueForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Aylık Aidat Tutarı (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="Örn: 1500"
                  value={dueForm.amount || ''}
                  onChange={(e) => setDueForm({ ...dueForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Geçerlilik Başlangıcı (Kural 4) *</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60">
                    <input
                      type="radio"
                      name="effective_type"
                      value="this_month"
                      checked={dueForm.effective_type === 'this_month'}
                      onChange={() => setDueForm({ ...dueForm, effective_type: 'this_month' })}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Bu Aydan Geçerli</span>
                      <span className="text-[11px] text-slate-500">
                        Bu ayın 1'inden itibaren tahakkuk edecek aidatlara hemen yansıtılır.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60">
                    <input
                      type="radio"
                      name="effective_type"
                      value="next_month"
                      checked={dueForm.effective_type === 'next_month'}
                      onChange={() => setDueForm({ ...dueForm, effective_type: 'next_month' })}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Gelecek Aydan Geçerli</span>
                      <span className="text-[11px] text-slate-500">
                        Bu ayın aidatları değişmez, bir sonraki ayın 1'inden itibaren uygulanır.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60">
                    <input
                      type="radio"
                      name="effective_type"
                      value="custom"
                      checked={dueForm.effective_type === 'custom'}
                      onChange={() => setDueForm({ ...dueForm, effective_type: 'custom' })}
                      className="mt-0.5 text-blue-600"
                    />
                    <div className="w-full">
                      <span className="font-bold text-slate-800 block mb-1">Özel Tarih Belirle</span>
                      {dueForm.effective_type === 'custom' && (
                        <input
                          type="date"
                          required
                          value={dueForm.valid_from || ''}
                          onChange={(e) => setDueForm({ ...dueForm, valid_from: e.target.value })}
                          className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSetDueModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={setDueMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {setDueMutation.isPending ? 'Kaydediliyor...' : 'Kaydet ve Yürürlüğe Al'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Yeni Manuel Borç Girişi (Tek Daire veya Tüm Daireler) */}
      {isManualDebtModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Borç Tahakkuk Ekle</h3>
              </div>
              <button onClick={() => setIsManualDebtModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hedef Seçimi: Tek Daire veya Tüm Daireler */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setDebtTargetMode('single');
                  setManualDebtError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  debtTargetMode === 'single'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Tek Daire</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDebtTargetMode('all');
                  setManualDebtError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  debtTargetMode === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tüm Aktif Daireler ({apartments.length})</span>
              </button>
            </div>

            {manualDebtError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{manualDebtError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (debtTargetMode === 'single') {
                  createDebtMutation.mutate(manualDebtForm);
                } else {
                  createBulkDebtMutation.mutate({
                    type: manualDebtForm.type,
                    amount: manualDebtForm.amount,
                    description: manualDebtForm.description,
                    debtor_target: manualDebtForm.type === 'other' ? bulkDebtorTarget : 'owner',
                  });
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {debtTargetMode === 'single' ? (
                <>
                  {/* Daire Seçimi */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Daire Seçin *</label>
                    <select
                      required
                      value={manualDebtForm.apartment_id}
                      onChange={(e) => {
                        const aptId = e.target.value;
                        const apt = apartments.find((a) => a.id === aptId);
                        setManualDebtForm({
                          ...manualDebtForm,
                          apartment_id: aptId,
                          debtor_user_id:
                            manualDebtForm.type === 'fixture' || manualDebtForm.type === 'investment'
                              ? apt?.owner_user_id || undefined
                              : apt?.tenant_user_id || apt?.owner_user_id || undefined,
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">-- Daire Seçin --</option>
                      {apartments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.block_name ? `${a.block_name} ` : ''}No: {a.door_number} {a.owner_full_name ? `(${a.owner_full_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Borç Türü */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Borç Türü *</label>
                    <select
                      value={manualDebtForm.type}
                      onChange={(e) => {
                        const nextType = e.target.value as DebtType;
                        const apt = apartments.find((a) => a.id === manualDebtForm.apartment_id);
                        setManualDebtForm({
                          ...manualDebtForm,
                          type: nextType,
                          debtor_user_id:
                            nextType === 'fixture' || nextType === 'investment'
                              ? apt?.owner_user_id || undefined
                              : manualDebtForm.debtor_user_id,
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="fixture">Demirbaş Gideri (Doğrudan Ev Sahibine)</option>
                      <option value="investment">Ekstra Yatırım (Doğrudan Ev Sahibine)</option>
                      <option value="other">Diğer Gider / Harcama</option>
                    </select>
                  </div>

                  {/* Muhatap Bilgisi & Kural İzahı */}
                  {manualDebtForm.apartment_id && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {manualDebtForm.type === 'fixture' || manualDebtForm.type === 'investment' ? (
                        <div>
                          <span className="text-[11px] font-bold text-amber-800 block mb-0.5">
                            İş Kuralı (Kural 4): Demirbaş & Yatırım Gideri
                          </span>
                          <p className="text-[11px] text-slate-500 mb-2">
                            Kiracıdan bağımsız olarak her zaman doğrudan Ev Sahibi'ne tahakkuk ettirilir.
                          </p>
                          {apartments.find((a) => a.id === manualDebtForm.apartment_id)?.owner_user_id ? (
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                              <span>
                                Muhatap:{' '}
                                {apartments.find((a) => a.id === manualDebtForm.apartment_id)?.owner_full_name} (Ev Sahibi)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                              <span>Bu dairede kayıtlı ev sahibi bulunmadığı için borçlandırılamaz!</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Borcun Muhatabı *</label>
                          <select
                            value={manualDebtForm.debtor_user_id || ''}
                            onChange={(e) => setManualDebtForm({ ...manualDebtForm, debtor_user_id: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                          >
                            {(() => {
                              const apt = apartments.find((a) => a.id === manualDebtForm.apartment_id);
                              return (
                                <>
                                  {apt?.tenant_user_id && (
                                    <option value={apt.tenant_user_id}>Kiracı: {apt.tenant_full_name}</option>
                                  )}
                                  {apt?.owner_user_id && (
                                    <option value={apt.owner_user_id}>Ev Sahibi: {apt.owner_full_name}</option>
                                  )}
                                </>
                              );
                            })()}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Toplu Borç Bilgilendirme */}
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Tüm Dairelere Toplu Tahakkuk</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Sitede aktif <strong>{apartments.length} adet</strong> daire bulunmaktadır. Gireceğiniz tutar her bir daireye ayrı bir borç olarak tahakkuk ettirilecektir.
                    </p>
                  </div>

                  {/* Borç Türü */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Borç Türü *</label>
                    <select
                      value={manualDebtForm.type}
                      onChange={(e) => setManualDebtForm({ ...manualDebtForm, type: e.target.value as DebtType })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="fixture">Demirbaş Gideri (Doğrudan Ev Sahiplerine)</option>
                      <option value="investment">Ekstra Yatırım (Doğrudan Ev Sahiplerine)</option>
                      <option value="other">Diğer Gider / Tadilat / Harcama</option>
                    </select>
                  </div>

                  {/* Toplu Muhatap Kuralı */}
                  {manualDebtForm.type === 'fixture' || manualDebtForm.type === 'investment' ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                      <span className="font-bold block mb-0.5">İş Kuralı (Kural 4): Ev Sahibine Yansıtılır</span>
                      Demirbaş ve yatırım borçları istisnasız kat maliklerine (ev sahiplerine) tahakkuk ettirilir. Henüz ev sahibi tanımlanmamış daireler otomatik olarak atlanır.
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Toplu Muhatap Seçimi *</label>
                      <select
                        value={bulkDebtorTarget}
                        onChange={(e) => setBulkDebtorTarget(e.target.value as 'owner' | 'auto')}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      >
                        <option value="owner">Yalnızca Ev Sahiplerine Tahakkuk Ettir</option>
                        <option value="auto">Önce Kiracıya (Kiracı Yoksa Ev Sahibine)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Tutar */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {debtTargetMode === 'all' ? 'Daire Başı Tutar (₺) *' : 'Tutar (₺) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={manualDebtForm.amount || ''}
                  onChange={(e) =>
                    setManualDebtForm({ ...manualDebtForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              {/* Toplu Tutar Özeti */}
              {debtTargetMode === 'all' && manualDebtForm.amount > 0 && (
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">Tahmini Toplam Tahakkuk</div>
                    <div className="text-[11px] text-blue-300">
                      {apartments.length} Daire × ₺{manualDebtForm.amount.toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    ₺{(manualDebtForm.amount * apartments.length).toLocaleString('tr-TR')}
                  </div>
                </div>
              )}

              {/* Açıklama */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Açıklama *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    debtTargetMode === 'all'
                      ? 'Örn: Çatı izolasyon payı, Dış cephe boya bedeli'
                      : 'Örn: Asansör halatı yenileme payı, Su tesisatı tamiratı'
                  }
                  value={manualDebtForm.description}
                  onChange={(e) => setManualDebtForm({ ...manualDebtForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualDebtModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={
                    debtTargetMode === 'single'
                      ? createDebtMutation.isPending
                      : createBulkDebtMutation.isPending || apartments.length === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {debtTargetMode === 'single'
                    ? createDebtMutation.isPending
                      ? 'Ekleniyor...'
                      : 'Borcu Kaydet'
                    : createBulkDebtMutation.isPending
                    ? 'Toplu Ekleniyor...'
                    : `Tüm Dairelere Ekle (${apartments.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tahsilat / Ödeme Girişi */}
      {isPaymentModalOpen && selectedDebtForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tahsilat / Ödeme Girişi</h3>
                  <p className="text-[11px] text-slate-400">Daire borcuna istinaden tahsilat kaydı ekleyin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedDebtForPayment(null);
                  setPaymentError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Borç Özet Kartı */}
            <div className="mb-5 p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Daire & Blok:</span>
                <span className="font-bold text-slate-900">
                  {selectedDebtForPayment.block_name ? `${selectedDebtForPayment.block_name} ` : ''}No: {selectedDebtForPayment.door_number}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Ödeyen (Borçlu):</span>
                <span className="font-semibold text-slate-900">
                  {selectedDebtForPayment.debtor_full_name} ({selectedDebtForPayment.debtor_phone})
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Borç Türü & Dönem:</span>
                <span className="font-semibold text-slate-800">
                  {selectedDebtForPayment.type === 'monthly_due' ? 'Aylık Aidat' : selectedDebtForPayment.type === 'fixture' ? 'Demirbaş' : 'Yatırım / Diğer'}
                  {selectedDebtForPayment.due_month ? ` (${selectedDebtForPayment.due_month.substring(0, 7)})` : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Toplam Tutar</span>
                  <span className="font-bold text-slate-700">
                    ₺{selectedDebtForPayment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Daha Önce Ödenen</span>
                  <span className="font-bold text-emerald-600">
                    ₺{selectedDebtForPayment.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-rose-50/75 p-2 rounded-lg border border-rose-200">
                  <span className="text-[10px] text-rose-500 font-semibold block">Kalan Borç</span>
                  <span className="font-extrabold text-rose-700">
                    ₺{selectedDebtForPayment.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (paymentForm.amount <= 0) {
                  setPaymentError('Ödeme tutarı 0\'dan büyük olmalıdır.');
                  return;
                }
                recordPaymentMutation.mutate({
                  debt_id: selectedDebtForPayment.id,
                  amount: paymentForm.amount,
                  payment_method: paymentForm.payment_method,
                  payment_date: paymentForm.payment_date || undefined,
                  notes: paymentForm.notes ? paymentForm.notes.trim() : undefined,
                });
              }}
              className="space-y-4 text-xs"
            >
              {/* Tutar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Tahsil Edilen Tutar (₺) *</label>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amount: selectedDebtForPayment.remaining })}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                  >
                    Kalanın Tamamı (₺{selectedDebtForPayment.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentForm.amount || ''}
                  onChange={(e) => {
                    setPaymentError(null);
                    setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900"
                />
                {paymentForm.amount > selectedDebtForPayment.remaining ? (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Fazla Tahsilat Bilgisi: </span>
                      Kalan borcun üzerinde <strong>₺{(paymentForm.amount - selectedDebtForPayment.remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong> tutarında fazla ödeme alınıyor. Fazla miktar otomatik olarak ödeme notuna kaydedilecek ve borç tamamen kapatılacaktır.
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Kısmi ödeme yapılıyorsa lütfen tahsil edilen parçalı tutarı giriniz.
                  </span>
                )}
              </div>


              {/* Ödeme Yöntemi */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Ödeme Yöntemi *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setPaymentForm({ ...paymentForm, payment_method: 'cash' })}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentForm.payment_method === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Banknote className={`w-4 h-4 ${paymentForm.payment_method === 'cash' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="block text-xs">Nakit</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Elden tahsil edildi</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setPaymentForm({ ...paymentForm, payment_method: 'transfer' })}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentForm.payment_method === 'transfer'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${paymentForm.payment_method === 'transfer' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="block text-xs">Banka Havalesi / EFT</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Site banka hesabına</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Ödeme Tarihi */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ödeme Tarihi *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Notlar / Açıklama */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Açıklama / Dekont Notu</label>
                <input
                  type="text"
                  placeholder="Örn: Garanti Bankası dekont no 987654, Elden teslim alındı"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedDebtForPayment(null);
                    setPaymentError(null);
                  }}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {recordPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tahsilatı Onayla</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Borç Ödeme Geçmişi */}
      {isDebtPaymentHistoryModalOpen && selectedDebtForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Borç Ödeme Geçmişi</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedDebtForHistory.block_name ? `${selectedDebtForHistory.block_name} ` : ''}No: {selectedDebtForHistory.door_number} — {selectedDebtForHistory.debtor_full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDebtPaymentHistoryModalOpen(false);
                  setSelectedDebtForHistory(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Özet */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Toplam Borç</span>
                <span className="font-bold text-slate-800">
                  ₺{selectedDebtForHistory.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Toplam Ödenen</span>
                <span className="font-bold text-emerald-600">
                  ₺{selectedDebtForHistory.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Kalan Borç</span>
                <span className="font-bold text-rose-600">
                  ₺{selectedDebtForHistory.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {isLoadingDebtPayments ? (
              <div className="text-center p-6 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <span>Ödeme geçmişi yükleniyor...</span>
              </div>
            ) : debtPayments.length === 0 ? (
              <div className="text-center p-6 text-slate-400 text-xs">
                <span>Bu borca ait henüz ödeme kaydı bulunmuyor.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {debtPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-emerald-600 text-sm">
                          ₺{p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                        {p.payment_method === 'cash' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Nakit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Havale/EFT
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {p.payment_date}
                        </span>
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{p.notes}</p>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Kaydeden: {p.recorded_by_name}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `₺${p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} tutarındaki bu ödemeyi silmek istediğinize emin misiniz? Kalan borç bakiyesi güncellenecektir.`
                          )
                        ) {
                          deletePaymentMutation.mutate(p.id);
                        }
                      }}
                      disabled={deletePaymentMutation.isPending}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Ödemeyi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDebtPaymentHistoryModalOpen(false);
                  setSelectedDebtForHistory(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Yeni Masraf Ekle */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Yeni Masraf / Gider Kaydı Ekle</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {expenseError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{expenseError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!expenseForm.category_id) {
                  setExpenseError('Lütfen bir masraf kategorisi seçin');
                  return;
                }
                if (expenseForm.amount <= 0) {
                  setExpenseError('Masraf tutarı 0\'dan büyük olmalıdır');
                  return;
                }
                createExpenseMutation.mutate(expenseForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Masraf Kategorisi *</label>
                <select
                  required
                  value={expenseForm.category_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">-- Kategori Seçiniz --</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {expenseCategories.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Aktif kategori bulunamadı. Lütfen önce "Kategorileri Yönet" butonundan bir kategori ekleyin.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Masraf Tutarı (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Örn: 850.00"
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Harcama Tarihi *</label>
                <input
                  type="date"
                  required
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Açıklama / Detay *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Mart ayı asansör periyodik bakım ücreti"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fiş / Fatura / Makbuz No (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Örn: FT-2026-00342"
                  value={expenseForm.receipt_note || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receipt_note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {createExpenseMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Masrafı Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Masraf Kategorileri Yönetimi */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Masraf Kategorileri Yönetimi</h3>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                  setCategoryError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {categoryError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{categoryError}</span>
              </div>
            )}

            {/* Yeni Kategori Ekleme Formu */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) return;
                createCategoryMutation.mutate(newCategoryName.trim());
              }}
              className="flex items-center gap-2 mb-4"
            >
              <input
                type="text"
                required
                placeholder="Yeni kategori adı (örn: Bahçe Bakımı)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <button
                type="submit"
                disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {createCategoryMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Ekle</span>
              </button>
            </form>

            {/* Kategori Listesi */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Kayıtlı Kategoriler ({allExpenseCategories.length})
              </div>

              {allExpenseCategories.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Henüz kategori tanımlanmamış.
                </div>
              ) : (
                allExpenseCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    {editingCategory?.id === cat.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) =>
                            setEditingCategory({ ...editingCategory, name: e.target.value })
                          }
                          className="flex-1 px-2.5 py-1 bg-white border border-blue-400 rounded-lg text-xs"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingCategory.name.trim()) return;
                            updateCategoryMutation.mutate({
                              id: editingCategory.id,
                              name: editingCategory.name.trim(),
                              is_active: editingCategory.is_active,
                            });
                          }}
                          disabled={updateCategoryMutation.isPending}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                        >
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 cursor-pointer"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-xs ${
                              cat.is_active ? 'text-slate-800' : 'text-slate-400 line-through'
                            }`}
                          >
                            {cat.name}
                          </span>
                          {!cat.is_active && (
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-semibold">
                              Pasif
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Aktif/Pasif Toggle Butonu */}
                          <button
                            type="button"
                            onClick={() =>
                              updateCategoryMutation.mutate({
                                id: cat.id,
                                name: cat.name,
                                is_active: !cat.is_active,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                              cat.is_active
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={cat.is_active ? 'Kategoriyi pasife al' : 'Kategoriyi aktifleştir'}
                          >
                            {cat.is_active ? 'Pasife Al' : 'Aktifleştir'}
                          </button>

                          {/* Düzenle Butonu */}
                          <button
                            type="button"
                            onClick={() => setEditingCategory(cat)}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Kategori adını düzenle"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Sil Butonu */}
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `"${cat.name}" kategorisini silmek/kaldırmak istediğinize emin misiniz? Eğer bu kategoriye ait masraflar varsa kategori otomatik olarak pasife alınacaktır.`
                                )
                              ) {
                                deleteCategoryMutation.mutate(cat.id);
                              }
                            }}
                            disabled={deleteCategoryMutation.isPending}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Kategoriyi Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                  setCategoryError(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Devir / Açılış Bakiyesi Belirle */}
      {isInitialBalanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Kasa Devir / Açılış Bakiyesi</h3>
              </div>
              <button
                onClick={() => setIsInitialBalanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Sistemi kullanmaya başlamadan önceki mevcut banka hesabı veya nakit kasa bakiyesini buradan girebilirsiniz.
              Bu tutar, sitenin toplam net kasa bakiyesine devreden başlangıç tutarı olarak dahil edilir.
            </p>

            {initialBalanceError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{initialBalanceError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateInitialBalanceMutation.mutate(initialBalanceForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Açılış / Devir Bakiyesi (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Örn: 15000.00 veya borçlu devir için -2500.00"
                  value={isNaN(initialBalanceForm) ? '' : initialBalanceForm}
                  onChange={(e) => setInitialBalanceForm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Pozitif birikim (örn: 15000) veya kasa açığı/eksi bakiye (örn: -2500) girilebilir.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInitialBalanceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={updateInitialBalanceMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updateInitialBalanceMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Bakiyeyi Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Report Modal */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultType={reportModalType}
        siteName={currentSiteName}
        siteId={siteIdQuery}
      />

      {/* Meter Modals */}
      <MeterTypesModal
        isOpen={isMeterTypesModalOpen}
        onClose={() => setIsMeterTypesModalOpen(false)}
        siteId={siteIdQuery}
      />

      <MeterDistributionModal
        isOpen={isMeterDistModalOpen}
        onClose={() => setIsMeterDistModalOpen(false)}
        siteId={siteIdQuery}
      />

      <MeterDistributionDetailModal
        periodId={selectedPeriodForDetail}
        onClose={() => setSelectedPeriodForDetail(null)}
        siteId={siteIdQuery}
        siteName={currentSiteName}
      />

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => {
          setIsAnnouncementModalOpen(false);
          setSelectedAnnouncementForEdit(null);
        }}
        siteId={siteIdQuery}
        initialData={selectedAnnouncementForEdit}
      />

      {/* Delete Announcement Modal */}
      {announcementToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Duyuruyu Sil
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
              "<strong className="text-slate-700">{announcementToDelete.title}</strong>" başlıklı duyuruyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={deleteAnnouncementMutation.isPending}
                onClick={() => deleteAnnouncementMutation.mutate(announcementToDelete.id)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteAnnouncementMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Duyuruyu Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


