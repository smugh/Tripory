import { getNativeDatabase } from '@/db/client';
import { ITEM_CATEGORIES } from '@/core/constants';

const CATEGORIES_METADATA_KEY = 'custom_item_categories';

export const categoryService = {
  getCategories(): string[] {
    try {
      const db = getNativeDatabase();
      const row = db.getFirstSync<{ value: string }>(
        'SELECT value FROM app_metadata WHERE key = ?',
        [CATEGORIES_METADATA_KEY]
      );
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback if db not yet initialized
    }
    return [...ITEM_CATEGORIES];
  },

  saveCategories(categories: string[]): void {
    try {
      const db = getNativeDatabase();
      const now = new Date().toISOString();
      db.runSync(
        'INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)',
        [CATEGORIES_METADATA_KEY, JSON.stringify(categories), now]
      );
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  },

  addCategory(name: string): { success: boolean; categories: string[]; error?: string } {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, categories: this.getCategories(), error: 'Category name cannot be empty' };
    }
    const current = this.getCategories();
    const exists = current.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, categories: current, error: 'Category already exists' };
    }
    const updated = [...current, trimmed];
    this.saveCategories(updated);
    return { success: true, categories: updated };
  },

  deleteCategory(name: string): { success: boolean; categories: string[]; error?: string } {
    const current = this.getCategories();
    if (current.length <= 1) {
      return { success: false, categories: current, error: 'At least one category is required' };
    }
    const updated = current.filter((c) => c.toLowerCase() !== name.toLowerCase());
    this.saveCategories(updated);
    return { success: true, categories: updated };
  },
};
