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
  { id: 'stats', name: '数据统计', icon: 'BarChart3', iconLabel: '📊', path: '/stats', enabled: true },
  { id: 'tags', name: '任务管理', icon: 'Tag', iconLabel: '🏷️', path: '/tags', enabled: true },
  { id: 'schedule', name: '日程管理', icon: 'Clock', iconLabel: '🕐', path: '/schedule', enabled: true },
];

export const useViewConfigStore = create<ViewState>()(
  immer((set) => ({
    views: [],

    loadViews: () => {
      const saved = localStorage.getItem('viewOrder');
      if (saved) {
        try {
          const savedViews = JSON.parse(saved);
          // 过滤掉已不在 DEFAULT_VIEWS 中的残留视图
          const validSavedViews = savedViews.filter(
            (v: ViewItem) => DEFAULT_VIEWS.some(d => d.id === v.id)
          );
          // 检测并添加缺失的视图
          const missingViews = DEFAULT_VIEWS.filter(
            defaultView => !validSavedViews.some((v: ViewItem) => v.id === defaultView.id)
          );

          if (missingViews.length > 0 || validSavedViews.length !== savedViews.length) {
            // 合并：保留有效视图 + 补充缺失视图
            const mergedViews = [...validSavedViews, ...missingViews];
            set({ views: mergedViews });
            localStorage.setItem('viewOrder', JSON.stringify(mergedViews));
            if (missingViews.length > 0) console.log('Added missing views:', missingViews.map(v => v.name));
            if (validSavedViews.length !== savedViews.length) console.log('Removed stale views from localStorage');
            return;
          }

          set({ views: validSavedViews });
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
