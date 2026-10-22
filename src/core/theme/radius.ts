/**
 * Tripory Radius Tokens
 */

export const radius = {
  /** 6px: Badge / compact tags */
  sm: 6,
  /** 10px: Button / input fields */
  md: 10,
  /** 16px: Card / containers / panels */
  lg: 16,
  /** 24px: Hero cards / feature blocks */
  xl: 24,
  /** 999px: Full pill / circular avatars */
  full: 999,
} as const;

export type Radius = typeof radius;
