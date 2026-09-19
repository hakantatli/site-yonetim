import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meterApi } from '../../api/meter';
import type { MeterType } from '../../types/meter';
import { X, Plus, Gauge, Pencil, Trash2, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface MeterTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId?: string;
}

export function MeterTypesModal({ isOpen, onClose, siteId }: MeterTypesModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('m³');
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingType, setEditingType] = useState<MeterType | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('m³');
  const [editIsActive, setEditIsActive] = useState(true);

  const { data: meterTypes = [], isLoading } = useQuery({
    queryKey: ['admin', 'all-meter-types', siteId],
    queryFn: () => meterApi.listMeterTypes(true, siteId),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; unit: string }) =>
      meterApi.createMeterType(payload, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-meter-types', siteId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'meter-types', siteId] });
      setName('');
      setUnit('m³');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Sayaç türü eklenemedi');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, unit, isActive }: { id: string; name: string; unit: string; isActive: boolean }) =>
      meterApi.updateMeterType(id, { name, unit, is_active: isActive }, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-meter-types', siteId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'meter-types', siteId] });
      setEditingType(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Sayaç türü güncellenemedi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meterApi.deleteMeterType(id, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-meter-types', siteId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'meter-types', siteId] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Sayaç türü silinemedi');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Sayaç ve Tüketim Türleri</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Sitenizde kullanılan tüketim sayaçlarını (Su, Doğalgaz, Isı Payölçer, Elektrik vb.) buradan yapılandırabilirsiniz.
        </p>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Yeni Sayaç Türü Ekle Formu */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMutation.mutate({ name: name.trim(), unit: unit.trim() });
          }}
          className="flex flex-col sm:flex-row gap-2 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100"
        >
          <input
            type="text"
            required
            placeholder="Sayaç Adı (Örn: Sıcak Su, Elektrik)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
          />
          <div className="w-24">
            <input
              type="text"
              required
              placeholder="Birim (m³)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Ekle</span>
          </button>
        </form>

        {/* Sayaç Türleri Listesi */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Yükleniyor...</span>
            </div>
          ) : meterTypes.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs italic">
              Henüz tanımlı bir sayaç türü bulunmuyor.
            </div>
          ) : (
            meterTypes.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition-colors"
              >
                {editingType?.id === t.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-center font-mono"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsActive}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Aktif</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({
                          id: t.id,
                          name: editName,
                          unit: editUnit,
                          isActive: editIsActive,
                        })
                      }
                      className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
                      title="Kaydet"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingType(null)}
                      className="p-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 cursor-pointer"
                      title="Vazgeç"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{t.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px]">
                        Birim: {t.unit}
                      </span>
                      {!t.is_active && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400">
                          Pasif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingType(t);
                          setEditName(t.name);
                          setEditUnit(t.unit);
                          setEditIsActive(t.is_active);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer"
                        title="Düzenle"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`"${t.name}" sayaç türünü silmek veya pasife almak istediğinize emin misiniz?`)) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Sil / Pasife Al"
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

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-5">
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
