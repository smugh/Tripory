export const APP_CONFIG = {
  name: 'Tripory',
  version: '1.0.0',
  defaultDbName: 'tripory.db',
  storageMediaDir: 'tripory/media',
  minTouchTarget: 44,
  maxContentWidth: 768,
} as const;

export const ITEM_CATEGORIES = [
  'Clothing',
  'Toiletries',
  'Electronics',
  'Medicine',
  'Documents',
  'Gear & Activities',
  'Others',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
