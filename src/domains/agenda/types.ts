export type AgendaType = 'shopping' | 'short_trip' | 'event';
export type AgendaStatus = 'active' | 'saved';

export interface AgendaItemDraft {
  name: string;
  quantity?: number;
  unit?: string | null;
  estimatedPrice?: number | null;
  shelfPrice?: number | null;
  actualPrice?: number | null;
  notes?: string | null;
}

export interface CreateAgendaInput {
  type: AgendaType;
  title: string;
  date?: string | null;
  location?: string | null;
  notes?: string | null;
  items?: AgendaItemDraft[];
}

export interface AgendaWithItems {
  id: string;
  type: AgendaType;
  title: string;
  date: string | null;
  location: string | null;
  notes: string | null;
  status: AgendaStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  items: {
    id: string;
    agendaId: string;
    name: string;
    quantity: number;
    unit: string | null;
    isDone: number;
    estimatedPrice: number | null;
    shelfPrice: number | null;
    actualPrice: number | null;
    notes: string | null;
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
  }[];
}
