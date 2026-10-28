# SQLite architecture: before and after migration

This document compares the database architecture before the Capacitor SQLite migration with the current implementation.

## Behaviour comparison

| Area | Before | Current implementation |
| --- | --- | --- |
| Android/iOS driver | `cordova-sqlite-storage` | `@capacitor-community/sqlite` |
| Browser driver | `wa-sqlite` with an IndexedDB block-based VFS | Capacitor SQLite web implementation, backed by `jeep-sqlite` and `sql.js` |
| Browser persistence | SQLite blocks in `moodleapp-idb` | Database snapshots in `jeepSqliteStore` |
| Application-facing API | `CoreDB` and `SQLiteDB` | The same entry points |
| Connection contract | Cordova `SQLiteObject` types | App-owned `SQLiteDBConnection` contract |
| Native opening | Open or create through Cordova | Establish provenance and lifecycle authorisation before opening; validate integrity and required schemas before caller SQL |
| Native database adoption | Not applicable | Resumable same-directory renaming of database files and recovery companions |
| Connection ownership | Primarily delegated to each backend | Shared connection state and operation queues per logical database |
| Initialisation failures | Some schema-error paths logged failures and continued | New providers propagate schema failures; native readiness failures prevent normal startup |
| Existing browser data | Read from `moodleapp-idb` | Retained untouched, but not imported or used as a fallback |

Logical database names remain `MoodleMobile` for the global database and `Site-<id>` for site databases. Feature services do not need to know which driver implements these names.

Native provider selection is active. Outstanding release checks include broader platform coverage, exhaustive interruption and filesystem-failure testing, authenticated navigation after upgrade, and physical downloaded-file retention.

## Architecture before migration

```text
Feature services
    |
    v
CoreDB -> SQLiteDB
    |
    +-- Android/iOS -> Cordova SQLite connection -> native SQLite file
    |
    +-- Browser emulator provider -> WaSQLiteObject -> wa-sqlite
                                                       |
                                                       v
                                                  moodleapp-idb
```

The browser provider was registered by the emulator module. The native provider created deferred Cordova connections after platform readiness. `SQLiteDB` supplied the higher-level query and record helpers used by the app.

## Current architecture

