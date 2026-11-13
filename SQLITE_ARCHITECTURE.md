# SQLite architecture: before and after migration

This document compares the database architecture before the Capacitor SQLite migration with the current implementation.

## Behaviour comparison

| Area | Before | Current implementation |
| --- | --- | --- |
| Android/iOS driver | `cordova-sqlite-storage` | `@capacitor-community/sqlite` |
| Browser driver | `wa-sqlite` with an IndexedDB block-based VFS | Capacitor SQLite web implementation, backed by `jeep-sqlite` and `sql.js` |
| Browser persistence | SQLite blocks in `moodleapp-idb` | Database snapshots in `jeepSqliteStore` |
| Application-facing API | `CoreDB` and `SQLiteDB` | `CoreDB` and `SQLiteDB` |
| Connection contract | Cordova `SQLiteObject` types | App-owned `SQLiteDBConnection` contract |
| Native opening | Open or create through Cordova | Check database inventory and explicitly authorise creation; validate integrity and required schemas before caller SQL |
| Native database adoption | Not applicable | Capacitor SQLite discovers and moves legacy databases into its database directory, adding the plugin suffix |
| Connection ownership | Primarily delegated to each backend | Shared connection state and operation queues per logical database |
| Initialisation failures | Some schema-error paths logged failures and continued | New providers propagate schema failures; native readiness failures prevent normal startup |
| Existing browser data | Read from `moodleapp-idb` | Retained untouched, but not imported or used as a fallback |

Logical database names remain `MoodleMobile` for the global database and `Site-<id>` for site databases. Feature services do not need to know which driver implements these names.

On builds that include the emulator module, it selects the native service on mobile and the browser implementation elsewhere. Native lifecycle records and migration journals are not persisted. An empty native inventory is treated as a fresh installation, and interrupted operations may require manual recovery.

## Architecture before migration

```text
Feature services
    |
    v
CoreDB (CoreDbService) -> SQLiteDB
    |
    +-- Android/iOS -> cordova-sqlite-storage -> native SQLite file
    |
    +-- Browser emulator provider -> wa-sqlite -> IndexedDB block-based VFS
                                                |
                                                v
                                          moodleapp-idb
```

The browser provider was registered by the emulator module. The native provider created deferred Cordova connections after platform readiness. `SQLiteDB` supplied the higher-level query and record helpers used by the app.

## Current architecture

```text
CoreDbService is the native default through providedIn: 'root'
emulator.module.ts selects CoreDbService for mobile or CoreDbServiceMock for browser
    |
    +-- services/db.ts (Android/iOS)
    |       |
    |       +-- sqlite-native-lifecycle.ts
    |       |       +-- legacy database migration and lifecycle validation
    |       |
    |       +-- capacitor-sqlite-manager.ts
    |               |
    |               v
    |       capacitor-sqlite-object.ts -> Capacitor SQLite native plugin
    |
    +-- features/emulator/services/db.ts (CoreDbServiceMock)
            |
            v
    capacitor-sqlite-object.ts -> Capacitor SQLite web implementation
                                       |
                                       v
                               jeep-sqlite / sql.js
                                       |
                                       v
                                 jeepSqliteStore
```

Both services inherit the common database service and return connections consumed by `SQLiteDB`. Native migration uses `getMigratableDbList()` and `moveDatabasesAndAddSuffix()` from Capacitor SQLite; there is no app-specific native filesystem bridge.

Browser selection belongs to the emulator module, as before migration. Production replaces this module with an empty stub, so production builds retain the native default and do not register the browser provider.

### File responsibilities

| File | Responsibility |
| --- | --- |
| [database/index.ts](src/core/services/database/index.ts) | Registers shared site schemas, not the database driver. |
| [emulator.module.ts](src/core/features/emulator/emulator.module.ts) | Selects the native service on mobile and `CoreDbServiceMock` on browser builds when the emulator module is included. |
| [db.ts](src/core/services/db.ts) | Default native `CoreDbService`, wrapper caching, synchronous `getDB()` and the shared `ready()` barrier. Coordinates native readiness, global opening, site reconciliation, schema completion and deletion through the lifecycle and connection manager. Exports the `CoreDB` singleton. |
| [sqlitedb.ts](src/core/classes/sqlitedb.ts) | Application-facing SQL, table and record helpers, plus the app-owned connection contract. |
| [capacitor-sqlite-manager.ts](src/core/classes/capacitor-sqlite-manager.ts) | Releases native registrations retained across WebView reloads, owns shared connection state and queues, and coordinates opening, closing and plugin-mediated deletion. Handles obtained before deletion cannot access a later database with the same name. |
| [capacitor-sqlite-object.ts](src/core/classes/capacitor-sqlite-object.ts) | Adapts plugin queries to `rows.length`, `rows.item()`, `rowsAffected` and `insertId`; serialises SQL and implements atomic batches. Browser use supplies an additional persistence callback. |
| [sqlite-native-lifecycle.ts](src/core/classes/sqlite-native-lifecycle.ts) | Migrates legacy databases, authorises database creation in memory for the current process, validates integrity and required schemas, reconciles saved sites, and enforces deletion constraints. It does not persist lifecycle state. |
| [db.ts](src/core/features/emulator/services/db.ts) | Implements `CoreDbServiceMock`: initialises the browser store, shares connections and queues, and waits for snapshots to persist before acknowledging writes. |

## Native startup and schema installation

