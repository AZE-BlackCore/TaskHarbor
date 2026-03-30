import { create } from 'zustand';

export type ViewType = 'list' | 'gantt' | 'kanban' | 'calendar' | 'dashboard';

interface ViewState {
  currentView: ViewType;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  selectedTaskId: string | null;
  
  // Actions
  setView: (view: ViewType) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setSelectedTask: (taskId: string | null) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'list',
  sidebarOpen: true,
  rightPanelOpen: false,
  selectedTaskId: null,

  setView: (view) => set({ currentView: view }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  setSelectedTask: (taskId) => set({ selectedTaskId: taskId, rightPanelOpen: !!taskId }),
}));
