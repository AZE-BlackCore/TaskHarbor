import { create } from 'zustand';

export type ErrorType = 'success' | 'error' | 'warning' | 'info';

interface ErrorItem {
  id: string;
  message: string;
  type: ErrorType;
  timestamp: string;
}

interface ErrorState {
  errors: ErrorItem[];
  addError: (message: string, type?: ErrorType, duration?: number) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  clearErrorsByType: (type: ErrorType) => void;
}

export const useErrorStore = create<ErrorState>((set, get) => ({
  errors: [],

  addError: (message, type = 'error', duration = 3000) => {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const error: ErrorItem = {
      id,
      message,
      type,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      errors: [...state.errors, error],
    }));

    // 自动移除（success 类型默认 3 秒，其他类型默认 5 秒）
    const autoRemoveDuration = type === 'success' ? 3000 : (duration || 5000);
    setTimeout(() => {
      get().removeError(id);
    }, autoRemoveDuration);
  },

  removeError: (id) => set((state) => ({
    errors: state.errors.filter(e => e.id !== id),
  })),

  clearErrors: () => set({ errors: [] }),

  clearErrorsByType: (type) => set((state) => ({
    errors: state.errors.filter(e => e.type !== type),
  })),
}));
