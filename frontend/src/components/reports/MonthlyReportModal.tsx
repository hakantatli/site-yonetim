import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../api/payment';
import { expenseApi } from '../../api/expense';
import {
  Printer,
  X,
  Loader2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Building,
} from 'lucide-react';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'income' | 'expense';
  siteName: string;
  siteId?: string;
}

export function MonthlyReportModal({
  isOpen,
  onClose,
  defaultType = 'income',
  siteName,
  siteId,
}: MonthlyReportModalProps) {
  const [reportType, setReportType] = useState<'income' | 'expense'>(defaultType);

  useEffect(() => {
    if (isOpen) {
      setReportType(defaultType);
    }
  }, [isOpen, defaultType]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Calculate start and end date for selected month
  const { startDate, endDate, monthLabel, periodLabel } = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];
    const monthName = monthNames[month - 1] || '';

    const lastDay = new Date(year, month, 0).getDate();
    const start = `${selectedMonth}-01`;
    const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

    const startFormatted = `01.${String(month).padStart(2, '0')}.${year}`;
    const endFormatted = `${String(lastDay).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;

    return {
      startDate: start,
      endDate: end,
      monthLabel: `${monthName} ${year}`,
      periodLabel: `${startFormatted} — ${endFormatted}`,
    };
  }, [selectedMonth]);

  // Query payments if income report
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['report', 'payments', siteId, startDate, endDate],
    queryFn: () =>
      paymentApi.getPayments({
        siteId,
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: isOpen && reportType === 'income',
  });

  // Query expenses if expense report
  const { data: expenseData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['report', 'expenses', siteId, startDate, endDate],
    queryFn: () =>
      expenseApi.listExpenses(
        {
          start_date: startDate,
          end_date: endDate,
        },
        siteId
      ),
    enabled: isOpen && reportType === 'expense',
  });

  const expenses = expenseData?.expenses || [];
  const isLoading = reportType === 'income' ? isLoadingPayments : isLoadingExpenses;

  // Compute totals
  const totalAmount = useMemo(() => {
    if (reportType === 'income') {
      return payments.reduce((sum, p) => sum + p.amount, 0);
    }
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [reportType, payments, expenses]);

  // Format date helper: YYYY-MM-DD -> DD.MM.YYYY
  const formatDateTR = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header & Controls (Hidden during print) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${reportType === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {reportType === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {reportType === 'income' ? 'Aylık Gelir (Tahsilat) Raporu' : 'Aylık Gider (Masraf) Raporu'}
              </h3>
              <p className="text-[11px] text-slate-500">{siteName} — Yazdırma & PDF Çıktısı</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Rapor Türü Değiştirici */}
            <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setReportType('income')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  reportType === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gelir Raporu
              </button>
              <button
                type="button"
                onClick={() => setReportType('expense')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  reportType === 'expense' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gider Raporu
              </button>
            </div>

            {/* Dönem / Ay Seçici */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-hidden cursor-pointer"
              />
            </div>

            {/* Yazdır Butonu */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
              title="Yazdır veya PDF olarak kaydet"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF</span>
            </button>

            {/* Kapat Butonu */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Preview Area (Scrollable on screen, Full target in @media print) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/50">
          <div
            id="monthly-report-print-area"
            className="bg-white mx-auto max-w-[210mm] min-h-[297mm] p-6 sm:p-10 rounded-xl shadow-md border border-slate-200/80 text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Report Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg border-2 border-slate-900 flex items-center justify-center font-black text-slate-900">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 uppercase">
                      {siteName} YÖNETİMİ
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">Site Yönetim Kurulu Mali Raporu</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-bold font-mono">
                    {monthLabel.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Tarih: {new Date().toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                  {reportType === 'income' ? 'AYLIK GELİR (TAHSİLAT) RAPORU' : 'AYLIK GİDER (MASRAF) RAPORU'}
                </h2>
                <span className="text-xs font-medium text-slate-600">
                  Rapor Dönemi: {periodLabel}
                </span>
              </div>
            </div>

            {/* Table Area */}
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
                <span className="text-xs font-medium">Rapor verileri hazırlanıyor...</span>
              </div>
            ) : reportType === 'income' && payments.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs italic">
                {monthLabel} dönemine ait kayıtlı tahsilat / gelir bulunamadı.
              </div>
            ) : reportType === 'expense' && expenses.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs italic">
                {monthLabel} dönemine ait kayıtlı harcama / masraf bulunamadı.
              </div>
            ) : (
              <div>
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-50 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-12 text-center border-b border-slate-300">No</th>
                      <th className="py-2.5 px-3 w-28 text-left border-b border-slate-300">Tarih</th>
                      <th className="py-2.5 px-3 text-left border-b border-slate-300">İşlem Detayı</th>
                      <th className="py-2.5 px-3 w-32 text-right border-b border-slate-300">Meblağ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportType === 'income' &&
                      payments.map((p, idx) => {
                        const aptText = `Daire ${p.block_name ? p.block_name + ' ' : ''}No: ${p.door_number}`;
                        const debtLabel =
                          p.debt_type === 'routine'
                            ? `Aidat${p.debt_due_month ? ` (${p.debt_due_month})` : ''}`
                            : p.debt_type === 'fixture'
                            ? 'Demirbaş'
                            : 'Ortak Gider';
                        const methodText = p.payment_method === 'cash' ? 'Nakit' : 'Banka/Havale';

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                              {formatDateTR(p.payment_date)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">
                              <span className="font-bold text-slate-900">{aptText}</span>
                              <span className="text-slate-600"> — {p.debtor_full_name}</span>
                              <span className="text-slate-500"> ({debtLabel} — {methodText}{p.notes ? ` — Not: ${p.notes}` : ''})</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                              ₺{p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}

                    {reportType === 'expense' &&
                      expenses.map((exp, idx) => {
                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                              {formatDateTR(exp.expense_date)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">
                              <span className="font-bold text-slate-900">[{exp.category_name}]</span>{' '}
                              <span>{exp.description || 'Masraf kaydı'}</span>
                              {exp.receipt_note && (
                                <span className="text-slate-500 font-mono text-[11px]">
                                  {' '}(Fiş/Makbuz No: {exp.receipt_note})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                              ₺{exp.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-slate-900">
                      <td colSpan={3} className="py-3 px-3 text-right uppercase text-[11px] tracking-wider">
                        GENEL TOPLAM ({reportType === 'income' ? payments.length : expenses.length} İşlem):
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-sm whitespace-nowrap">
                        ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-8 text-center text-[10px] text-slate-400 italic">
                  İşbu rapor {siteName} kayıtları esas alınarak {new Date().toLocaleString('tr-TR')} tarihinde elektronik ortamda üretilmiştir.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
