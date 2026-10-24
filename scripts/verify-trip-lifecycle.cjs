const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

function load(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unmocked dependency ${name} in ${relativePath}`);
  }, module, module.exports);
  return module.exports;
}

async function main() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const native = {
    getFirstSync: (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    getAllSync: (sql, ...params) => sqlite.prepare(sql).all(...params),
    runSync: (sql, ...params) => sqlite.prepare(sql).run(...params),
    execSync: (sql) => sqlite.exec(sql),
    isInTransactionSync: () => sqlite.isTransaction,
    withTransactionSync: (work) => { sqlite.exec('BEGIN'); try { const result = work(); sqlite.exec('COMMIT'); return result; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
    withTransactionAsync: async (work) => { sqlite.exec('BEGIN'); try { await work(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
  };
  const client = { getNativeDatabase: () => native };
  const { MIGRATIONS } = load('src/db/migrations/migrator.ts', { '../client': client, '@/core/utils': { logger: {} } });
  for (const step of MIGRATIONS) {
    try { sqlite.exec(step.sql); } catch (error) { if (!error.message.includes('duplicate column')) throw error; }
  }
  const guards = load('src/db/repositories/trip-editability.ts', { '../client': client });
  const schedule = load('src/core/utils/destination-schedule.ts');
  assert.equal(schedule.getDestinationDate({ dayNumber: 3 }, '2026-10-30'), '2026-11-01', 'Legacy dates cross month boundaries safely');
  assert.equal(schedule.getDestinationDate({ dayNumber: 3, plannedDate: '2026-11-05' }, '2026-10-30'), '2026-11-05', 'An edited date overrides the legacy day');
  assert.equal(schedule.getDestinationDate({ dayNumber: 2 }, '2026-12-31'), '2027-01-01');
  for (const value of ['00:00', '16:30', '23:59']) assert.equal(schedule.isValidDestinationTime(value), true);
  for (const value of ['24:00', '12:60', '9:00', '16.30', '']) assert.equal(schedule.isValidDestinationTime(value), false);
  assert.ok(native.getAllSync('PRAGMA table_info(destinations)').some((column) => column.name === 'planned_date'), 'Schedule migration adds persistent date storage');
  const validation = load('src/domains/trip-closure/validation.ts');
  const { computeReadiness } = load('src/domains/packing/readiness.ts');
  const { calculateReturnSummary } = load('src/domains/return-check/calculator.ts');
  for (const state of ['planned', 'packed', 'available', 'used']) assert.throws(() => validation.requireFinalItemStatuses([{ state }]));
  validation.requireFinalItemStatuses([{ state: 'returned' }, { state: 'missing' }]);
  validation.requireFinalItemStatuses([]);
  assert.equal(calculateReturnSummary([{ state: 'used' }]).missingCount, 0, 'An unreviewed item is not automatically missing');
  assert.equal(calculateReturnSummary([{ state: 'used' }]).allAccounted, false);
  assert.equal(computeReadiness([{ state: 'missing', priority: 'must_have' }]).isReadyForDeparture, false);
  assert.equal(computeReadiness([{ state: 'packed', priority: 'must_have', plannedDestinationId: null }]).isReadyForDeparture, true);

  const tripRepository = {
    getById: async (id) => native.getFirstSync('SELECT id, name, destination, start_date AS startDate, end_date AS endDate, status, notes, cover_photo_path AS coverPhotoPath, has_missing_items AS hasMissingItems, updated_at AS updatedAt FROM trips WHERE id = ?', id),
    update: async (id, updates) => { guards.assertTripEditable(id); native.runSync('UPDATE trips SET has_missing_items = ? WHERE id = ?', updates.hasMissingItems, id); },
    updateStatus: async (id, status, flags) => { guards.assertTripEditable(id); native.runSync('UPDATE trips SET status = ?, is_archived = ?, has_missing_items = ? WHERE id = ?', status, flags.isArchived, flags.hasMissingItems, id); },
  };
  const packingRepository = {
    getByTripId: async (id) => native.getAllSync('SELECT id, trip_id AS tripId, item_id AS itemId, custom_name AS customName, category, quantity, state, priority, planned_destination_id AS plannedDestinationId, notes FROM trip_items WHERE trip_id = ?', id),
    getActualUsages: async () => [],
  };
  let serial = 0;
  const copiedPhotos = [];
  let failCopy = false;
  const { archiveRepository } = load('src/db/repositories/archive.repository.ts', {
    'expo-file-system/legacy': { documentDirectory: 'file:///private/', getInfoAsync: async () => ({ exists: true }), makeDirectoryAsync: async () => {}, copyAsync: async (copy) => { if (failCopy) throw new Error('Photo copy failed'); copiedPhotos.push(copy); } },
    '../client': client, './trip.repository': { tripRepository }, './packing.repository': { packingRepository },
    './destination.repository': { destinationRepository: { getByTripId: async () => [] } },
    './moment.repository': { momentRepository: { getByTripId: async () => [] } },
    './item.repository': { itemRepository: { getAll: async () => [{ id: 'inventory', imageUri: 'file:///inventory/photo.jpg' }] } },
    '@/core/utils/id': { generateId: () => `test-${++serial}` },
  });
  const { tripClosureService } = load('src/domains/trip-closure/service.ts', {
    '@/db/repositories/trip.repository': { tripRepository }, '@/db/repositories/packing.repository': { packingRepository },
    '@/db/repositories/archive.repository': { archiveRepository }, '@/db/client': client,
    '@/db/repositories/trip-editability': guards, './validation': validation,
  });
  function seed(id, state) {
    native.runSync("INSERT INTO trips (id,name,destination,start_date,end_date,status,notes,created_at,updated_at) VALUES (?,?,'Bogor','2026-10-24','2026-10-25','ongoing','Original trip notes','now','now')", id, `Trip ${id}`);
    native.runSync("INSERT OR IGNORE INTO items (id,name,category,quantity,created_at,updated_at) VALUES ('inventory','Original inventory item','Clothing',1,'now','now')");
    native.runSync("INSERT INTO trip_items (id,trip_id,item_id,custom_name,category,state,quantity,created_at,updated_at) VALUES (?,?,'inventory','Original trip item','Clothing',?,1,'now','now')", `item-${id}`, id, state);
  }
  seed('pending', 'used');
  await assert.rejects(tripClosureService.closeTrip({ tripId: 'pending' }), /Review every item/);
  assert.equal((await tripRepository.getById('pending')).status, 'ongoing');
  assert.equal(archiveRepository.get('pending'), null);
  native.runSync("INSERT INTO destinations (id,trip_id,name,created_at) VALUES ('test-stop','pending','Stop','now')");
  const realPacking = load('src/db/repositories/packing.repository.ts', {
    'drizzle-orm': { eq: (column, value) => ({ column, value }), and: (...clauses) => clauses },
    '../client': { getNativeDatabase: () => native, db: { update: () => ({ set: (values) => ({ where: (where) => ({ run: () => native.runSync('UPDATE trip_items SET state = ?, updated_at = ? WHERE id = ?', values.state, values.updatedAt, where.value) }) }) }) } },
    '../schema/trip-items': { tripItems: { id: 'id' } }, '../schema/destination-usages': { destinationUsages: {} },
    '@/core/utils/id': { generateId: () => `event-${++serial}` }, './trip-editability': guards,
  }).packingRepository;
  for (const state of ['used', 'packed', 'missing', 'packed']) await realPacking.updateItemState('item-pending', state, 'test-stop');
  assert.deepEqual(native.getAllSync("SELECT state FROM item_events WHERE trip_id = 'pending' ORDER BY rowid").map((row) => row.state), ['used', 'packed', 'missing', 'packed']);
  assert.equal(native.getFirstSync("SELECT destination_id FROM item_events WHERE state = 'missing'").destination_id, 'test-stop');
  // A visit save also runs in a transaction; item-state writes must not start a nested BEGIN.
  await native.withTransactionAsync(async () => { await realPacking.updateItemState('item-pending', 'returned', 'test-stop'); });
  const recovered = await tripClosureService.closeTrip({ tripId: 'pending' });
  assert.equal(recovered.missingItemsCount, 0);
  assert.equal(archiveRepository.get('pending').events.some((event) => event.state === 'missing'), true);
  assert.equal(archiveRepository.get('pending').items[0].state, 'returned');
  seed('closed', 'missing');
  const result = await tripClosureService.closeTrip({ tripId: 'closed' });
  assert.equal(result.missingItemsCount, 1);
  assert.equal((await tripRepository.getById('closed')).status, 'completed');
  const saved = archiveRepository.get('closed');
  assert.equal(saved.items[0].state, 'missing');
  assert.match(saved.items[0].imageUri, /trip-archives\/closed\//);
  assert.equal(copiedPhotos.length, 2);
  assert.throws(() => guards.assertTripEditable('closed'), /read-only/);
  assert.throws(() => guards.assertTripRecordEditable('trip_items', 'item-closed'), /read-only/);
  assert.throws(() => native.runSync("UPDATE trips SET notes = 'Changed' WHERE id = 'closed'"), /read-only/);
  assert.throws(() => native.runSync("UPDATE trip_archives SET payload = '{}' WHERE trip_id = 'closed'"), /read-only/);
  await assert.rejects(tripClosureService.closeTrip({ tripId: 'closed' }), /read-only/);
  native.runSync("UPDATE items SET name = 'New inventory name', image_uri = 'file:///new.jpg' WHERE id = 'inventory'");
  assert.equal((await archiveRepository.getCompleted('closed')).items[0].customName, 'Original trip item');
  assert.equal((await archiveRepository.getCompleted('closed')).trip.notes, 'Original trip notes');
  seed('rollback', 'returned');
  failCopy = true;
  await assert.rejects(tripClosureService.closeTrip({ tripId: 'rollback' }), /Photo copy failed/);
  assert.equal((await tripRepository.getById('rollback')).status, 'ongoing');
  assert.equal(archiveRepository.get('rollback'), null);
  const { tripRepository: planningRepository } = load('src/db/repositories/trip.repository.ts', {
    'drizzle-orm': require('drizzle-orm'), '../client': client,
    '../schema/trips': { trips: {} }, '@/core/utils/id': { generateId: () => 'unused' },
    './trip-editability': guards, 'expo-file-system/legacy': {},
  });
  planningRepository.getAll = async () => native.getAllSync('SELECT id, status FROM trips');
  const beforeRemoval = native.getFirstSync("SELECT payload FROM trip_archives WHERE trip_id = 'closed'").payload;
  await planningRepository.removeFromPlanning('closed');
  await planningRepository.removeFromPlanning('closed');
  assert.equal((await planningRepository.getForPlanning()).some((trip) => trip.id === 'closed'), false);
  assert.equal((await planningRepository.getAll()).some((trip) => trip.id === 'closed'), true, 'Album queries retain removed plans');
  assert.equal(native.getFirstSync("SELECT payload FROM trip_archives WHERE trip_id = 'closed'").payload, beforeRemoval, 'Removing a plan preserves the full archive including photos');
  assert.equal((await archiveRepository.getCompleted('closed')).items[0].state, 'missing');
  await planningRepository.removeFromPlanning('rollback');
  assert.equal((await planningRepository.getActiveTrip()), undefined, 'Removed active plans do not become the Home active trip');
  assert.equal(native.getFirstSync("SELECT state FROM trip_items WHERE trip_id = 'rollback'").state, 'returned', 'Removing a plan does not cascade into its items');
  native.runSync("DELETE FROM trips WHERE id = 'closed'");
  assert.equal(archiveRepository.get('closed'), null);
  assert.equal((await planningRepository.getPlanningRemovalIds()).includes('closed'), false);
  sqlite.close();
  console.log('PASS: trip lifecycle, immutable archives, planning-only removal preserving albums and items, and deletion cascade.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
