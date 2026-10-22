import { PersonalItem, CreatePersonalItemInput } from './types';
import { itemRepository } from '@/db/repositories/item.repository';

export const itemService = {
  async getAllItems(): Promise<PersonalItem[]> {
    return itemRepository.getAll();
  },

  async createItem(input: CreatePersonalItemInput): Promise<PersonalItem> {
    if (!input.name.trim()) {
      throw new Error('Nama barang tidak boleh kosong.');
    }

    return itemRepository.create({
      name: input.name.trim(),
      category: input.category.trim(),
      quantity: Math.max(1, input.quantity ?? 1),
      notes: input.notes?.trim() ?? null,
    });
  },

  async deleteItem(id: string): Promise<void> {
    await itemRepository.delete(id);
  },
};
