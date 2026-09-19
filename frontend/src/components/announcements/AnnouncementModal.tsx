import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementApi } from '../../api/announcement';
import type { Announcement, AnnouncementPriority } from '../../types/announcement';
import {
  X,
  Megaphone,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId?: string;
  initialData?: Announcement | null;
}

export function AnnouncementModal({
  isOpen,
  onClose,
  siteId,
  initialData,
}: AnnouncementModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setPriority(initialData.priority);
    } else {
      setTitle('');
      setContent('');
      setPriority('normal');
    }
    setErrorMessage(null);
  }, [initialData, isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing && initialData) {
        return announcementApi.updateAnnouncement(
          initialData.id,
          { title: title.trim(), content: content.trim(), priority },
          siteId
        );
      }
      return announcementApi.createAnnouncement(
        { title: title.trim(), content: content.trim(), priority },
        siteId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements', siteId] });
      queryClient.invalidateQueries({ queryKey: ['resident', 'announcements'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Duyuru kaydedilirken bir hata oluştu.';
      setErrorMessage(msg);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Lütfen duyuru başlığını giriniz.');
      return;
    }

    if (!content.trim()) {
      setErrorMessage('Lütfen duyuru metnini giriniz.');
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Yayınla'}
              </h3>
              <p className="text-xs text-slate-500">
                Site sakinlerine yönelik duyuru ve bilgilendirme paylaşımı
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Duyuru Başlığı */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Duyuru Başlığı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Asansör Periyodik Bakım Çalışması"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* Önem Derecesi Seçimi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Önem Seviyesi <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  priority === 'normal'
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
                    <Info className="w-3.5 h-3.5" />
                    Normal
                  </span>
                  {priority === 'normal' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Genel bilgilendirme & rutin haberler
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('important')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  priority === 'important'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Önemli
                  </span>
                  {priority === 'important' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Öncelikli duyuru & toplantı vb.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  priority === 'urgent'
                    ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Acil
                  </span>
                  {priority === 'urgent' && (
                    <CheckCircle2 className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Kesinti, arıza, acil müdahale
                </span>
              </button>
            </div>
          </div>

          {/* Duyuru Metni */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Duyuru İçeriği <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              placeholder="Duyuru detaylarını, tarih ve saatleri açıklayıcı bir şekilde buraya yazınız..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-y leading-relaxed"
            />
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-xs shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Değişiklikleri Kaydet' : 'Duyuruyu Yayınla'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