Previously, database access waited for platform readiness and then opened the named database through Cordova. Opening could create a missing database.

The native startup sequence is:

1. [initialize-databases.ts](src/core/initializers/initialize-databases.ts) awaits `CoreDB.ready()`.
2. The connection manager calls `checkConnectionsConsistency()` with an empty connection list to release registrations retained across a WebView reload.
3. The native lifecycle asks Capacitor SQLite for legacy databases and moves them into the plugin's database directory with the expected suffix.
   On iOS, the plugin can also list unrelated entries from Documents; only recognised Moodle database names are passed to its move operation.
4. The native lifecycle inventories databases. A missing global database is an error when other databases remain; an empty inventory is treated as a fresh installation.
5. Before an existing database is exposed, the manager checks its presence and SQLite integrity. The lifecycle checks required Moodle schema structures and saved-site database files.
6. Normal app initialisation installs or upgrades Moodle schemas.
7. `completeDatabaseInitialization()` validates the completed schema and clears any process-local creation authorisation.

Logout can reload the WebView when site plugins need to be unloaded. JavaScript connection state is then lost, but native registrations can survive. The startup barrier releases those registrations before listing databases or opening new connections. It runs once per manager and does not delete database files.

Example physical filenames:

```text
MoodleMobile          -> MoodleMobileSQLite.db
MoodleMobile-wal      -> MoodleMobileSQLite.db-wal
MoodleMobile-shm      -> MoodleMobileSQLite.db-shm
MoodleMobile-journal  -> MoodleMobileSQLite.db-journal
```

Capacitor SQLite owns the file migration and suffix handling. Migration errors are propagated. After startup, a missing saved database is treated as an error rather than silently replaced.

Native adoption checks for `CoreSitesProvider` schema metadata and the required tables, including `wscache_2` for site databases. It does not impose an upper schema-version limit or migrate the legacy `wscache` table.

Moodle's `schema_versions` table remains separate from SQLite `user_version` and the plugin's connection version. Existing app schema migrations still run through the normal schema coordinator.

### New sites and deletion

[sites.ts](src/core/services/sites.ts) explicitly prepares a database for an authenticated new site and confirms completion after its schemas have been installed. [app-db.ts](src/core/services/app-db.ts) and the site flows propagate schema errors through the selected provider.

New database creation is authorised in memory only for the current process. Deletion drains pending operations, closes owned connections, checks the database inventory and calls Capacitor SQLite's `deleteDatabase()` operation. The global database cannot be deleted while site databases remain. No migration, creation, or deletion journals are persisted; interrupted operations may require manual recovery. Old connection handles remain invalid even if the same logical name is explicitly created again.

### Startup failure handling

[main.ts](src/main.ts) logs bootstrap failures to the console. There is no dedicated startup-error screen or restart button; failed initialisation can leave the app without a usable interface.

No automatic fallback to Cordova or an empty database is performed.

## Browser persistence

The browser backend uses SQLite in memory and persists snapshots through `saveToStore`. `CoreDbServiceMock` initialises the `jeep-sqlite` custom element and its store before opening connections. The emulator module selects this implementation outside mobile platforms.

- A write resolves only after its snapshot has been saved.
- An atomic batch saves after `COMMIT`, not between statements.
- A persistence failure blocks further access to that database until reload.
- Deleted connection handles cannot access a recreated database.
- The unpatched `jeep-sqlite` 2.8.0 implementation removes the previous snapshot before saving its replacement. A failed replacement can therefore lose previously persisted data. Some asynchronous opening errors can also leave the opening promise pending. These are known browser limitations; native SQLite is unaffected.
- The local `sql-wasm.wasm` asset is copied through [angular.json](angular.json); runtime setup is owned by the browser provider.

The old `moodleapp-idb` database is neither opened nor deleted. Existing browser data is not available through the new backend. Its eventual removal is a separate cleanup task.

## SQL compatibility

Feature services continue using `SQLiteDB` helpers. The adapter preserves row accessors, insert IDs, affected-row metadata and atomic rollback for supported batches.

The new adapter explicitly rejects caller-managed transaction SQL, `RETURNING`, multiple statements in one entry, and maintenance statements inside atomic batches. These forms are not silently redirected to another backend. The migration source review found no production callers requiring them.

## Downloaded files are separate from SQLite files

```text
Site database
    |
    +-- filepool_files: download metadata

Platform filesystem storage root
    |
    +-- sites/<siteId>/filepool/<fileId>[.<extension>]: downloaded content
```

[filepool.ts](src/core/services/filepool.ts) relates metadata to downloaded content. [file.ts](src/core/services/file.ts) resolves platform roots and performs filesystem operations:

- Android uses the parent of Capacitor's `Directory.External` files directory to preserve the existing Cordova root.
- iOS uses the app's Documents directory.

The SQLite migration moves database files through Capacitor SQLite; it does not relocate downloaded content. Retaining `filepool_files` rows is necessary but does not prove that the corresponding physical files remain readable.

Current validation preserved filepool metadata and standalone Documents test files. It did not verify an actual filepool download through an in-place upgrade. Physical downloaded-file retention and offline access remain open checks.

## Rollback limitation

Cordova SQLite dependencies may still be present for compatibility, but this is not an automatic or safe data rollback mechanism. Once database files have been moved and written through Capacitor, simply selecting the old Cordova provider may create or open different files.

The migration does not keep an independent original database copy and must not automatically roll back after new writes.
