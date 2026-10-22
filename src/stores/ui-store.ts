import { create } from 'zustand';

/**
 * Zustand UI Store
 * CATATAN ARSITEKTUR:
 * Store ini HANYA untuk state antarmuka sementara (transient UI state),
 * seperti preferensi tema, bahasa, filter aktif, ID trip yang disorot, dan modal dialog.
 *
 * JANGAN menyimpan data relasional entitas di sini! Entitas persisten dikelola
 * sepenuhnya oleh SQLite + Drizzle ORM.
 */

export type TripFilterTab = 'all' | 'active' | 'upcoming' | 'completed';
export type AppLanguage = 'en' | 'id';

interface UIState {
  // Theme & Language Preferences
  isDarkMode: boolean;
  language: AppLanguage;

  // Gmail Backup Destination
  gmailAccount: string;
  lastBackupTime: string | null;

  // Navigation / Selection
  selectedTripId: string | null;
  activeFilterTab: TripFilterTab;
  
  // Ephemeral Search & Filter
  itemSearchQuery: string;
  selectedCategoryFilter: string | null;

  // Dialogs & Sheets
  isNewTripModalOpen: boolean;
  isAddItemModalOpen: boolean;

  // Temporary Toast Feedback
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;

  // Actions
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
  setLanguage: (lang: AppLanguage) => void;
  setGmailAccount: (email: string) => void;
  setLastBackupTime: (time: string | null) => void;
  setSelectedTripId: (id: string | null) => void;
  setActiveFilterTab: (tab: TripFilterTab) => void;
  setItemSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (category: string | null) => void;
  setNewTripModalOpen: (open: boolean) => void;
  setAddItemModalOpen: (open: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Default states: Dark mode off, Language English (as explicitly requested)
  isDarkMode: false,
  language: 'en',
  gmailAccount: 'traveler.tripory@gmail.com',
  lastBackupTime: null,

  selectedTripId: null,
  activeFilterTab: 'all',
  itemSearchQuery: '',
  selectedCategoryFilter: null,
  isNewTripModalOpen: false,
  isAddItemModalOpen: false,
  toast: null,

  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setTheme: (dark) => set({ isDarkMode: dark }),
  setLanguage: (lang) => set({ language: lang }),
  setGmailAccount: (email) => set({ gmailAccount: email }),
  setLastBackupTime: (time) => set({ lastBackupTime: time }),

  setSelectedTripId: (id) => set({ selectedTripId: id }),
  setActiveFilterTab: (tab) => set({ activeFilterTab: tab }),
  setItemSearchQuery: (query) => set({ itemSearchQuery: query }),
  setSelectedCategoryFilter: (category) => set({ selectedCategoryFilter: category }),
  setNewTripModalOpen: (open) => set({ isNewTripModalOpen: open }),
  setAddItemModalOpen: (open) => set({ isAddItemModalOpen: open }),
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
