import { en, TranslationDictionary } from './en';
import { id } from './id';
import { useUIStore } from '@/stores/ui-store';

export type Language = 'en' | 'id';

export const dictionaries: Record<Language, TranslationDictionary> = {
  en,
  id,
};

/**
 * Hook untuk mendapatkan dictionary terjemahan aktif.
 * Mengikuti state `language` di `useUIStore` (default: 'en').
 */
export function useI18n() {
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const dict = dictionaries[language] || dictionaries.en;

  /**
   * Helper format string dengan placeholder dinamis (misal: {count})
   */
  const format = (template: string, params?: Record<string, string | number>): string => {
    if (!params) return template;
    let res = template;
    for (const [k, v] of Object.entries(params)) {
      res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return res;
  };

  return {
    t: dict,
    language,
    setLanguage,
    format,
  };
}

export * from './en';
