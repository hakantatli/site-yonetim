import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ownerApi, type CreateSitePayload } from '../../api/owner';
import { useAuthStore } from '../../store/auth';
import { authApi } from '../../api/auth';
import {
  Building2,
  Plus,
  Users,
  Home,
  Shield,
  LogOut,
  MapPin,
  ChevronRight,
  Search,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';

export function OwnerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSite, setNewSite] = useState<CreateSitePayload>({
    name: '',
    address: '',
    apartment_limit: 10,
  });
  const [modalError, setModalError] = useState<string | null>(null);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['owner', 'sites'],
    queryFn: ownerApi.listSites,
  });

  const createMutation = useMutation({
    mutationFn: ownerApi.createSite,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'sites'] });
      setIsModalOpen(false);
      setNewSite({ name: '', address: '', apartment_limit: 10 });
      setModalError(null);
      navigate(`/owner/sites/${created.id}`);
    },
    onError: (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setModalError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setModalError('Site oluşturulurken bir hata oluştu');
      }
    },
  });

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    navigate('/login');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name.trim()) {
      setModalError('Site adı zorunludur');
      return;
    }
    createMutation.mutate(newSite);
  };

  const filteredSites = sites.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(search.toLowerCase()))
  );

  const totalApartments = sites.reduce((acc, s) => acc + s.apartment_count, 0);
  const totalAdmins = sites.reduce((acc, s) => acc + s.admin_count, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 leading-tight">Site Yönetim</h1>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Owner
                </span>
              </div>
              <p className="text-xs text-slate-500">Sistem Geneli Siteler & Abonelikler</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700">
              <Shield className="w-4 h-4 text-blue-600" />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Kayıtlı Site</span>
              <span className="text-2xl font-bold text-slate-900">{sites.length}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Toplam Aktif Daire</span>
              <span className="text-2xl font-bold text-slate-900">{totalApartments}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Atanmış Site Yöneticisi</span>
              <span className="text-2xl font-bold text-slate-900">{totalAdmins}</span>
            </div>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Site adı veya adrese göre ara..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Site Oluştur</span>
          </button>
        </div>

        {/* Site List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm">Siteler yükleniyor...</p>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {search ? 'Aramaya uygun site bulunamadı' : 'Henüz kayıtlı bir site yok'}
            </h3>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
              {search
                ? 'Farklı bir anahtar kelime ile aramayı deneyebilirsiniz.'
                : 'Yeni bir site ekleyerek daireleri ve yöneticileri yapılandırmaya başlayın.'}
            </p>
            {!search && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>İlk Siteyi Oluştur</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSites.map((site) => {
              const usagePercent = Math.min(
                100,
                Math.round((site.apartment_count / (site.apartment_limit || 10)) * 100)
              );
              const isFreeTier = site.apartment_limit <= 10;

              return (
                <div
                  key={site.id}
                  onClick={() => navigate(`/owner/sites/${site.id}`)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {site.name}
                      </h3>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isFreeTier
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {isFreeTier ? 'Ücretsiz (10 Daire)' : `Özel (${site.apartment_limit} Daire)`}
                      </span>
                    </div>

                    {site.address ? (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-4 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{site.address}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mb-4">Adres belirtilmemiş</p>
                    )}

                    {/* Daire Limit Progress */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Daire Doluluğu</span>
                        <span className="font-semibold text-slate-800">
                          {site.apartment_count} / {site.apartment_limit}
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
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{site.admin_count} Yönetici</span>
                    </span>
                    <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                      Detaylar <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Site Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">Yeni Site Oluştur</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site / Apartman Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Güneş Sitesi veya Palmiye Apt."
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adres (Opsiyonel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Örn: Atatürk Mah. Çiçek Sok. No: 12 Kadıköy / İstanbul"
                  value={newSite.address || ''}
                  onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Daire Limiti (Freemium: Varsayılan 10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={newSite.apartment_limit || 10}
                  onChange={(e) =>
                    setNewSite({ ...newSite, apartment_limit: parseInt(e.target.value) || 10 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  10 daireye kadar ücretsizdir; dilediğiniz zaman limiti artırabilirsiniz.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Siteyi Oluştur</span>
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
