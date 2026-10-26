import { create } from 'zustand';
import { AgendaType } from '@/domains/agenda/types';

export interface TripCreationDraft {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes: string;
  selectedPresetId: string | null;
  includeStarterPack: boolean;
}

export interface AgendaCreationDraft {
  type: AgendaType;
  title: string;
  date: string;
  location: string;
  notes: string;
  items: { name: string; quantity: number; unit: string; estimatedPrice: number | null; notes: string }[];
}

interface PlanningDraftState {
  trip: TripCreationDraft | null;
  agenda: AgendaCreationDraft | null;
  setTrip: (draft: TripCreationDraft) => void;
  setAgenda: (draft: AgendaCreationDraft) => void;
  clearTrip: () => void;
  clearAgenda: () => void;
}

export const usePlanningDraftStore = create<PlanningDraftState>((set) => ({
  trip: null,
  agenda: null,
  setTrip: (trip) => set({ trip }),
  setAgenda: (agenda) => set({ agenda }),
  clearTrip: () => set({ trip: null }),
  clearAgenda: () => set({ agenda: null }),
}));
