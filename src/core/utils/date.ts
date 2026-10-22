/**
 * Tripory Date & Duration Utilities
 */

export function calculateDurationDays(startDateIso: string, endDateIso: string): number {
  const start = new Date(startDateIso);
  const end = new Date(endDateIso);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 1;
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

export function formatTripDurationLabel(startDateIso: string, endDateIso: string): string {
  const days = calculateDurationDays(startDateIso, endDateIso);
  const nights = Math.max(0, days - 1);
  return `${days} Hari ${nights} Malam`;
}

export function formatDateRange(startDateIso: string, endDateIso: string): string {
  const start = new Date(startDateIso);
  const end = new Date(endDateIso);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return `${startDateIso} - ${endDateIso}`;
  }

  const startFormatted = start.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
  const endFormatted = end.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${startFormatted} – ${endFormatted}`;
}
