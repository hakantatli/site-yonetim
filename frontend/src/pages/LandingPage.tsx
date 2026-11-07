import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { authApi } from '../api/auth';
import {
  Building2,
  Wallet,
  Gauge,
  Receipt,
  FileText,
  ShieldCheck,
  Layers,
  ArrowRight,
  Check,
  Megaphone,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth } = useAuthStore();

  const [demoLoading, setDemoLoading] = useState<'admin' | 'resident' | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'owner') return '/owner/sites';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/resident/dashboard';
  };

  const handleDemoLogin = async (role: 'admin' | 'resident') => {
    setDemoError(null);
    setDemoLoading(role);

    try {
      const login = role === 'admin' ? '05551234567' : '05423010001';
      const response = await authApi.login({ login, password: 'Demo1234!' });
      setAuth(response);

      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/resident/dashboard');
      }
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setDemoError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setDemoError('Demo girişi başarısız oldu. Lütfen bağlantınızı kontrol ediniz.');
      }
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">
              Site Yönetim Sistemi
            </span>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#ozellikler"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Özellikler
            </a>
            <a
              href="#fiyatlandirma"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Ücretsiz Kullanım
            </a>
            <a
              href="#demo"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Canlı Demo
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <Link
                to={getDashboardPath()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs"
              >
                <span>Yönetim Paneline Git</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-slate-500" />
                  <span>Giriş Yap</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ücretsiz Kayıt Ol</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-slate-50/70 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Her Sitede 10 Daireye Kadar Tamamen Ücretsiz</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
              Şeffaf, Hesap Verebilir Apartman ve Site Yönetimi
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Aidat tahakkuku, kategori bazlı gider ve fatura belgesi arşivi, süzme sayaç okuma dağıtımı
              ve şeffaf kasa özetini tek ekranda yönetin. İstediğiniz kadar site ekleyin, her sitede
              10 daireye kadar ücret ödemeden kullanın.
            </p>

            {/* Primary CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base shadow-sm transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span>Yönetici Olarak Kayıt Ol</span>
              </Link>
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl text-base border border-slate-300 shadow-xs transition-colors"
              >
                <LogIn className="w-5 h-5 text-slate-500" />
                <span>Giriş Yap / Demo İncele</span>
              </a>
            </div>

            {/* Key Facts Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 text-left">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                  01
                </div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">
                  10 Daireye Kadar Ücretsiz
                </h2>
                <p className="text-xs text-slate-600 leading-normal">
                  Eklediğiniz her sitede ilk 10 daire için süresiz ücretsiz kullanım.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                  02
                </div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">
                  Çoklu Site Desteği
                </h2>
                <p className="text-xs text-slate-600 leading-normal">
                  Tek yönetici hesabıyla birden fazla apartman ve siteyi ayrı kasalarla yönetin.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                  03
                </div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">
                  Şeffaf Kasa ve Fatura Arşivi
                </h2>
                <p className="text-xs text-slate-600 leading-normal">
                  Devir bakiyesi, tahsilatlar ve PDF/JPEG fatura belgeleri tüm sakinlere şeffaf sunulur.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                  04
                </div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">
                  Kuruşu Kuruşuna Sayaç Dağıtımı
                </h2>
                <p className="text-xs text-slate-600 leading-normal">
                  Su, elektrik ve doğal gaz süzme sayaç endeksleriyle ortak alan payını hatasız hesaplayın.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Section */}
        <section id="ozellikler" className="py-20 sm:py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Temel Yetenekler
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-4">
                Apartman ve Site Yönetimi İçin Uçtan Uca Çözüm
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Karmaşık hesap tabloları ve kaybolan kağıt makbuzlar yerine kurallara bağlı, net ve
                şeffaf yönetim altyapısı.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-colors hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-xs">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Aidat ve Borç Tahakkuku
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Otomatik aylık aidat tahakkuku, yönetici dairesi aidat muafiyeti, demirbaş
                  giderlerinin doğrudan kat malikine yansıtılması ve kiracı değişiminde borç devir
                  seçenekleri.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-colors hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-xs">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Kısmi ve Fazla Ödeme Takibi
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Manuel nakit/havale tahsilat girişi, parçalı ödemelerde kalan bakiye takibi ve
                  fazla ödemelerde otomatik mahsup notu.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-colors hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Fatura Belgeli Gider Yönetimi
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Özelleştirilebilir gider kategorileri, masraf kayıtlarına PDF veya JPEG fatura/fiş
                  belgesi ekleme ve tek tıkla görüntüleme.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-colors hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-xs">
                  <Gauge className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Süzme Sayaç ve Tüketim Dağıtımı
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ana sayaç ve daire süzme sayaç ilk/son endeks okumaları, birim maliyet hesabı,
                  ortak alan tüketimi ayrıştırması ve tam sayı yuvarlama denkliği.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-colors hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-xs">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Çoklu Site ve Blok Yönetimi
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tek hesapla sınırsız sayıda site oluşturma, siteler arası tek tıkla geçiş, blok ve
                  daire bazlı malik/kiracı geçmişi.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-colors hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-xs">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Sakin Portalı ve Duyuru Panosu
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Kat malikleri ve kiracılar için güncel borç durumu, ödeme geçmişi, şeffaf bina
                  kasası, aylık PDF/yazdırılabilir gelir-gider raporları ve önem dereceli duyurular.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing / Free Tier Section */}
        <section id="fiyatlandirma" className="py-20 sm:py-24 bg-slate-50/70 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Fiyatlandırma Modeli
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-4">
                Gizli Maliyet Yok, Küçük Binalara Süresiz Ücretsiz
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Her site için ilk 10 daireye kadar hiçbir ücret ödemeden tüm özellikleri eksiksiz
                kullanın.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Plan 1: Free Tier */}
              <div className="bg-white border-2 border-blue-600 rounded-3xl p-8 shadow-sm flex flex-col justify-between relative">
                <div className="absolute -top-3.5 left-8 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-xs">
                  Önerilen / Başlangıç
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      Başlangıç / Apartman Paketi
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    Her sitede 10 daireye kadar süresiz kullanım
                  </p>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-extrabold text-slate-900">₺0</span>
                    <span className="text-sm font-medium text-slate-500">/ Ay</span>
                  </div>

                  <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Sınırsız sayıda site ekleme imkanı</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Her sitede 10 aktif daireye kadar tamamen ücretsiz</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Tüm özellikler dahil (Şeffaf kasa, fatura yükleme, sayaç dağıtımı, PDF raporlama, duyuru panosu)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Kredi kartı gerekmez, anında hesap açılışı</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/register"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Hemen Ücretsiz Başlayın</span>
                </Link>
              </div>

              {/* Plan 2: Large Sites */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      10 Daire Üzeri Siteler
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    Büyük siteler ve rezidanslar için esnek ölçekleme
                  </p>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-3xl font-extrabold text-slate-900">Daire Başı</span>
                    <span className="text-sm font-medium text-slate-500">Esnek Model</span>
                  </div>

                  <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span>10 daire sınırı aşıldığında güvenli limit koruması</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span>Sadece eklenen daireler için daire başı aylık uygun birim ücret</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span>Tüm sitelerinizi ve bloklarınızı tek çatı altında toplama</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span>Sistem Sahibi desteği ve anında limit artırımı</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/register"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                >
                  <span>Yönetici Hesabı Oluştur</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Live Demo Section */}
        <section id="demo" className="py-20 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Canlı Demo Ortamı
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-4">
                Kayıt Olmadan Çınar Park Sitesi&apos;ni İnceleyin
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Kadıköy / İstanbul&apos;da bulunan 10 daireli örnek &quot;Çınar Park Sitesi&quot; simülasyonu;
                4 aylık aidat tahakkukları, BEDAŞ elektrik faturası süzme sayaç dağıtımı ve
                ₺24.500,00 devir bakiyesi ile incelenmeye hazırdır.
              </p>
            </div>

            {demoError && (
              <div className="max-w-2xl mx-auto mb-8 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{demoError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Admin Demo Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                      Site Yöneticisi Rolü
                    </span>
                    <KeyRound className="w-4 h-4 text-slate-400" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Demo Yönetici Girişi
                  </h3>
                  <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                    Daire ve sakin listeleri, aidat belirleme, nakit/havale tahsilat girişi, faturalı
                    masraflar, sayaç okuma dağıtımı ve duyuru yönetimi.
                  </p>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Telefon Numarası:</span>
                      <code className="font-mono font-bold text-slate-900">0555 123 45 67</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Şifre:</span>
                      <code className="font-mono font-bold text-slate-900">Demo1234!</code>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={demoLoading !== null}
                  onClick={() => handleDemoLogin('admin')}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {demoLoading === 'admin' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Giriş Yapılıyor...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Demo Yönetici Olarak Giriş Yap</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resident Demo Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Kat Maliki / Kiracı Rolü
                    </span>
                    <KeyRound className="w-4 h-4 text-slate-400" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Demo Sakin Girişi
                  </h3>
                  <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                    Can Arslan (A Blok No: 2 Kiracısı) olarak borç dökümü, geçmiş ödemeler, süzme
                    sayaç tüketimi, şeffaf bina kasası ve duyurular.
                  </p>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Telefon Numarası:</span>
                      <code className="font-mono font-bold text-slate-900">0542 301 00 01</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Şifre:</span>
                      <code className="font-mono font-bold text-slate-900">Demo1234!</code>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={demoLoading !== null}
                  onClick={() => handleDemoLogin('resident')}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-xs text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {demoLoading === 'resident' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Giriş Yapılıyor...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-slate-600" />
                      <span>Demo Sakin Olarak Giriş Yap</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-base tracking-tight block">
                  Site Yönetim Sistemi
                </span>
                <span className="text-xs text-slate-500">
                  Şeffaf ve hesap verebilir apartman yönetimi
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              <a href="#ozellikler" className="hover:text-slate-900 transition-colors">
                Özellikler
              </a>
              <a href="#fiyatlandirma" className="hover:text-slate-900 transition-colors">
                Fiyatlandırma
              </a>
              <a href="#demo" className="hover:text-slate-900 transition-colors">
                Canlı Demo
              </a>
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                Yönetici Kaydı
              </Link>
              <Link to="/login" className="font-semibold text-slate-700 hover:text-slate-900">
                Sisteme Giriş
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <span>© 2026 Site Yönetim Sistemi. Tüm hakları saklıdır.</span>
            <span>Her sitede 10 daireye kadar ücretsiz kullanım.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
