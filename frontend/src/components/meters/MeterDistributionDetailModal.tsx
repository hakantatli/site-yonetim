import { useQuery } from '@tanstack/react-query';
import { meterApi } from '../../api/meter';
import {
  X,
  Gauge,
  Loader2,
  Printer,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface MeterDistributionDetailModalProps {
  periodId: string | null;
  onClose: () => void;
  siteId?: string;
  siteName: string;
}

export function MeterDistributionDetailModal({
  periodId,
  onClose,
  siteId,
  siteName,
}: MeterDistributionDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'consumption-period-detail', siteId, periodId],
    queryFn: () => meterApi.getConsumptionPeriod(periodId!, siteId),
    enabled: !!periodId,
  });

  if (!periodId) return null;

  const period = data?.period;
  const readings = data?.readings || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Fatura Dağıtım ve Sayaç Dökümü
              </h3>
              <p className="text-[11px] text-slate-500">
                {siteName} — {period?.meter_type_name} ({period?.period})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Yazdır</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Detaylar yükleniyor...</span>
          </div>
        ) : period ? (
          <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
            {/* Fatura ve Ana Sayaç Özet Kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Hizmet Türü</span>
                <span className="font-bold text-slate-900">{period.meter_type_name}</span>
                <span className="text-[10px] text-slate-400 block font-mono">Birim: {period.meter_type_unit}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Fatura Tutarı</span>
                <span className="font-extrabold text-slate-900 font-mono text-sm">
                  ₺{period.total_bill_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                {period.bill_no && (
                  <span className="text-[10px] text-slate-500 block">No: {period.bill_no}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Birim Fiyat</span>
                <span className="font-bold text-indigo-600 font-mono">
                  ₺{period.unit_cost.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / {period.meter_type_unit}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Fatura: {period.total_billed_consumption} {period.meter_type_unit}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Ortak Alan (Site Yönetimi)</span>
                <span className="font-bold text-slate-800 font-mono">
                  {period.common_area_consumption} {period.meter_type_unit}
                </span>
                <span className="text-[10px] text-amber-600 block font-mono font-medium">
                  ₺{period.common_area_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (Site Gideri)
                </span>
              </div>
            </div>

            {/* Dairelerin Detay Tablosu */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Daire</th>
                    <th className="py-2.5 px-3">Muhatap</th>
                    <th className="py-2.5 px-3 text-right">İlk Endeks</th>
                    <th className="py-2.5 px-3 text-right">Son Endeks</th>
                    <th className="py-2.5 px-3 text-right">Tüketim</th>
                    <th className="py-2.5 px-3 text-right">Bireysel</th>
                    <th className="py-2.5 px-3 text-right">Ortak Alan</th>
                    <th className="py-2.5 px-3 text-right">Tahakkuk Eden</th>
                    <th className="py-2.5 px-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {readings.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r.block_name ? `${r.block_name} ` : ''}No: {r.door_number}
                      </td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[140px]">
                        {r.debtor_full_name || '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {r.previous_reading}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 font-semibold">
                        {r.current_reading}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {r.consumption} {period.meter_type_unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        ₺{r.individual_amount.toLocaleString('tr-TR', { minimumFractionDigits: r.individual_amount % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        ₺{r.common_area_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700 whitespace-nowrap">
                        ₺{r.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: r.total_amount % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {r.debt_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Ödendi
                          </span>
                        ) : r.debt_status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Kısmi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            Açık
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4 shrink-0 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
