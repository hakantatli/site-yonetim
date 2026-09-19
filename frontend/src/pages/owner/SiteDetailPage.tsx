import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerApi, type CreateAdminPayload } from '../../api/owner';
import {
  ArrowLeft,
  Users,
  Home,
  Layers,
  Shield,
  Plus,
  Mail,
  Lock,
  User,
  Phone,
  Edit2,
  Check,
  X,
  Loader2,
  ExternalLink,
  MapPin,
  Calendar,
} from 'lucide-react';

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<CreateAdminPayload>({
    full_name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [adminError, setAdminError] = useState<string | null>(null);

  // Edit Limit State
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [newLimit, setNewLimit] = useState<number>(10);

  const { data: site, isLoading, error } = useQuery({
    queryKey: ['owner', 'site', id],
    queryFn: () => ownerApi.getSiteDetails(id!),
    enabled: !!id,
  });

  const updateLimitMutation = useMutation({
    mutationFn: (limit: number) => ownerApi.updateLimit(id!, limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'site', id] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'sites'] });
      setIsEditingLimit(false);
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (payload: CreateAdminPayload) => ownerApi.createAdmin(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'site', id] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'sites'] });
      setIsAdminModalOpen(false);
      setAdminForm({ full_name: '', email: '', password: '', phone: '' });
      setAdminError(null);
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setAdminError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setAdminError('Yönetici eklenirken hata oluştu');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="ml-3 text-sm">Site detayları yükleniyor...</span>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Site Bulunamadı</h2>
        <p className="text-sm text-slate-500 mb-4">Aradığınız site silinmiş veya mevcut değil.</p>
        <button
          onClick={() => navigate('/owner/sites')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
        >
          Site Listesine Dön
        </button>
      </div>
    );
  }

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.phone.trim() || !adminForm.password.trim() || !adminForm.full_name.trim()) {
      setAdminError('Ad Soyad, Telefon Numarası ve Şifre alanları zorunludur.');
      return;
    }
    createAdminMutation.mutate({
      ...adminForm,
      full_name: adminForm.full_name.trim(),
      phone: adminForm.phone.trim(),
      email: adminForm.email?.trim() || undefined,
    });
  };

  const handleSaveLimit = () => {
    if (newLimit >= 1) {
      updateLimitMutation.mutate(newLimit);
    }
  };

  const isFreeTier = site.apartment_limit <= 10;
  const usagePercent = Math.min(
    100,
    Math.round((site.apartment_count / (site.apartment_limit || 10)) * 100)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <button
            onClick={() => navigate('/owner/sites')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors p-1 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tüm Siteler</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/dashboard?siteId=${site.id}`)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Yönetici Olarak Giriş Yap</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {site.name}
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isFreeTier
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {isFreeTier ? 'Ücretsiz Katman' : `Özel (${site.apartment_limit} Daire)`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {site.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{site.address}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kayıt: {new Date(site.created_at).toLocaleDateString('tr-TR')}</span>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yönetici Ata</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Daire Sayısı
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-slate-900">
                {site.apartment_count}
              </span>
              <span className="text-xs text-slate-400">
                Limit: {site.apartment_limit}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 90 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Blok Sayısı
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">{site.block_count}</span>
            <span className="text-xs text-slate-400 block mt-2">Blok tanımı</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Aktif Sakin
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">{site.resident_count}</span>
            <span className="text-xs text-slate-400 block mt-2">Kat maliki ve kiracı</span>
          </div>

          {/* Daire Limiti Kartı (Owner Düzenleyebilir) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Daire Limiti (Owner)
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            {isEditingLimit ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={newLimit}
                  onChange={(e) => setNewLimit(parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold"
                />
                <button
                  onClick={handleSaveLimit}
                  disabled={updateLimitMutation.isPending}
                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingLimit(false)}
                  className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold text-slate-900">{site.apartment_limit}</span>
                <button
                  onClick={() => {
                    setNewLimit(site.apartment_limit);
                    setIsEditingLimit(true);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 p-1 rounded-md"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Değiştir</span>
                </button>
              </div>
            )}
            <span className="text-xs text-slate-400 block mt-2">
              {isFreeTier ? '10 daireye kadar ücretsiz' : 'Özel ücretli paket'}
            </span>
          </div>
        </div>

        {/* Site Yöneticileri Tablosu */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Atanmış Site Yöneticileri</h2>
              <p className="text-xs text-slate-500">Bu sitenin yönetim paneline erişim yetkisi olan hesaplar</p>
            </div>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Yönetici</span>
            </button>
          </div>

          {site.admins.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Henüz Yönetici Atanmadı</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                Bu site için bir yönetici hesabı oluşturarak site sakinlerini ve aidatlarını yönetmesini sağlayabilirsiniz.
              </p>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yönetici Ata</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {site.admins.map((adm) => (
                <div key={adm.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {adm.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{adm.full_name}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{adm.email}</span>
                        </span>
                        {adm.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{adm.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Aktif Yönetici
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Assign Admin Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">Yeni Site Yöneticisi Ata</h3>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adminError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ad Soyad *
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ahmet Yılmaz"
                    value={adminForm.full_name}
                    onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefon Numarası *
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="0555 123 45 67"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-posta Adresi (Opsiyonel)
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="yonetici@site.com"
                    value={adminForm.email || ''}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Şifre Belirle *
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Yönetici sisteme bu telefon numarası ve şifre ile giriş yapacaktır.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createAdminMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {createAdminMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Yöneticiyi Kaydet</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
