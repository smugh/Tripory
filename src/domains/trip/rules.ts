import { TripStatus } from './types';

export function validateTripDates(startDate: string, endDate: string): { isValid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Format tanggal perjalanan tidak valid.' };
  }
  if (end < start) {
    return { isValid: false, error: 'Tanggal kepulangan tidak boleh lebih awal dari keberangkatan.' };
  }
  return { isValid: true };
}

export function canTransitionTripStatus(from: TripStatus, to: TripStatus): boolean {
  const transitions: Record<TripStatus, TripStatus[]> = {
    draft: ['preparing', 'ready', 'ongoing'],
    preparing: ['ready', 'ongoing', 'draft'],
    ready: ['ongoing', 'preparing'],
    ongoing: ['completed'],
    completed: ['ongoing'],
  };
  return transitions[from]?.includes(to) ?? false;
}
