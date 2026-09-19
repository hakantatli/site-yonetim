import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meterApi } from '../../api/meter';
import { adminApi } from '../../api/admin';
import type { CreateConsumptionPeriodPayload, ReadingInput } from '../../types/meter';
import {
  X,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Building,
  Loader2,
} from 'lucide-react';

interface MeterDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId?: string;
}

interface AptRowState {
  apartmentId: string;
  doorNumber: string;
  blockName?: string | null;
  debtorName: string;
  previousReading: number;
  currentReading: number;
  notes?: string;
}

export function MeterDistributionModal({ isOpen, onClose, siteId }: MeterDistributionModalProps) {
  const queryClient = useQueryClient();

  // Period state (default current month)
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Meter type state
  const [meterTypeId, setMeterTypeId] = useState<string>('');

  // Main meter & bill fields
  const [mainMeterPrevious, setMainMeterPrevious] = useState<number>(0);
  const [mainMeterCurrent, setMainMeterCurrent] = useState<number>(0);
  const [totalBillAmount, setTotalBillAmount] = useState<number>(0);
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [billNo, setBillNo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Apartment readings state
  const [aptRows, setAptRows] = useState<AptRowState[]>([]);

  // 1. Fetch active meter types
  const { data: meterTypes = [] } = useQuery({
    queryKey: ['admin', 'meter-types', siteId],
    queryFn: () => meterApi.listMeterTypes(false, siteId),
    enabled: isOpen,
  });

  // Default select first meter type
  useEffect(() => {
    if (meterTypes.length > 0 && !meterTypeId) {
      setMeterTypeId(meterTypes[0].id);
    }
  }, [meterTypes, meterTypeId]);

  const selectedMeterType = useMemo(() => {
    return meterTypes.find((t) => t.id === meterTypeId);
  }, [meterTypes, meterTypeId]);

  const unit = selectedMeterType?.unit || 'm³';

  // 2. Fetch active apartments
  const { data: apartments = [] } = useQuery({
    queryKey: ['admin', 'apartments', siteId],
    queryFn: () => adminApi.listApartments(siteId),
    enabled: isOpen,
  });

  // 3. Fetch previous readings for selected meter type
  const { data: prevData } = useQuery({
    queryKey: ['admin', 'meter-previous-readings', siteId, meterTypeId],
    queryFn: () => meterApi.getPreviousReadings(meterTypeId, siteId),
    enabled: isOpen && !!meterTypeId,
  });

  // Initialize or update apartment rows when apartments or prevData change
  useEffect(() => {
    if (!isOpen || apartments.length === 0) return;

    // Set main meter previous reading if available
    if (prevData?.main_meter_previous !== undefined) {
      setMainMeterPrevious(prevData.main_meter_previous);
    }

    const prevMap = new Map<string, number>();
    if (prevData?.apartments) {
      for (const p of prevData.apartments) {
        prevMap.set(p.apartment_id, p.last_reading);
      }
    }

    const initialRows: AptRowState[] = apartments
      .filter((apt) => apt.is_active)
      .map((apt) => {
        const lastReading = prevMap.get(apt.id) ?? 0;
        let debtor = 'Tanımsız';
        if (apt.tenant_full_name) {
          debtor = `${apt.tenant_full_name} (Kiracı)`;
        } else if (apt.owner_full_name) {
          debtor = `${apt.owner_full_name} (Ev Sahibi)`;
        }

        return {
          apartmentId: apt.id,
          doorNumber: apt.door_number,
          blockName: apt.block_name,
          debtorName: debtor,
          previousReading: lastReading,
          currentReading: lastReading, // default current = previous (0 consumption initially)
          notes: '',
        };
      });

    setAptRows(initialRows);
  }, [isOpen, apartments, prevData]);

  // Calculations
  const totalBilledConsumption = useMemo(() => {
    return Math.max(0, Math.round((mainMeterCurrent - mainMeterPrevious) * 1000) / 1000);
  }, [mainMeterCurrent, mainMeterPrevious]);

  const unitCost = useMemo(() => {
    if (totalBilledConsumption <= 0 || totalBillAmount <= 0) return 0;
    return totalBillAmount / totalBilledConsumption;
  }, [totalBilledConsumption, totalBillAmount]);

  const totalApartmentsConsumption = useMemo(() => {
    return aptRows.reduce((sum, r) => {
      const c = Math.max(0, r.currentReading - r.previousReading);
      return sum + c;
    }, 0);
  }, [aptRows]);

  const commonAreaConsumption = useMemo(() => {
    return Math.max(0, Math.round((totalBilledConsumption - totalApartmentsConsumption) * 1000) / 1000);
  }, [totalBilledConsumption, totalApartmentsConsumption]);

  const commonAreaCost = useMemo(() => {
    return Math.round(commonAreaConsumption * unitCost * 100) / 100;
  }, [commonAreaConsumption, unitCost]);

  const commonAreaPerApartment = useMemo(() => {
    if (aptRows.length === 0) return 0;
    return commonAreaCost / aptRows.length;
  }, [commonAreaCost, aptRows.length]);

  const isExceeding = totalApartmentsConsumption > totalBilledConsumption;

  // Handle apartment reading change
  const handleCurrentReadingChange = (index: number, val: number) => {
    setAptRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], currentReading: val };
      return next;
    });
  };

  const handlePreviousReadingChange = (index: number, val: number) => {
    setAptRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], previousReading: val };
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateConsumptionPeriodPayload) =>
      meterApi.createConsumptionPeriod(payload, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'consumption-periods', siteId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'debts', siteId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'meter-previous-readings', siteId] });
      onClose();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'Fatura dağıtılırken hata oluştu');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!meterTypeId) {
      setFormError('Lütfen bir sayaç türü seçiniz');
      return;
    }
    if (totalBillAmount <= 0) {
      setFormError('Lütfen geçerli bir fatura tutarı giriniz');
      return;
    }
    if (totalBilledConsumption <= 0) {
      setFormError('Ana sayaç son endeksi ilk endeksten büyük olmalıdır');
      return;
    }
    if (isExceeding) {
      setFormError('Dairelerin toplam tüketimi ana sayaç fatura tüketiminden fazla olamaz');
      return;
    }

    const readings: ReadingInput[] = aptRows.map((r) => ({
      apartment_id: r.apartmentId,
      previous_reading: r.previousReading,
      current_reading: r.currentReading,
      notes: r.notes || undefined,
    }));

    const payload: CreateConsumptionPeriodPayload = {
      meter_type_id: meterTypeId,
      period,
      main_meter_previous: mainMeterPrevious,
      main_meter_current: mainMeterCurrent,
      total_bill_amount: totalBillAmount,
      bill_date: billDate || undefined,
      bill_no: billNo.trim() || undefined,
      description: description.trim() || undefined,
      readings,
    };

    if (
      window.confirm(
        `₺${totalBillAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} tutarındaki fatura ` +
          `${aptRows.length} daireye tüketim oranında dağıtılacak ve borç tahakkukları oluşturulacaktır. Onaylıyor musunuz?`
      )
    ) {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Sayaç Okuma ve Tüketime Dayalı Fatura Dağıtımı
              </h3>
              <p className="text-[11px] text-slate-500">
                Ana sayaç, süzme sayaçlar ve ortak alan tüketim paylaştırma sihirbazı
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{formError}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pt-4 pr-1">
          {/* Bölüm 1: Sayaç & Fatura Üst Bilgileri */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sayaç / Hizmet Türü *
                </label>
                <select
                  value={meterTypeId}
                  onChange={(e) => setMeterTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {meterTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fatura Dönemi (Ay) *
                </label>
                <input
                  type="month"
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kurum Fatura Tutarı (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Örn: 4850.50"
                  value={totalBillAmount || ''}
                  onChange={(e) => setTotalBillAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Ana Sayaç Endeksleri & Detaylar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ana Sayaç İlk Endeks ({unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={mainMeterPrevious || 0}
                  onChange={(e) => setMainMeterPrevious(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ana Sayaç Son Endeks ({unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="Faturadaki son endeks"
                  value={mainMeterCurrent || ''}
                  onChange={(e) => setMainMeterCurrent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fatura / Abone No (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: FTR-2026-99"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fatura Tarihi (Opsiyonel)
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Açıklama / Fatura Notu (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Eylül ayı su faturası ve ortak alan dağıtımı"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Anlık Hesaplama Özet Rozetleri */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Ana Fatura Tüketimi</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {totalBilledConsumption.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {unit}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Birim Fiyat</span>
                <span className="text-sm font-bold text-indigo-600 font-mono">
                  ₺{unitCost.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / {unit}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Dairelerin Tüketimi</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">
                  {totalApartmentsConsumption.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {unit}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border shadow-2xs ${
                  isExceeding
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-white border-slate-200/80 text-slate-900'
                }`}
              >
                <span className="text-[10px] text-slate-500 font-medium block">Ortak Alan Farkı</span>
                <span className="text-sm font-bold font-mono">
                  {commonAreaConsumption.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {unit}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  (Daire başı: ₺{commonAreaPerApartment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                </span>
              </div>
            </div>

            {isExceeding && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>
                  <strong>Dikkat:</strong> Dairelerin toplam süzme sayaç tüketimi ({totalApartmentsConsumption} {unit}),
                  ana sayaç faturasındaki tüketimden ({totalBilledConsumption} {unit}) fazladır! Lütfen endeks girişlerini kontrol ediniz.
                </span>
              </div>
            )}
          </div>

          {/* Bölüm 2: Daireler Sayaç Okuma Tablosu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-500" />
                <span>Daire Sayaç Okumaları ({aptRows.length} Daire)</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Önceki ay son endeksleri otomatik doldurulmuştur.
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Daire No</th>
                      <th className="py-2.5 px-3">Sakin / Muhatap</th>
                      <th className="py-2.5 px-3 w-28">İlk Endeks ({unit})</th>
                      <th className="py-2.5 px-3 w-32">Son Endeks ({unit})</th>
                      <th className="py-2.5 px-3 text-right">Tüketim</th>
                      <th className="py-2.5 px-3 text-right">Bireysel Pay</th>
                      <th className="py-2.5 px-3 text-right">Ortak Alan</th>
                      <th className="py-2.5 px-3 text-right">Toplam Borç</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {aptRows.map((row, idx) => {
                      const consumption = Math.max(0, row.currentReading - row.previousReading);
                      const individualAmount = Math.round(consumption * unitCost * 100) / 100;
                      const commonAmount = Math.round(commonAreaPerApartment * 100) / 100;
                      const totalDebt = individualAmount + commonAmount;

                      return (
                        <tr key={row.apartmentId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {row.blockName ? `${row.blockName} ` : ''}No: {row.doorNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                            {row.debtorName}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.001"
                              value={row.previousReading}
                              onChange={(e) =>
                                handlePreviousReadingChange(idx, parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.001"
                              placeholder="Güncel endeks"
                              value={row.currentReading}
                              onChange={(e) =>
                                handleCurrentReadingChange(idx, parseFloat(e.target.value) || 0)
                              }
                              className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                                row.currentReading < row.previousReading
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : 'bg-white border-blue-200 text-blue-900 focus:border-blue-500'
                              }`}
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                            {consumption.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            ₺{individualAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            ₺{commonAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            ₺{totalDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 shrink-0">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Fatura Eşleşmesi:</span>{' '}
              {totalBillAmount > 0 && !isExceeding && totalBilledConsumption > 0 ? (
                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Kuruşu kuruşuna ₺
                  {totalBillAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} faturayla eşleşti
                </span>
              ) : (
                <span className="text-slate-400 italic">Gerekli endeks ve fatura tutarını giriniz</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || isExceeding || totalBillAmount <= 0 || totalBilledConsumption <= 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs transition-colors"
              >
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Faturayı Dağıt ve Borçları Oluştur</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
