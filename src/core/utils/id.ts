/**
 * Utility untuk menghasilkan unique ID yang aman untuk penyimpanan lokal SQLite.
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const secondRandom = Math.random().toString(36).substring(2, 6);
  const id = `${timestamp}-${randomPart}-${secondRandom}`;
  return prefix ? `${prefix}_${id}` : id;
}
