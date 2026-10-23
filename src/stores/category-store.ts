import { create } from 'zustand';
import { categoryService } from '@/services/category.service';

interface CategoryStoreState {
  categories: string[];
  refreshCategories: () => void;
  addCategory: (name: string) => { success: boolean; error?: string };
  deleteCategory: (name: string) => { success: boolean; error?: string };
}

export const useCategoryStore = create<CategoryStoreState>((set) => ({
  categories: categoryService.getCategories(),
  refreshCategories: () => {
    set({ categories: categoryService.getCategories() });
  },
  addCategory: (name: string) => {
    const res = categoryService.addCategory(name);
    if (res.success) {
      set({ categories: res.categories });
    }
    return { success: res.success, error: res.error };
  },
  deleteCategory: (name: string) => {
    const res = categoryService.deleteCategory(name);
    if (res.success) {
      set({ categories: res.categories });
    }
    return { success: res.success, error: res.error };
  },
}));
