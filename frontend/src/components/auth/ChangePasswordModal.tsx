import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { authApi } from '../../api/auth';
import { toast } from '../../store/toast';
import {
  X,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstLogin?: boolean;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  isFirstLogin = false,
}: ChangePasswordModalProps) {
  const { setAuth, updateUser } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isFirstLogin && !currentPassword.trim()) {
      setErrorMessage('Lütfen mevcut şifrenizi giriniz.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setErrorMessage('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Girdiğiniz yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.changePassword({
        current_password: currentPassword.trim() || undefined,
        new_password: newPassword.trim(),
      });
      setAuth(response);
      toast.success('Şifreniz başarıyla güncellendi.');
      onClose();
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setErrorMessage((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setErrorMessage('Şifre güncellenirken bir hata oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    setErrorMessage(null);
    try {
      await authApi.dismissPasswordChange();
      updateUser({ must_change_password: false });
      toast.info('Mevcut şifrenizle devam ediyorsunuz. Dilediğiniz zaman üst menüdeki "Şifre Değiştir" bağlantısından güncelleyebilirsiniz.');
      onClose();
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isFirstLogin ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {isFirstLogin ? <ShieldCheck className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isFirstLogin ? 'Yeni Şifre Belirleyin' : 'Şifre Değiştir'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFirstLogin
                  ? 'Yöneticiniz tarafından atanan geçici şifreyi dilerseniz güncelleyin.'
                  : 'Hesap güvenliğiniz için şifrenizi güncelleyin.'}
              </p>
            </div>
          </div>
          {!isFirstLogin && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isFirstLogin && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed">
              Yöneticiniz tarafından belirlenen şifre ile sisteme giriş yaptınız. Dilerseniz hemen yeni ve güvenli bir şifre belirleyebilir, dilerseniz mevcut şifrenizle devam edebilirsiniz.
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isFirstLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mevcut Şifre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Mevcut şifrenizi giriniz"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                    disabled={isLoading || isDismissing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Yeni Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                  disabled={isLoading || isDismissing}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Yeni Şifre Tekrar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar giriniz"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                  disabled={isLoading || isDismissing}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={isLoading || isDismissing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{isFirstLogin ? 'Şifreyi Değiştir' : 'Şifreyi Güncelle'}</span>
                )}
              </button>

              {isFirstLogin ? (
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isLoading || isDismissing}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDismissing ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <span>Şimdi Değil</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading || isDismissing}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
