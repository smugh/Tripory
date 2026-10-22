export const ROUTES = {
  HOME: '/',
  TRIPS: '/trips',
  ITEMS: '/items',
  MORE: '/more',
  TRIP_DETAIL: (id: string) => `/trip/${id}` as const,
  TRIP_NEW: '/trip/new',
} as const;
