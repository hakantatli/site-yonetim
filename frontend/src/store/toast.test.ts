import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore, toast } from './toast';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.getState().clearAll();
    vi.clearAllTimers();
  });

  it('starts with an empty toasts array', () => {
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('adds success toast correctly', () => {
    const id = toast.success('İşlem tamamlandı', 'Başarılı');
    const toasts = useToastStore.getState().toasts;

    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('İşlem tamamlandı');
    expect(toasts[0].title).toBe('Başarılı');
  });

  it('adds error toast correctly', () => {
    toast.error('Beklenmeyen bir hata oluştu');
    const toasts = useToastStore.getState().toasts;

    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Beklenmeyen bir hata oluştu');
  });

  it('removes toast by id', () => {
    const id1 = toast.info('Bilgi 1');
    toast.info('Bilgi 2');

    expect(useToastStore.getState().toasts).toHaveLength(2);

    useToastStore.getState().removeToast(id1);

    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('Bilgi 2');
  });

  it('clears all toasts with clearAll', () => {
    toast.success('Test 1');
    toast.warning('Test 2');
    expect(useToastStore.getState().toasts).toHaveLength(2);

    useToastStore.getState().clearAll();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