```text
CoreDbProvider is the native default through providedIn: 'root'
emulator.module.ts overrides CoreDB with platform selection
    |
    +-- db.ts (Android/iOS)
    |       |
    |       +-- sqlite-native-lifecycle.ts
    |       |       |
    |       |       +-- sqlite-migration-startup.ts: shared name discovery
    |       |       |
    |       |       +-- sqlite-migration.ts: resumable rename protocol
    |       |               |
    |       |               v
    |       |       SQLiteMigration.ts -> Java / Swift / C file primitives
    |       |
    |       +-- capacitor-sqlite-manager.ts
    |               |
    |               v
    |       capacitor-sqlite-object.ts -> Capacitor SQLite native plugin
    |
    +-- emulator/services/db.ts (CoreDbServiceMock)
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

Both providers inherit the common database service and return connections consumed by `SQLiteDB`. The native filesystem bridge manages migration files and metadata; it does not execute application SQL.

Browser selection belongs to the emulator module, as before migration. Production replaces this module with an empty stub, so production builds retain the native default and do not register the browser provider.

### File responsibilities

| File | Responsibility |
| --- | --- |
| [database/index.ts](src/core/services/database/index.ts) | Registers shared site schemas, not the database driver. |
| [emulator.module.ts](src/core/features/emulator/emulator.module.ts) | Overrides `CoreDbProvider` with native/browser selection for builds that include the emulator. |
| [db.ts](src/core/services/db.ts) | Default native Capacitor provider, wrapper caching, synchronous `getDB()`, query logging and the shared `ready()` barrier. Coordinates native readiness, global opening, site reconciliation, schema completion and deletion through the lifecycle and connection manager. |
| [sqlitedb.ts](src/core/classes/sqlitedb.ts) | Application-facing SQL, table and record helpers, plus the app-owned connection contract. |
| [capacitor-sqlite-manager.ts](src/core/classes/capacitor-sqlite-manager.ts) | Owns native registrations and shared connection state; coordinates opening, closing and deletion. Handles obtained before deletion cannot access a later database with the same name. |
| [capacitor-sqlite-object.ts](src/core/classes/capacitor-sqlite-object.ts) | Adapts plugin queries to `rows.length`, `rows.item()`, `rowsAffected` and `insertId`; serialises SQL and implements atomic batches. Browser use supplies an additional persistence callback. |
| [sqlite-native-lifecycle.ts](src/core/classes/sqlite-native-lifecycle.ts) | Discovers and preflights databases; authorises adoption, creation and deletion; validates integrity and required schemas; persists lifecycle states. |
| [sqlite-migration-startup.ts](src/core/classes/sqlite-migration-startup.ts) | Contains the earlier rename-only coordinator and the database-name discovery helper reused by the current lifecycle. The lifecycle orchestrates the active startup path. |
| [sqlite-migration.ts](src/core/classes/sqlite-migration.ts) | Records principal/companion mappings and resumes interrupted renames without overwriting conflicting files. |
| [SQLiteMigration.ts](capacitor-plugin-moodleapp/src/plugins/SQLiteMigration.ts) | Typed interface to native file inventory, exclusive renaming, durable metadata and authorised removal. |
| [SQLiteMigrationPlugin.java](capacitor-plugin-moodleapp/android/src/main/java/com/moodle/moodlemobile/plugins/SQLiteMigrationPlugin.java) | Android implementation of the filesystem bridge. |
| [sqlite-migration.c](capacitor-plugin-moodleapp/android/src/main/cpp/sqlite-migration.c) | Android exclusive-rename primitive using `renameat2(RENAME_NOREPLACE)`. |
| [SQLiteMigrationPlugin.swift](capacitor-plugin-moodleapp/ios/Sources/SQLiteMigrationPlugin/SQLiteMigrationPlugin.swift) | iOS filesystem bridge, including exclusive renaming using `renamex_np(RENAME_EXCL)`. |
| [emulator/services/db.ts](src/core/features/emulator/services/db.ts) | Implements `CoreDbServiceMock`: initialises web storage, shares connections and queues, and waits for persistence before acknowledging writes. |

## Native startup and schema installation

Previously, database access waited for platform readiness and then opened the named database through Cordova. Opening could create a missing database.

The current startup sequence is:

1. [initialize-databases.ts](src/core/initializers/initialize-databases.ts) awaits `CoreDB.ready()`.
2. The connection manager closes native registrations retained across a WebView reload, then the native lifecycle inventories database files and persistent lifecycle records before allowing connections.
3. Existing Cordova databases are adopted by renaming their principal and recovery companions in the same directory.
4. The connection manager verifies that native existence matches lifecycle authorisation before opening through Capacitor SQLite.
5. SQLite recovers WAL or rollback-journal state during opening. The lifecycle checks integrity and required Moodle schema structures before exposing the connection to callers.
6. Normal app initialisation installs or upgrades Moodle schemas.
7. `completeDatabaseInitialization()` validates and seals explicitly created databases after successful schema installation.

Logout reloads the WebView when site plugins need to be unloaded. JavaScript connection state is then lost, but native registrations can survive. The startup barrier calls `checkConnectionsConsistency` with an empty connection list to close those registrations before filesystem recovery or new connections. It runs once per manager and never deletes database files.

Example physical filenames:

```text
MoodleMobile          -> MoodleMobileSQLite.db
MoodleMobile-wal      -> MoodleMobileSQLite.db-wal
MoodleMobile-shm      -> MoodleMobileSQLite.db-shm
MoodleMobile-journal  -> MoodleMobileSQLite.db-journal
```

Only companions that exist and pass validation are included. An unexpected collision or an established database whose principal is missing causes an error, not silent creation of an empty replacement.

Native adoption checks for `CoreSitesProvider` schema metadata and the required tables, including `wscache_2` for site databases. It does not impose an upper schema-version limit or migrate the legacy `wscache` table.

Moodle's `schema_versions` table remains separate from SQLite `user_version` and the plugin's connection version. Existing app schema migrations still run through the normal schema coordinator.

### New sites and deletion

[sites.ts](src/core/services/sites.ts) explicitly prepares a database for an authenticated new site and confirms completion after its schemas have been installed. [app-db.ts](src/core/services/app-db.ts) and the site flows propagate schema errors through the selected provider.

Deletion drains pending operations, closes owned connections, persists deletion intent, removes the authorised file set through the native bridge and retains a deletion tombstone. Restart can resume an interrupted deletion. Old connection handles remain invalid even if the same logical name is explicitly created again.

### Startup failure handling

[main.ts](src/main.ts) logs bootstrap failures to the console. There is no dedicated startup-error screen or restart button; failed initialisation can leave the app without a usable interface.

No automatic fallback to Cordova or an empty database is performed.

## Browser persistence

The browser backend now uses SQLite in memory and persists snapshots through `saveToStore`.

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

The SQLite migration renames database files; it does not relocate downloaded content. Retaining `filepool_files` rows is necessary but does not prove that the corresponding physical files remain readable.

Current validation preserved filepool metadata and standalone Documents test files. It did not verify an actual filepool download through an in-place upgrade. Physical downloaded-file retention and offline access remain open checks.

## Rollback limitation

Cordova SQLite dependencies are still installed, but this is not an automatic or safe data rollback mechanism. Once database files have been renamed and written through Capacitor, simply selecting the old Cordova provider may create or open different files.

The migration does not keep an independent original database copy and must not automatically roll back to the old filenames after new writes.
