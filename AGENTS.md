# AGENTS.md

## Project Overview
Student gradebook web application ("Llibre de Notes d'Alumnes") for teachers.
Node.js + Express + SQLite (sql.js) + EJS + Bootstrap 5.

## Quick Start
```bash
npm install
npm run init-db   # Creates db/notbook.db with schema
npm start         # http://localhost:3000
```

## Critical: SQLite Driver
**Use `sql.js` (pure JS), NOT `better-sqlite3` or `sqlite3`.**
Node v26.4.0 has no native bindings for either native SQLite package.

sql.js API pattern (used in all routes):
```javascript
const stmt = db.prepare(sql);
stmt.bind(params);
while (stmt.step()) { results.push(stmt.getAsObject()); }
stmt.free();
// Mutations: db.run(sql, params)
```

Auto-save every 5 seconds. Manual save on operations via `saveDatabase()`.

## Commands
- `npm start` - Production server
- `npm run dev` - Development with nodemon
- `npm run init-db` - Reset database from `db/init.sql`

## Architecture
- `server.js` - Express entry point, middleware, route mounting
- `db/database.js` - sql.js connection manager
- `db/init.sql` - Full schema (7 tables)
- `routes/` - CRUD routes (all async with `runQuery`/`runExec` helpers)
- `views/` - EJS templates with `header.ejs`/`footer.ejs` partials
- `views/assignatures/avaluacio.ejs` - Main gradebook view (most complex)

## Key Tables
- `alumnes`, `aules`, `assignatures` (with `actiu` flag)
- `alumne_assignatura` (enrollment, has `observacions`)
- `tipus_nota` (grade types, has `tipus` field: 'Nota'|'Comportament')
- `notes` (grades, has `tipus` from tipus_nota)
- `documents` (file uploads)

## Conventions
- All routes use async/await with sql.js helpers
- Grade weights: `pes_trimestre` (term), `pes_global` (year)
- `tipus_nota.trimestre` NULL = applies to all trimesters
- Catalan language throughout
- Bootstrap 5 for UI, Bootstrap Icons for icons

## Gotchas
- When adding DB columns: kill server first, alter table, then restart (auto-save overwrites in-memory DB)
- `notesPerAlumne[id][tipusNotaId]` returns `{ nota, observacions }` object, not raw value
- Redirects after create: tipus_nota → `/avaluacio`, not subject detail
- Print CSS: use `.no-print` class to hide interactive elements
