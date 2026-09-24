import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { authApi } from '../../api/auth';
import { expenseApi } from '../../api/expense';
import { meterApi } from '../../api/meter';
import { announcementApi } from '../../api/announcement';
import { residentApi } from '../../api/resident';
import {
  Home,
  LogOut,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  History,
  Loader2,
  ShieldCheck,
  Building,
  Landmark,
  Gauge,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Receipt,
  Megaphone,
  CreditCard,
} from 'lucide-react';

export function ResidentDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'debts' | 'treasury' | 'meters' | 'announcements' | 'overview'>('debts');

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    navigate('/login');
  };

  const { data: treasuryData, isLoading: isLoadingTreasury } = useQuery({
    queryKey: ['resident', 'treasury'],
    queryFn: () => expenseApi.getResidentTreasury(),
    enabled: activeTab === 'treasury',
  });

  const { data: meterHistory, isLoading: isLoadingMeters } = useQuery({
    queryKey: ['resident', 'meter-history'],
    queryFn: () => meterApi.getResidentMeterHistory(),
    enabled: activeTab === 'meters',
  });

  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['resident', 'announcements'],
    queryFn: () => announcementApi.getResidentAnnouncements(),
    enabled: activeTab === 'announcements',
  });

  const { data: debts = [], isLoading: isLoadingDebts } = useQuery({
    queryKey: ['resident', 'debts'],
    queryFn: () => residentApi.getResidentDebts(),
    enabled: activeTab === 'debts',
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['resident', 'payments'],
    queryFn: () => residentApi.getResidentPayments(),
    enabled: activeTab === 'debts',
  });

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'resident':
        return 'Sakin (Kat Maliki / Kiracı)';
      case 'admin':
        return 'Site Yöneticisi';
      case 'owner':
        return 'Sistem Yöneticisi (Owner)';
      default:
        return 'Sakin';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">Sakin Portalı</h1>
              <p className="text-[11px] text-slate-400">Site Yönetim & Şeffaf Kasa</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{user?.full_name}</span>
              <span className="text-[11px] text-emerald-600 font-medium">{getRoleLabel(user?.role)}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold py-1.5 px-3 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Hoş Geldiniz Kartı */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Şeffaf ve Güvenilir Yönetim</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Hoş Geldiniz, {user?.full_name}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
                Sitenizin gelir ve giderlerini, yapılan ortak harcamaları ve kasa durumunu şeffaf bir şekilde bu ekrandan 7/24 takip edebilirsiniz.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('debts')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'debts'
                    ? 'bg-white text-emerald-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Borç & Ödemelerim</span>
              </button>
              <button
                onClick={() => setActiveTab('treasury')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'treasury'
                    ? 'bg-white text-emerald-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Şeffaf Kasa</span>
              </button>
              <button
                onClick={() => setActiveTab('meters')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'meters'
                    ? 'bg-white text-emerald-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Gauge className="w-4 h-4" />
                <span>Sayaç & Tüketim</span>
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'announcements'
                    ? 'bg-white text-emerald-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Megaphone className="w-4 h-4" />
                <span>Duyurular</span>
                {announcements.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      activeTab === 'announcements'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {announcements.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-white text-emerald-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Bilgilendirme</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 0: Borç & Ödemelerim */}
        {activeTab === 'debts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Açık Borçlar */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <CreditCard className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-slate-900">Açık Borçlarım</h3>
                </div>
                {isLoadingDebts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : debts.filter((d) => d.status !== 'paid').length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-50" />
                    <p className="text-sm">Hiç açık borcunuz bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {debts
                      .filter((d) => d.status !== 'paid')
                      .map((debt) => (
                        <div key={debt.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-bold text-slate-800 text-sm block">
                                {debt.type === 'monthly_due' ? 'Aidat Borcu' : debt.type === 'utility' ? 'Sayaç/Fatura Borcu' : 'Ek Borç / Demirbaş'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {debt.due_month && `${debt.due_month.substring(0, 7)} Dönemi`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-rose-600">
                                ₺{debt.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          {debt.description && (
                            <p className="text-xs text-slate-600 mb-3">{debt.description}</p>
                          )}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                              <span>₺{debt.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ödendi</span>
                              <span>₺{debt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} toplam</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min((debt.paid_amount / debt.amount) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Geçmiş Ödemeler */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <History className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900">Geçmiş Ödemelerim</h3>
                </div>
                {isLoadingPayments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm">Henüz bir ödeme geçmişiniz bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${payment.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 text-xs block">
                              {payment.debt_description || (payment.debt_type === 'monthly_due' ? 'Aidat Ödemesi' : 'Ödeme')}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(payment.payment_date).toLocaleDateString('tr-TR')} • {payment.payment_method === 'cash' ? 'Nakit' : 'Havale/EFT'}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-600 text-sm font-mono">
                          ₺{payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Şeffaf Kasa */}
        {activeTab === 'treasury' && (
          <div className="space-y-6">
            {isLoadingTreasury ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200 p-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
                <span className="text-sm font-medium">Şeffaf kasa verileri yükleniyor...</span>
              </div>
            ) : (
              <>
                {/* Kasa Metrik Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Net Kasa Bakiyesi */}
                  <div
                    className={`p-6 rounded-3xl border shadow-xs ${
                      (treasuryData?.net_balance ?? 0) >= 0
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-rose-600 text-white border-rose-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                        Net Kasa Bakiyesi
                      </span>
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
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Açılış / Devir Bakiyesi
                      </span>
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                        <Landmark className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      ₺{treasuryData ? treasuryData.initial_balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                      <span>Başlangıç Durumu:</span>
                      <span className="text-[11px] font-medium text-slate-400">Devreden Bakiye</span>
                    </div>
                  </div>

                  {/* Toplam Gelir */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Toplam Aidat & Gelir
                      </span>
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
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Toplam Harcama & Masraf
                      </span>
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
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-900 text-sm">Giderlerin Kategori Dağılımı</h4>
                      </div>
                    </div>

                    {!treasuryData?.category_breakdown || treasuryData.category_breakdown.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Henüz kategorize edilmiş masraf kaydı bulunmamaktadır.
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
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Aylık Nakit Akışı Geçmişi Tablosu (2 Kolon) */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-teal-600" />
                        <h4 className="font-bold text-slate-900 text-sm">Aylık Nakit Akışı Özeti</h4>
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
                              <th className="px-4 py-2.5">Toplam Gelir</th>
                              <th className="px-4 py-2.5">Toplam Gider</th>
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

        {/* Tab 2: Sayaç & Tüketim */}
        {activeTab === 'meters' && (
          <div className="space-y-6">
            {isLoadingMeters ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200 p-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
                <span className="text-sm font-medium">Sayaç ve tüketim geçmişi yükleniyor...</span>
              </div>
            ) : !meterHistory || meterHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Gauge className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Sayaç Okuma Kaydı Bulunamadı</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Daireniz için henüz sisteme işlenmiş bir sayaç okuma veya tüketim faturası dağıtımı bulunmamaktadır.
                </p>
              </div>
            ) : (
              <>
                {/* Metrik Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Toplam Tüketim Borcu
                      </span>
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                        <Receipt className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      ₺{meterHistory.reduce((sum, item) => sum + item.total_amount, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Dairenize yansıtılan toplam sayaç payı</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Son Okuma Dönemi
                      </span>
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                      {meterHistory[0]?.period || '-'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{meterHistory[0]?.meter_type_name || '-'}</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Toplam Okuma Sayısı
                      </span>
                      <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                        <Gauge className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      {meterHistory.length} <span className="text-sm font-medium text-slate-400">dönem</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Sisteme işlenen fatura dökümü</p>
                  </div>
                </div>

                {/* Dönemler Listesi */}
                <div className="space-y-4">
                  {meterHistory.map((item) => {
                    const isPaid = item.debt_status === 'paid';
                    const isPartial = item.debt_status === 'partial';

                    return (
                      <div
                        key={item.reading_id}
                        className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                      >
                        {/* Başlık Satırı */}
                        <div className="p-5 bg-slate-50/75 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-xs">
                              <Gauge className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">{item.meter_type_name}</h4>
                                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-semibold">
                                  {item.period}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Okuma Tarihi: {new Date(item.reading_date).toLocaleDateString('tr-TR')}
                                {item.bill_no && ` • Fatura No: ${item.bill_no}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                Dairenize Düşen Toplam
                              </span>
                              <span className="text-lg font-black text-emerald-700 font-mono">
                                ₺{item.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Ödendi
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800">
                                <Clock className="w-3.5 h-3.5" />
                                Kısmi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Ödenmedi
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detaylar Grid */}
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Daire Sayaç Bilgileri */}
                          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-2.5">
                            <div className="flex items-center gap-2 text-emerald-900 font-bold border-b border-emerald-100 pb-2">
                              <Gauge className="w-4 h-4 text-emerald-600" />
                              <span>Dairenizin Tüketim Hesabı</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>İlk Endeks:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {item.previous_reading.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.meter_type_unit}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Son Endeks:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {item.current_reading.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.meter_type_unit}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700 font-medium">
                              <span>Daire Tüketimi:</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {item.consumption.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.meter_type_unit}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 border-t border-emerald-100/60 pt-2">
                              <span>Birim Fiyat:</span>
                              <span className="font-mono text-slate-700">
                                ₺{item.unit_cost.toLocaleString('tr-TR', { minimumFractionDigits: 4 })} / {item.meter_type_unit}
                              </span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-slate-900 pt-1">
                              <span>Daire Tüketim Bedeli:</span>
                              <span className="font-mono text-emerald-700">
                                ₺{item.individual_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Bina & Ortak Alan Bilgileri */}
                          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/80 space-y-2.5">
                            <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-blue-100 pb-2">
                              <Building className="w-4 h-4 text-blue-600" />
                              <span>Bina Faturası & Ortak Alan Payı</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Bina Toplam Faturası:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                ₺{item.total_bill_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Faturadaki Toplam Tüketim:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {item.total_billed_consumption.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.meter_type_unit}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Bina Ortak Alan Tüketimi:</span>
                              <span className="font-mono font-semibold text-blue-700">
                                {item.common_area_consumption.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.meter_type_unit}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 border-t border-blue-100/60 pt-2">
                              <span>Ortak Alan Durumu:</span>
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {item.common_area_amount > 0 ? `Daireye yansıtıldı: ₺${item.common_area_amount.toFixed(2)}` : 'Site Yönetimi Karşılar (0 ₺)'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-slate-900 pt-1">
                              <span>Dairenize Yansıyan Pay:</span>
                              <span className="font-mono text-blue-700">
                                {item.common_area_amount > 0 ? `+₺${item.common_area_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '₺0,00 (Daireye eklenmez)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Alt Açıklama */}
                        <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {item.common_area_amount > 0
                                ? 'Formül: (Daire Tüketimi × Birim Fiyat) + Ortak Alan Payı = Toplam Tahakkuk'
                                : 'Formül: Daire Tüketimi × Birim Fiyat = Tahakkuk Eden Borç (Ortak alan site yönetimine aittir)'}
                            </span>
                          </div>
                          <span className="font-mono text-slate-700 font-semibold">
                            {item.common_area_amount > 0
                              ? `₺${item.individual_amount.toFixed(2)} + ₺${item.common_area_amount.toFixed(2)} = ₺${item.total_amount.toFixed(2)}`
                              : `₺${item.individual_amount.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Duyurular */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            {isLoadingAnnouncements ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200 p-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
                <span className="text-sm font-medium">Duyurular yükleniyor...</span>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Henüz Duyuru Bulunmuyor</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Siteniz için yöneticiniz tarafından henüz yayınlanmış bir duyuru veya bilgilendirme bulunmamaktadır.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Acil Durum Uyarısı */}
                {announcements.some((a) => a.priority === 'urgent') && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <strong className="block font-bold">Önemli Bildirim!</strong>
                      <span>Sitenizde acil olarak incelenmesi gereken duyuru bulunmaktadır. Lütfen aşağıdaki detayları okuyunuz.</span>
                    </div>
                  </div>
                )}

                {/* Duyurular Listesi */}
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className={`bg-white rounded-3xl border shadow-xs overflow-hidden transition-all ${
                      a.priority === 'urgent'
                        ? 'border-rose-200 ring-2 ring-rose-500/10'
                        : a.priority === 'important'
                        ? 'border-amber-200 ring-2 ring-amber-500/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/40">
                      <div className="flex items-center gap-2.5">
                        {a.priority === 'urgent' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Acil Duyuru
                          </span>
                        ) : a.priority === 'important' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Önemli
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                            <Info className="w-3.5 h-3.5" />
                            Bilgilendirme
                          </span>
                        )}
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                          {a.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] self-end sm:self-auto">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(a.published_at).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 sm:p-6">
                      <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-100/80">
                        {a.content}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span>Yayınlayan:</span>
                        <strong className="text-slate-800 font-semibold">
                          {a.author_name || 'Site Yöneticisi'}
                        </strong>
                      </div>
                      <span className="text-emerald-700 font-medium text-[10px]">
                        Site Yönetimi Resmi Duyurusu
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Bilgilendirme */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Sakin Portalı Hakkında</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bu portal üzerinden sitenize ait güncel mali durumu ve duyuruları şeffaf bir şekilde inceleyebilirsiniz.
              Yöneticiniz tarafından tahsil edilen tüm aidat gelirleri ve bina adına yapılan harcamalar ile duyurular sisteme anlık olarak işlenmektedir.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
