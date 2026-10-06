import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { authApi } from '../api/auth';
import { maskPhoneInput, cleanPhone, formatPhone } from '../utils/phone';
import { Building2, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, setAuth } = useAuthStore();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to appropriate panel
  if (isAuthenticated && user) {
    if (user.role === 'owner') return <Navigate to="/owner/sites" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/resident/dashboard" replace />;
  }

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Apply phone mask if input looks like a phone number (digits and formatting chars without @)
    if (!val.includes('@') && /^[0-9()\s-]*$/.test(val)) {
      setLoginIdentifier(maskPhoneInput(val));
    } else {
      setLoginIdentifier(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim() || !password.trim()) {
      setError('Lütfen telefon numarası / e-posta ve şifrenizi giriniz.');
      return;
    }

    setIsLoading(true);
    try {
      const identifierToSend = loginIdentifier.includes('@')
        ? loginIdentifier.trim()
        : cleanPhone(loginIdentifier);
      const response = await authApi.login({ login: identifierToSend, password });
      setAuth(response);

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }

      if (response.user.role === 'owner') {
        navigate('/owner/sites', { replace: true });
      } else if (response.user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/resident/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setError('Giriş başarısız. Lütfen internet bağlantınızı kontrol ediniz.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDefaultOwner = () => {
    setLoginIdentifier(formatPhone('05000000000'));
    setPassword('AdminPassword123!');
  };

  const fillDemoAdmin = () => {
    setLoginIdentifier(formatPhone('05551234567'));
    setPassword('Demo1234!');
  };

  const fillDemoResident = () => {
    setLoginIdentifier(formatPhone('05423010001'));
    setPassword('Demo1234!');
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 to-slate-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Site Yönetim Sistemi
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Giriş yaparak yönetim paneline erişin
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Telefon Numarası veya E-posta
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={handleIdentifierChange}
                  placeholder="5XX XXX XX XX veya e-posta adresi"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Şifre
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Giriş Yapılıyor...</span>
                  </>
                ) : (
                  <span>Giriş Yap</span>
                )}
              </button>
            </div>
          </form>

          {/* Demo Account Quick-Fill Card */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-800 block mb-1">
                Sistemi İncelemek İçin Demo Girişi
              </span>
              <p className="text-slate-500 mb-3">
                10 daireli örnek sitede aidat geçmişi, kasa hareketleri ve sayaç dağıtımı hazır durumdadır.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 hover:text-blue-600 transition-colors text-center cursor-pointer"
                >
                  <span className="block font-semibold">Demo Yönetici</span>
                  <span className="text-[11px] text-slate-500 font-mono">0555 123 45 67</span>
                </button>
                <button
                  type="button"
                  onClick={fillDemoResident}
                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 hover:text-blue-600 transition-colors text-center cursor-pointer"
                >
                  <span className="block font-semibold">Demo Sakin</span>
                  <span className="text-[11px] text-slate-500 font-mono">0542 301 00 01</span>
                </button>
              </div>
              <div className="mt-2 text-center text-[11px] text-slate-500">
                Ortak Demo Şifresi: <code className="font-mono font-semibold text-slate-700">Demo1234!</code>
              </div>
            </div>
          </div>

          {/* Dev Quick-Fill helper (Only in local development) */}
          {import.meta.env.DEV && (
            <div className="mt-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700">Sistem Sahibi (Owner): </span>
                  <span className="text-slate-500 font-mono">{formatPhone('05000000000')}</span>
                </div>
                <button
                  type="button"
                  onClick={fillDefaultOwner}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  Doldur
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
