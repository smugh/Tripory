/**
 * Tripory Spacing Tokens
 * Rhythm 8px dengan micro-step 4px
 */

export const spacing = {
  /** 4px: Micro icon/text gap */
  1: 4,
  /** 8px: Compact padding / control gap */
  2: 8,
  /** 12px: Input internal spacing */
  3: 12,
  /** 16px: Default content gap & page horizontal margin */
  4: 16,
  /** 20px: Card internal spacing */
  5: 20,
  /** 24px: Section gap */
  6: 24,
  /** 32px: Major separation */
  8: 32,
  /** 40px: Large section */
  10: 40,
  /** 48px: Page-level spacing */
  12: 48,
  /** 64px: Hero / rhythmic whitespace */
  16: 64,
} as const;

export type Spacing = typeof spacing;
