import { create } from 'zustand';

export interface UserProfile {
  nickname: string;
  avatar: string; // base64 data URL or empty for default
  signature: string;
  email: string;
}

const DEFAULT_PROFILE: UserProfile = {
  nickname: '用户',
  avatar: '',
  signature: '',
  email: '',
};

const STORAGE_KEY = 'userProfile';

function loadFromStorage(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load user profile from localStorage:', e);
  }
  return DEFAULT_PROFILE;
}

function saveToStorage(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save user profile to localStorage:', e);
  }
}

interface UserProfileState {
  profile: UserProfile;

  // Actions
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: string) => void;
  setSignature: (signature: string) => void;
  setEmail: (email: string) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  profile: loadFromStorage(),

  setNickname: (nickname) => {
    const newProfile = { ...get().profile, nickname };
    saveToStorage(newProfile);
    set({ profile: newProfile });
  },

  setAvatar: (avatar) => {
    const newProfile = { ...get().profile, avatar };
    saveToStorage(newProfile);
    set({ profile: newProfile });
  },

  setSignature: (signature) => {
    const newProfile = { ...get().profile, signature };
    saveToStorage(newProfile);
    set({ profile: newProfile });
  },

  setEmail: (email) => {
    const newProfile = { ...get().profile, email };
    saveToStorage(newProfile);
    set({ profile: newProfile });
  },

  updateProfile: (partial) => {
    const newProfile = { ...get().profile, ...partial };
    saveToStorage(newProfile);
    set({ profile: newProfile });
  },

  resetProfile: () => {
    saveToStorage(DEFAULT_PROFILE);
    set({ profile: DEFAULT_PROFILE });
  },
}));
