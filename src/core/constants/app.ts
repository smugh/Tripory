export const APP_CONFIG = {
  name: 'Tripory',
  version: '1.2.0',
  defaultDbName: 'tripory.db',
  storageMediaDir: 'tripory/media',
  minTouchTarget: 44,
  maxContentWidth: 768,
} as const;

export const DROP_OFF_CATEGORY = 'Drop Off';

export const ITEM_CATEGORIES = [
  'Clothing',
  'Toiletries',
  'Electronics',
  'Medicine',
  'Documents',
  'Gear & Activities',
  'Drop Off',
  'Others',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
