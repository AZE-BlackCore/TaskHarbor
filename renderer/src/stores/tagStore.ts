import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Tag, TagStats } from '../types';
import { useErrorStore } from './errorStore';

interface TagState {
  tags: Tag[];
  currentTagId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setTags: (tags: Tag[]) => void;
  setCurrentTag: (tagId: string | null) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  fetchTags: () => Promise<void>;
  createTag: (tagData: { name: string; color?: string }) => Promise<Tag | null>;
  getTagStats: (tagId: string) => Promise<TagStats | null>;
}

export const useTagStore = create<TagState>()(
  immer((set, get) => ({
    tags: [],
    currentTagId: null,
    loading: false,
    error: null,

    setTags: (tags) => set({ tags }),

    setCurrentTag: (tagId) => set({ currentTagId: tagId }),

    addTag: (tag) => set((state) => {
      state.tags.push(tag);
    }),

    updateTag: async (id, updates) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }

      // 先找到旧数据（用于回滚）
      const oldTag = get().tags.find(p => p.id === id);
      if (!oldTag) return;

      // 乐观更新本地 store
      set((state) => {
        const tag = state.tags.find(p => p.id === id);
        if (tag) {
          Object.assign(tag, updates, {
            updatedAt: new Date().toISOString(),
          });
        }
      });

      try {
        const result = await (window.electronAPI as any).updateTag(id, updates);
        if (result.success) {
          useErrorStore.getState().addError('标签已更新', 'success');
        } else {
          // 回滚本地 store
          set((state) => {
            const tag = state.tags.find(p => p.id === id);
            if (tag) Object.assign(tag, oldTag);
          });
          useErrorStore.getState().addError(result.error || '更新失败', 'error');
        }
      } catch (error: unknown) {
        // 回滚本地 store
        set((state) => {
          const tag = state.tags.find(p => p.id === id);
          if (tag) Object.assign(tag, oldTag);
        });
        useErrorStore.getState().addError(
          error instanceof Error ? error.message : '未知错误',
          'error'
        );
      }
    },

    deleteTag: async (id) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return;
      }
      
      // 先检查是否是临时乐观ID，临时ID直接从本地删除即可
      if (id.startsWith('temp_')) {
        set((state) => {
          const index = state.tags.findIndex(p => p.id === id);
          if (index !== -1) {
            state.tags.splice(index, 1);
          }
        });
        return;
      }
      
      try {
        const result = await (window.electronAPI as any).deleteTag(id);
        
        if (result.success) {
          // 从本地 store 删除
          set((state) => {
            const index = state.tags.findIndex(p => p.id === id);
            if (index !== -1) {
              state.tags.splice(index, 1);
            }
            if (state.currentTagId === id) {
              state.currentTagId = null;
            }
          });
          useErrorStore.getState().addError('标签已删除', 'success');
        } else {
          useErrorStore.getState().addError(result.error || '删除失败', 'error');
        }
      } catch (error: unknown) {
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
      }
    },

    fetchTags: async () => {
      try {
        set({ loading: true, error: null });

        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }

        const result = await (window.electronAPI as any).getAllTags();

        if (result.success) {
          set({ tags: result.data as unknown as Tag[], loading: false });
        } else {
          set({ error: result.error ?? null, loading: false });
          useErrorStore.getState().addError(result.error ?? '未知错误', 'error');
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '未知错误';
        set({ error: msg, loading: false });
        useErrorStore.getState().addError(msg, 'error');
      }
    },

    createTag: async (tagData) => {
      if (!window.electronAPI) {
        useErrorStore.getState().addError('Electron API not available', 'error');
        return null;
      }

      // 乐观更新
      const optimisticId = `temp_${Date.now()}`;
      const optimisticTag: Tag = {
        ...tagData,
        color: tagData.color || '#3B82F6',
        id: optimisticId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Tag;

      // 回滚辅助函数：直接从本地 store 删除，不走 IPC
      const rollback = () => {
        set((state) => {
          const index = state.tags.findIndex(p => p.id === optimisticId);
          if (index !== -1) {
            state.tags.splice(index, 1);
          }
        });
      };

      get().addTag(optimisticTag);

      try {
        const result = await (window.electronAPI as any).createTag(tagData);

        if (result.success) {
          // 替换临时 ID 为真实数据
          set((state) => {
            const tag = state.tags.find(p => p.id === optimisticId);
            if (tag) {
              Object.assign(tag, {
                ...result.data,
                createdAt: result.data.createdAt || new Date().toISOString(),
                updatedAt: result.data.updatedAt || new Date().toISOString(),
              });
            }
          });

          useErrorStore.getState().addError('标签创建成功', 'success');
          return result.data as unknown as Tag;
        } else {
          rollback();
          useErrorStore.getState().addError(result.error || '创建失败', 'error');
          return null;
        }
      } catch (error: unknown) {
        rollback();
        useErrorStore.getState().addError(error instanceof Error ? error.message : '未知错误', 'error');
        return null;
      }
    },

    getTagStats: async (tagId) => {
      try {
        const result = await (window.electronAPI as any).getTagStats(tagId);

        if (result.success) {
          return result.data as unknown as TagStats;
        } else {
          return null;
        }
      } catch (error: unknown) {
        console.error('Error getting tag stats:', error);
        return null;
      }
    },
  }))
);
