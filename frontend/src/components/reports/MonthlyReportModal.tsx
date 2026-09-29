import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      document.body.classList.add('monthly-report-open');
    } else {
      document.body.classList.remove('monthly-report-open');
    }
    return () => {
      document.body.classList.remove('monthly-report-open');
    };
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

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const formattedIncomeRows = useMemo(() => {
    return payments.map((p, idx) => {
      const aptText = `Daire ${p.block_name ? p.block_name + ' ' : ''}No: ${p.door_number}`;
      const debtorName =
        p.debtor_full_name && !p.debtor_full_name.startsWith('Sistem Sahibi')
          ? p.debtor_full_name
          : 'Hakan Tatlı';

      let debtLabel = 'Diğer Ödeme';
      if (p.debt_type === 'monthly_due' || p.debt_type === 'routine') {
        debtLabel = 'Aidat Ödemesi';
      } else if (p.debt_type === 'utility') {
        if (p.debt_description) {
          const match = p.debt_description.match(
            /^(?:\d{2}\/\d{4}\s+|\d{4}-\d{2}\s+)?(.+?)\s+Tüketim Bedeli/i
          );
          if (match && match[1]) {
            const meterName = match[1].trim();
            debtLabel = /fatura|ödeme/i.test(meterName) ? meterName : `${meterName} Faturası`;
          } else {
            debtLabel = p.debt_description;
          }
        } else {
          debtLabel = 'Fatura Ödemesi';
        }
      } else if (p.debt_type === 'fixture') {
        debtLabel = p.debt_description ? `Demirbaş — ${p.debt_description}` : 'Demirbaş Ödemesi';
      } else if (p.debt_type === 'investment') {
        debtLabel = p.debt_description ? `Yatırım — ${p.debt_description}` : 'Yatırım Ödemesi';
      } else if (p.debt_description) {
        debtLabel = p.debt_description;
      }

      let noteText = p.notes || '';
      if (
        p.debt_total_amount > 0 &&
        p.amount < p.debt_total_amount &&
        !noteText.includes('Eksik Ödeme')
      ) {
        const shortfall = p.debt_total_amount - p.amount;
        const shortfallTag = `[Eksik Ödeme: ₺${shortfall.toFixed(2)}]`;
        noteText = noteText ? `${shortfallTag} ${noteText}` : shortfallTag;
      }

      return {
        id: p.id,
        no: idx + 1,
        date: formatDateTR(p.payment_date),
        aptText,
        debtorName,
        detailSub: `${debtLabel}${noteText ? ` — Not: ${noteText}` : ''}`,
        amountFormatted: `₺${p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      };
    });
  }, [payments]);

  const formattedExpenseRows = useMemo(() => {
    return expenses.map((exp, idx) => ({
      id: exp.id,
      no: idx + 1,
      date: formatDateTR(exp.expense_date),
      category: `[${exp.category_name}]`,
      description: exp.description || 'Masraf kaydı',
      receipt: exp.receipt_note ? `(Fiş/Makbuz No: ${exp.receipt_note})` : '',
      amountFormatted: `₺${exp.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
    }));
  }, [expenses]);

  const handlePrint = () => {
    const existingFrame = document.getElementById('monthly-report-print-iframe');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'monthly-report-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      window.print();
      return;
    }

    const reportTitle =
      reportType === 'income'
        ? 'AYLIK GELİR (TAHSİLAT) RAPORU'
        : 'AYLIK GİDER (MASRAF) RAPORU';
    const totalFormatted = `₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    const totalCount = reportType === 'income' ? formattedIncomeRows.length : formattedExpenseRows.length;
    const todayStr = new Date().toLocaleDateString('tr-TR');
    const nowFullStr = new Date().toLocaleString('tr-TR');

    let bodyHtml = '';
    if (reportType === 'income' && formattedIncomeRows.length === 0) {
      bodyHtml = `<div class="empty">${escapeHtml(monthLabel)} dönemine ait kayıtlı tahsilat / gelir bulunamadı.</div>`;
    } else if (reportType === 'expense' && formattedExpenseRows.length === 0) {
      bodyHtml = `<div class="empty">${escapeHtml(monthLabel)} dönemine ait kayıtlı harcama / masraf bulunamadı.</div>`;
    } else {
      const rowsHtml =
        reportType === 'income'
          ? formattedIncomeRows
              .map(
                (r) => `
              <tr>
                <td class="col-no">${r.no}</td>
                <td class="col-date">${escapeHtml(r.date)}</td>
                <td class="col-detail">
                  <strong>${escapeHtml(r.aptText)}</strong>
                  <span class="debtor"> — ${escapeHtml(r.debtorName)}</span>
                  <span class="sub"> (${escapeHtml(r.detailSub)})</span>
                </td>
                <td class="col-amount">${escapeHtml(r.amountFormatted)}</td>
              </tr>`
              )
              .join('')
          : formattedExpenseRows
              .map(
                (r) => `
              <tr>
                <td class="col-no">${r.no}</td>
                <td class="col-date">${escapeHtml(r.date)}</td>
                <td class="col-detail">
                  <strong>${escapeHtml(r.category)}</strong> ${escapeHtml(r.description)}
                  ${r.receipt ? `<span class="sub"> ${escapeHtml(r.receipt)}</span>` : ''}
                </td>
                <td class="col-amount">${escapeHtml(r.amountFormatted)}</td>
              </tr>`
              )
              .join('');

      bodyHtml = `
        <table>
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-date">Tarih</th>
              <th class="col-detail">İşlem Detayı</th>
              <th class="col-amount">Meblağ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="tfoot-label">GENEL TOPLAM (${totalCount} İşlem):</td>
              <td class="tfoot-amount">${escapeHtml(totalFormatted)}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer-note">
          İşbu rapor ${escapeHtml(siteName)} kayıtları esas alınarak ${escapeHtml(nowFullStr)} tarihinde elektronik ortamda üretilmiştir.
        </div>
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(siteName)} - ${escapeHtml(reportTitle)} (${escapeHtml(monthLabel)})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 8px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      border: 2px solid #0f172a;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      margin: 0;
    }
    .meta {
      text-align: right;
    }
    .month-badge {
      display: inline-block;
      padding: 3px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .meta-date {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .report-title-wrap {
      text-align: center;
      padding-top: 6px;
    }
    .report-title {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .report-period {
      font-size: 11px;
      font-weight: 500;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    thead tr {
      background: #f8fafc;
      border-bottom: 2px solid #0f172a;
    }
    th {
      padding: 8px 10px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #1e293b;
      border-bottom: 1px solid #cbd5e1;
    }
    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 8px 10px;
      vertical-align: top;
      color: #1e293b;
    }
    .col-no {
      width: 44px;
      text-align: center;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #475569;
    }
    .col-date {
      width: 96px;
      text-align: left;
      white-space: nowrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #334155;
    }
    .col-detail {
      text-align: left;
    }
    .col-detail strong {
      color: #0f172a;
      font-weight: 700;
    }
    .col-detail .debtor {
      color: #475569;
    }
    .col-detail .sub {
      color: #64748b;
    }
    .col-amount {
      width: 115px;
      text-align: right;
      white-space: nowrap;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0f172a;
    }
    tfoot tr {
      background: #f8fafc;
      border-top: 2px solid #0f172a;
      font-weight: 700;
      color: #0f172a;
    }
    .tfoot-label {
      padding: 10px;
      text-align: right;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .tfoot-amount {
      padding: 10px;
      text-align: right;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 900;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .footer-note {
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }
    .empty {
      padding: 48px 0;
      text-align: center;
      color: #94a3b8;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div class="brand">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
          </svg>
        </div>
        <div>
          <h1 class="brand-title">${escapeHtml(siteName)} YÖNETİMİ</h1>
          <p class="brand-sub">Site Yönetim Kurulu Mali Raporu</p>
        </div>
      </div>
      <div class="meta">
        <div class="month-badge">${escapeHtml(monthLabel.toUpperCase())}</div>
        <div class="meta-date">Tarih: ${escapeHtml(todayStr)}</div>
      </div>
    </div>
    <div class="report-title-wrap">
      <h2 class="report-title">${escapeHtml(reportTitle)}</h2>
      <div class="report-period">Rapor Dönemi: ${escapeHtml(periodLabel)}</div>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      id="monthly-report-modal-root"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:bg-white print:block print:p-0 print:overflow-visible"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 my-4 flex flex-col max-h-[92vh] overflow-hidden print:max-w-none print:max-h-none print:my-0 print:rounded-none print:shadow-none print:border-none print:overflow-visible print:block">
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

        {/* Paper Preview Area */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/50 print:p-0 print:overflow-visible print:bg-white print:block">
          <div
            id="monthly-report-print-area"
            className="bg-white mx-auto max-w-[210mm] p-6 sm:p-10 rounded-xl shadow-md border border-slate-200/80 text-slate-900 font-sans print:max-w-none print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0"
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
            ) : reportType === 'income' && formattedIncomeRows.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs italic">
                {monthLabel} dönemine ait kayıtlı tahsilat / gelir bulunamadı.
              </div>
            ) : reportType === 'expense' && formattedExpenseRows.length === 0 ? (
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
                      formattedIncomeRows.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                            {r.no}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <span className="font-bold text-slate-900">{r.aptText}</span>
                            <span className="text-slate-600"> — {r.debtorName}</span>
                            <span className="text-slate-500"> ({r.detailSub})</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                            {r.amountFormatted}
                          </td>
                        </tr>
                      ))}

                    {reportType === 'expense' &&
                      formattedExpenseRows.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                            {r.no}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <span className="font-bold text-slate-900">{r.category}</span>{' '}
                            <span>{r.description}</span>
                            {r.receipt && (
                              <span className="text-slate-500 font-mono text-[11px]">
                                {' '}{r.receipt}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                            {r.amountFormatted}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-slate-900">
                      <td colSpan={3} className="py-3 px-3 text-right uppercase text-[11px] tracking-wider">
                        GENEL TOPLAM ({reportType === 'income' ? formattedIncomeRows.length : formattedExpenseRows.length} İşlem):
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
    </div>,
    document.body
  );
}
