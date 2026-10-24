/** Legacy itineraries retain the date originally implied by their day number. */
export function getDestinationDate(
  destination: { plannedDate?: string | null; dayNumber: number },
  tripStartDate?: string,
): string {
  if (destination.plannedDate) return destination.plannedDate;
  if (!tripStartDate) return '';
  const date = new Date(`${tripStartDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Math.max(0, destination.dayNumber - 1));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDestinationDate(date: string, language: 'en' | 'id', includeYear = false): string {
  if (!date) return '';
  return new Date(`${date}T12:00:00`).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}),
  });
}

export function isValidDestinationTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
