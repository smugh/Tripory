# Agenda feature — v1.2.0

Tripory has two planning domains: Trips and Agendas. An Agenda is a manual, lightweight activity list and is not a Trip, Trip Memory, or personal inventory record.

## Templates

- **Shopping:** checklist, quantity/unit, optional estimate, shelf price, and receipt price. The displayed estimated total uses shelf price when present, otherwise the estimate; receipt total is the sum of entered receipt prices.
- **Short Trip:** manually entered date, place/route, notes, and preparation checklist. No automated recommendations or Trip Memories.
- **Activity / Event:** manually entered date, location, notes, and preparation checklist.

All metadata is optional except the agenda title. Agenda entries and items are stored as text/numeric values in SQLite. No Agenda media is created.

## Lifecycle

Create → update checklist and optional prices → finish → save as a read-only local record or delete. Finishing is allowed with incomplete items. Active agendas and saved records are reachable from the Agendas view linked from the Trips list.

## Navigation

The central create action offers Trip or Agenda. Both create forms include Trip/Agenda tabs. Draft form state is kept in memory while switching between those forms.

## Local schema

- `agendas`: type, title, optional date/location/notes, active/saved state, timestamps.
- `agenda_items`: name, quantity/unit, checklist state, optional estimate/shelf/receipt prices, notes, order.

Database migration 10 creates these tables and indexes. Deleting an agenda cascades to its checklist rows.
