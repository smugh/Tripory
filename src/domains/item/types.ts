/**
 * Domain: Item (Persistent Personal Inventory)
 */

export interface PersonalItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonalItemInput {
  name: string;
  category: string;
  quantity?: number;
  notes?: string;
}
