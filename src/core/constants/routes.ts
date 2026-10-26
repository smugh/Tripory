export const ROUTES = {
  HOME: '/',
  TRIPS: '/trips',
  ITEMS: '/items',
  MORE: '/more',
  TRIP_DETAIL: (id: string) => `/trip/${id}` as const,
  TRIP_NEW: '/trip/new',
  AGENDAS: '/agenda',
  AGENDA_NEW: '/agenda/new',
  AGENDA_DETAIL: (id: string) => `/agenda/${id}` as const,
} as const;
