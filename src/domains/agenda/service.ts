import { agendaRepository } from '@/db/repositories/agenda.repository';
import { CreateAgendaInput } from './types';

export const agendaService = {
  create(input: CreateAgendaInput): string {
    const title = input.title.trim();
    if (!title) throw new Error('Judul agenda wajib diisi.');
    return agendaRepository.create({ ...input, title });
  },
  save(id: string): void { agendaRepository.save(id); },
  delete(id: string): void { agendaRepository.delete(id); },
};
