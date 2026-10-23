/**
 * Tripory Design System - Color Foundations & Semantic Tokens
 * Berdasarkan Tripory Design System v1.0 & Brand Color Guide
 * Mendukung Light Mode dan Dark Mode (Nocturnal Travel Theme).
 */
import { useUIStore } from '@/stores/ui-store';

export const palette = {
  // Brand Identity Colors - Refined for visual harmony and eye comfort
  primaryNavy: '#0A214D',
  primaryCoral: '#E56353',
  triporyBlue: '#1E6FB3',
  deepBlue: '#0E295E',
  sunsetOrange: '#EB947D',
  warmYellow: '#ECC574',

  // Neutrals (Gray Scale)
  white: '#FFFFFF',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Dark Mode Nocturnal Palette - Soft Traveler's Navy (Refined, comfortable contrast)
  darkBg: '#111C30',
  darkCard: '#1B2A47',
  darkCardElevated: '#24375D',
  darkMuted: '#1E2E4E',
  darkBorder: '#283C64',

  // Semantics
  success: '#16A34A',
  successLight: '#DCFCE7',
  error: '#E11D48',
  errorLight: '#FFE4E6',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#2563EB',
  infoLight: '#DBEAFE',
} as const;

export const lightColors = {
  brand: {
    navy: palette.primaryNavy,
    coral: palette.primaryCoral,
    blue: palette.triporyBlue,
    deep: palette.deepBlue,
    sunset: palette.sunsetOrange,
    yellow: palette.warmYellow,
  },
  surface: {
    page: palette.gray50,
    card: palette.white,
    cardElevated: palette.white,
    muted: palette.gray100,
    active: palette.infoLight,
    overlay: 'rgba(7, 27, 77, 0.45)',
  },
  border: {
    default: palette.gray200,
    muted: palette.gray100,
    strong: palette.gray300,
    focus: palette.triporyBlue,
    error: palette.error,
  },
  text: {
    primary: palette.gray900,
    secondary: palette.gray500,
    muted: palette.gray400,
    inverse: palette.white,
    brand: palette.primaryNavy,
    accent: palette.primaryCoral,
  },
  status: {
    success: palette.success,
    successLight: palette.successLight,
    error: palette.error,
    errorLight: palette.errorLight,
    warning: palette.warning,
    warningLight: palette.warningLight,
    info: palette.info,
    infoLight: palette.infoLight,
  },
} as const;

export const darkColors = {
  brand: {
    navy: '#93C5FD', // Light sky blue for brand title/text in dark mode
    coral: palette.primaryCoral,
    blue: '#38BDF8',
    deep: '#1E293B',
    sunset: palette.sunsetOrange,
    yellow: palette.warmYellow,
  },
  surface: {
    page: palette.darkBg,
    card: palette.darkCard,
    cardElevated: palette.darkCardElevated,
    muted: palette.darkMuted,
    active: 'rgba(56, 189, 248, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.75)',
  },
  border: {
    default: palette.darkBorder,
    muted: palette.darkMuted,
    strong: '#364F7E',
    focus: '#38BDF8',
    error: palette.error,
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: palette.primaryNavy,
    brand: '#93C5FD',
    accent: palette.primaryCoral,
  },
  status: {
    success: palette.success,
    successLight: '#064E3B',
    error: palette.error,
    errorLight: '#450A0A',
    warning: palette.warning,
    warningLight: '#78350F',
    info: palette.info,
    infoLight: '#1E3A8A',
  },
} as const;

export const colors = lightColors;
export type ThemeColors = typeof lightColors;

/**
 * Hook to retrieve reactive theme tokens based on current dark mode state
 */
export function useThemeColors(): typeof lightColors {
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  return (isDarkMode ? darkColors : lightColors) as typeof lightColors;
}
