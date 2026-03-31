import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ViewItem {
  id: string;
  name: string;
  icon: string; // 图标组件名
  iconLabel: string; // 图标显示文本（emoji）
  path: string;
  enabled: boolean;
}

interface ViewState {
  views: ViewItem[];
  loadViews: () => void;
  updateViewOrder: (views: ViewItem[]) => void;
  toggleView: (viewId: string) => void;
  resetViews: () => void;
}

const DEFAULT_VIEWS: ViewItem[] = [
  { id: 'list', name: '任务列表', icon: 'List', iconLabel: '📋', path: '/list', enabled: true },
  { id: 'projects', name: '项目管理', icon: 'Grid3X3', iconLabel: '📁', path: '/projects', enabled: true },
  { id: 'gantt', name: '甘特图', icon: 'Network', iconLabel: '📊', path: '/gantt', enabled: true },
  { id: 'kanban', name: '看板', icon: 'Columns', iconLabel: '📌', path: '/kanban', enabled: true },
  { id: 'calendar', name: '日历', icon: 'Calendar', iconLabel: '📅', path: '/calendar', enabled: true },
  { id: 'dashboard', name: '统计报表', icon: 'BarChart3', iconLabel: '📈', path: '/dashboard', enabled: true },
];

export const useViewConfigStore = create<ViewState>()(
  immer((set) => ({
    views: [],

    loadViews: () => {
      const saved = localStorage.getItem('viewOrder');
      if (saved) {
        try {
          const views = JSON.parse(saved);
          set({ views });
          return;
        } catch (e) {
          console.error('Failed to load view order:', e);
        }
      }
      set({ views: DEFAULT_VIEWS });
    },

    updateViewOrder: (views) => {
      set({ views });
      localStorage.setItem('viewOrder', JSON.stringify(views));
    },

    toggleView: (viewId) => {
      set((state) => {
        const view = state.views.find(v => v.id === viewId);
        if (view) {
          view.enabled = !view.enabled;
        }
        localStorage.setItem('viewOrder', JSON.stringify(state.views));
      });
    },

    resetViews: () => {
      set({ views: DEFAULT_VIEWS });
      localStorage.setItem('viewOrder', JSON.stringify(DEFAULT_VIEWS));
    },
  }))
);
