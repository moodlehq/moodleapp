// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CoreCapacitorSQLiteLifecycle } from '@classes/capacitor-sqlite-manager';
import { CoreError } from '@classes/errors/error';
import { CoreQueueRunner } from '@classes/queue-runner';
import { SQLiteDBConnection } from '@classes/sqlitedb';
import { CoreSQLiteMigration } from '@classes/sqlite-migration';
import { CoreSQLiteMigrationStartup, CoreSQLiteMigrationStartupStorage } from '@classes/sqlite-migration-startup';

const suffixes = ['', '-wal', '-shm', '-journal'];

/**
 * Durable native provenance and deletion recovery. Not connected to the production provider yet.
 * New database creation and completed schema installation require explicit calls from the app lifecycle.
 */
export class CoreSQLiteNativeLifecycle implements CoreCapacitorSQLiteLifecycle {

    protected initialization?: Promise<void>;
    protected queue = new CoreQueueRunner();
    protected failure?: unknown;
    protected failed = false;
    protected migration: CoreSQLiteMigration;

    constructor(protected storage: CoreSQLiteNativeLifecycleStorage) {
        this.migration = new CoreSQLiteMigration(storage);
    }

    /**
     * Preflight all records before any move or deletion, then recover while all connections remain closed.
     *
     * @returns Shared, failure-latched startup barrier.
     */
    ready(): Promise<void> {
        this.initialization ??= this.initialize();

        return this.initialization;
    }

    /**
     * Authorise a global database only on a genuinely empty installation, never after recorded data loss.
     *
     * @returns Promise resolved when the global database has valid existing or fresh-install provenance.
     */
    prepareGlobalDatabase(): Promise<void> {
        return this.run(async () => {
            const files = await this.storage.list();
            const names = CoreSQLiteMigrationStartup.getDatabaseNames(files, await this.storage.listJournalNames());
            if (names.length === 0) {
                await this.reserve('MoodleMobile', files);

                return;
            }
            const record = await this.readRecord('MoodleMobile');
            if (record?.state === 'deleted' || record?.state === 'deleting') {
                throw new CoreError('SQLite global database cannot be recreated automatically.');
            }
            if (record) {
                this.checkRecordFiles(record, files);
            } else {
                await this.migration.validate('MoodleMobile', files);
            }
        });
    }

    /**
     * Prepare an authenticated site absent from the saved-site list. Retry recorded incomplete creation,
     * reuse a validated existing orphan, or explicitly reserve a new database after completed deletion.
     *
     * @param siteId Authenticated site ID, already checked against the saved-site list by the caller.
     * @returns Promise resolved when site schema installation may start.
     */
    prepareSiteDatabase(siteId: string): Promise<void> {
        return this.run(async () => {
            const name = 'Site-' + siteId;
            this.checkName(name);
            const files = await this.storage.list();
            const record = await this.readRecord(name);
            if (record?.state === 'deleting') {
                throw new CoreError('SQLite site deletion has not completed.');
            }
            if (record && record.state !== 'deleted') {
                this.checkRecordFiles(record, files);
            } else if (!record && await this.storage.readJournal(name) !== undefined) {
                await this.migration.validate(name, files);
            } else {
                await this.reserve(name, files);
            }
        });
    }

    /**
     * Reconcile retained deletion tombstones before saved-site/config caches are initialised.
     * Verify every remaining saved site's provenance so a missing database cannot be recreated at login.
     *
     * @param connection Already opened and validated global connection.
     * @returns Promise resolved after atomic saved-site/current-site cleanup and inventory validation.
     */
    reconcileSites(connection: SQLiteDBConnection): Promise<void> {
        return this.run(async () => {
            const tables = await connection.executeSql('SELECT name FROM sqlite_master WHERE type = ?', ['table']);
            const tableNames = Array.from({ length: tables.rows.length }, (_, index) => tables.rows.item(index)?.name);
            if (!tableNames.includes('schema_versions')) {
                if (await this.canResumeGlobalInitialization(connection, tableNames)) {
                    return;
                }
                throw new CoreError('SQLite global schema is missing during site reconciliation.');
            }
            const versions = await connection.executeSql(
                'SELECT version FROM schema_versions WHERE name = ?',
                ['CoreSitesProvider'],
            );
            const version = versions.rows.item(0)?.version;
            if (versions.rows.length === 0 && await this.canResumeGlobalInitialization(connection, tableNames)) {
                return;
            }
            if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
                throw new CoreError('SQLite saved-site schema version is missing or invalid.');
            }
            const table = version < 2 ? 'sites' : 'sites_2';
            const sites = await connection.executeSql(`SELECT id FROM ${table}`);
            const files = await this.storage.list();
            const statements: [string, string[]][] = [];
            const deleted = new Set<string>();
            for (const name of await this.storage.listJournalNames()) {
                const record = await this.readRecord(name);
                if (name.startsWith('Site-') && record?.state === 'deleted') {
                    this.checkRecordFiles(record, files);
                    const id = name.slice('Site-'.length);
                    deleted.add(id);
                    statements.push([`DELETE FROM ${table} WHERE id = ?`, [id]]);
                    if (tableNames.includes('core_config')) {
                        statements.push(['DELETE FROM core_config WHERE name = ? AND value = ?', ['current_site_id', id]]);
                    }
                }
            }
            for (let index = 0; index < sites.rows.length; index++) {
                const id = sites.rows.item(index)?.id;
                if (typeof id !== 'string') {
                    throw new CoreError('Invalid saved Moodle site ID.');
                }
                const name = 'Site-' + id;
                if (deleted.has(id)) {
                    continue;
                }
                const record = await this.readRecord(name);
                if (record) {
                    if (record.state === 'deleting' || record.state === 'creating') {
                        throw new CoreError('Saved SQLite site has an incomplete database lifecycle.');
                    }
                    this.checkRecordFiles(record, files);
                } else {
                    await this.migration.validate(name, files);
                }
            }
            await connection.sqlBatch(statements);
        });
    }

    /**
     * Resume a known fresh installation interrupted between table creation and schema-version persistence.
     * Never skip reconciliation when a saved account already exists.
     *
     * @param connection Open global connection.
     * @param tables Existing SQLite tables.
     * @returns Whether normal app installation may safely finish the empty saved-site schema.
     */
    protected async canResumeGlobalInitialization(connection: SQLiteDBConnection, tables: unknown[]): Promise<boolean> {
        const global = await this.readRecord('MoodleMobile');
        if (global?.origin !== 'created' || global.state !== 'created') {
            return false;
        }
        for (const table of ['sites', 'sites_2']) {
            if (!tables.includes(table)) {
                continue;
            }
            const rows = await connection.executeSql(`SELECT id FROM ${table} LIMIT 1`);
            if (rows.rows.length !== 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Reserve a genuinely new file set before the plugin is permitted to create it.
     * This must be called only by fresh-install/new-site flows, never as a missing-database fallback.
     *
     * @param name Logical database name.
     * @returns Promise resolved after durable authorisation.
     */
    reserveCreation(name: string): Promise<void> {
        return this.run(async () => {
            this.checkName(name);
            const files = await this.storage.list();
            const record = await this.readRecord(name);
            if (record && record.state !== 'deleted') {
                throw new CoreError('SQLite database already has active provenance.');
            }
            await this.reserve(name, files);
        });
    }

    /**
     * Persist a new reservation after checking the entire absent file set and global/site ordering.
     *
     * @param name Logical database name.
     * @param files Native inventory.
     */
    protected async reserve(name: string, files: string[]): Promise<void> {
        this.checkFiles(name, files, 'absent');
        if (name === 'MoodleMobile' && files.some(file => file.startsWith('Site-'))) {
            throw new CoreError('SQLite global database cannot be recreated while site files exist.');
        }
        if (name !== 'MoodleMobile' && !files.includes('MoodleMobileSQLite.db')) {
            throw new CoreError('SQLite global database must exist before creating site databases.');
        }
        await this.storage.writeJournal(name, { version: 2, name, origin: 'created', state: 'creating' });
    }

    /**
     * Authorise only recorded creation or a complete adopted/created principal.
     *
     * @param name Logical database name.
     * @returns Whether the plugin must find an existing file or create the reserved one.
     */
    prepareOpen(name: string): Promise<'existing' | 'create'> {
        return this.run(async () => {
            this.checkName(name);
            const record = await this.readRecord(name);
            const files = await this.storage.list();
            if (!record) {
                await this.migration.validate(name, files);

                return 'existing';
            }
            if (record.state === 'deleting' || record.state === 'deleted') {
                throw new CoreError('SQLite database was deleted; explicit creation authorisation is required.');
            }
            this.checkRecordFiles(record, files);

            return files.includes(name + 'SQLite.db') ? 'existing' : 'create';
        });
    }

    /**
     * Validate recovered SQL before caller access. Only explicitly new databases may have incomplete schemas.
     *
     * @param name Logical database name.
     * @param connection Open adapter owned by the manager.
     * @returns Promise resolved after integrity/provenance validation and durable state update.
     */
    validateOpen(name: string, connection: SQLiteDBConnection): Promise<void> {
        return this.run(async () => {
            const record = await this.readRecord(name);
            const files = await this.storage.list();
            this.checkFiles(name, files, 'existing');
            if (record?.state === 'deleted' || record?.state === 'deleting') {
                throw new CoreError('SQLite database cannot be validated during deletion.');
            }
            await this.checkIntegrity(connection);
            if (!record || record.state === 'ready') {
                await this.checkSchema(name, connection);
            }
            if (!record) {
                await this.migration.validate(name, files);
                await this.storage.writeJournal(name, { version: 2, name, origin: 'adopted', state: 'ready' });
            } else if (record.state === 'creating') {
                await this.storage.writeJournal(name, { ...record, state: 'created' });
            }
        });
    }

    /**
     * Seal a new database only after the app has installed its required schemas successfully.
     *
     * @param name Logical database name.
     * @param connection Direct open adapter supplied by the manager, never a deferred manager handle.
     * @returns Promise resolved after schema verification and durable completion.
     */
    completeInitialization(name: string, connection: SQLiteDBConnection): Promise<void> {
        return this.run(async () => {
            const record = await this.readRecord(name);
            if (!record || (record.state !== 'created' && record.state !== 'ready')) {
                throw new CoreError('SQLite database creation has not been validated.');
            }
            this.checkFiles(name, await this.storage.list(), 'existing');
            await this.checkIntegrity(connection);
            await this.checkSchema(name, connection);
            await this.storage.writeJournal(name, { ...record, state: 'ready' });
        });
    }

    /**
     * Record intent before removing any files. Even an absent name gets a retained tombstone.
     *
     * @param name Logical database name.
     * @returns Whether an authorised principal remains.
     */
    prepareDelete(name: string): Promise<'existing' | 'absent'> {
        return this.run(async () => {
            this.checkName(name);
            const record = await this.readRecord(name);
            const files = await this.storage.list();
            if (name === 'MoodleMobile' && files.some(file => file.startsWith('Site-'))) {
                throw new CoreError('SQLite global database cannot be deleted while site files exist.');
            }
            if (!record) {
                if (files.some(file => this.belongsTo(name, file)) || await this.storage.readJournal(name) !== undefined) {
                    await this.migration.validate(name, files);
                }
            } else {
                this.checkRecordFiles(record, files);
            }
            await this.storage.writeJournal(name, {
                version: 2, name, origin: record?.origin ?? 'adopted', state: 'deleting',
            });

            return files.includes(name + 'SQLite.db') ? 'existing' : 'absent';
        });
    }

    /**
     * Delete only under a durable intent, without opening/recovering a database.
     *
     * @param name Logical database name.
     * @returns Promise resolved after durable removal of the complete file set.
     */
    removeDatabase(name: string): Promise<void> {
        return this.run(async () => {
            const record = await this.readRecord(name);
            if (record?.state !== 'deleting') {
                throw new CoreError('SQLite deletion intent is missing.');
            }
            await this.storage.removeDatabaseFiles(name);
        });
    }

    /**
     * Confirm no principal or companion survives before retaining a tombstone.
     *
     * @param name Logical database name.
     * @returns Promise resolved after durable deletion completion.
     */
    completeDelete(name: string): Promise<void> {
        return this.run(async () => {
            const record = await this.readRecord(name);
            if (record?.state !== 'deleting') {
                throw new CoreError('SQLite deletion intent is missing.');
            }
            this.checkFiles(name, await this.storage.list(), 'absent');
            await this.storage.writeJournal(name, { ...record, state: 'deleted' });
        });
    }

    /**
     * Inventory and validate the entire set before resuming any persistent operation.
     */
    protected async initialize(): Promise<void> {
        const files = await this.storage.list();
        const names = CoreSQLiteMigrationStartup.getDatabaseNames(files, await this.storage.listJournalNames());
        const records = new Map<string, LifecycleRecord | undefined>();
        for (const name of names) {
            const record = await this.readRecord(name);
            records.set(name, record);
            if (!record) {
                await this.migration.validate(name, files);
            } else {
                this.checkRecordFiles(record, files);
            }
        }
        const active = names.filter(name => !['deleted', 'deleting'].includes(records.get(name)?.state ?? ''));
        if (active.length && !active.includes('MoodleMobile')) {
            throw new CoreError('SQLite migration global database is missing.');
        }
        if (!files.includes('MoodleMobile') && !files.includes('MoodleMobileSQLite.db') &&
                active.some(name => name !== 'MoodleMobile' &&
                    (files.includes(name) || files.includes(name + 'SQLite.db')))) {
            throw new CoreError('SQLite migration global database is missing.');
        }
        for (const name of names) {
            const record = records.get(name);
            if (!record) {
                await this.migration.rename(name);
            } else if (record.state === 'deleting') {
                await this.storage.removeDatabaseFiles(name);
                this.checkFiles(name, await this.storage.list(), 'absent');
                await this.storage.writeJournal(name, { ...record, state: 'deleted' });
            }
        }
    }

    /**
     * Serialise metadata operations and latch failures rather than allowing uncertain state to be reused.
     *
     * @param operation Authorised lifecycle operation.
     * @returns Operation result.
     */
    protected run<T>(operation: () => Promise<T>): Promise<T> {
        return this.queue.run(async () => {
            await this.ready();
            if (this.failed) {
                throw this.failure;
            }
            try {
                return await operation();
            } catch (error) {
                this.failed = true;
                this.failure = error;
                throw error;
            }
        });
    }

    /**
     * Validate v2 state; legacy records are interpreted only by the original rename protocol.
     *
     * @param name Logical database name.
     * @returns Validated lifecycle record or undefined for legacy/unrecorded databases.
     */
    protected async readRecord(name: string): Promise<LifecycleRecord | undefined> {
        this.checkName(name);
        const value = await this.storage.readJournal(name);
        if (value === undefined || (typeof value === 'object' && value !== null && 'version' in value && value.version === 1)) {
            return;
        }
        if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 2 ||
                !('name' in value) || value.name !== name || !('origin' in value) ||
                (value.origin !== 'adopted' && value.origin !== 'created') ||
                !('state' in value) ||
                (value.state !== 'creating' && value.state !== 'created' && value.state !== 'ready' &&
                    value.state !== 'deleting' && value.state !== 'deleted') ||
                (value.origin === 'adopted' && (value.state === 'creating' || value.state === 'created'))) {
            throw new CoreError('Invalid SQLite lifecycle record.');
        }

        return { version: 2, name, origin: value.origin, state: value.state };
    }

    /**
     * Refuse stale legacy files, unknown companions and missing established principals.
     *
     * @param name Logical database name.
     * @param files Native inventory.
     * @param principal Required principal state.
     * @param deleting Whether interrupted deletion may leave orphaned companions.
     */
    protected checkFiles(name: string, files: string[], principal: 'existing' | 'absent' | 'optional', deleting = false): void {
        const owned = files.filter(file => this.belongsTo(name, file));
        const expected = suffixes.map(suffix => name + 'SQLite.db' + suffix);
        const exists = owned.includes(expected[0]);
        if (owned.some(file => !expected.includes(file)) ||
                (principal === 'existing' && !exists) ||
                (principal === 'absent' && owned.length > 0) ||
                (!exists && owned.length > 0 && !deleting)) {
            throw new CoreError('SQLite lifecycle file set is missing or conflicting.');
        }
    }

    /**
     * Apply the principal/companion rules for one validated durable state.
     *
     * @param record Persisted lifecycle state.
     * @param files Native inventory.
     */
    protected checkRecordFiles(record: LifecycleRecord, files: string[]): void {
        const principal = record.state === 'deleted' ? 'absent'
            : record.state === 'creating' || record.state === 'deleting' ? 'optional' : 'existing';
        this.checkFiles(record.name, files, principal, record.state === 'deleting');
    }

    /**
     * Match this database without accepting paths or confusing the plugin suffix with a logical name.
     *
     * @param name Logical database name.
     * @param file Inventoried filename.
     * @returns Whether the file belongs to this database namespace.
     */
    protected belongsTo(name: string, file: string): boolean {
        return file === name || file.startsWith(name + '-') || file === name + 'SQLite.db' ||
            file.startsWith(name + 'SQLite.db-');
    }

    /**
     * Reject unsafe names even for records with no surviving files.
     *
     * @param name Logical database name.
     */
    protected checkName(name: string): void {
        if (name !== 'MoodleMobile' && /^Site-[a-zA-Z0-9_-]+$/.exec(name)?.[0] !== name) {
            throw new CoreError('Invalid SQLite lifecycle database name.');
        }
    }

    /**
     * Require SQLite recovery/integrity success, never merely a successful plugin open.
     *
     * @param connection Open connection.
     */
    protected async checkIntegrity(connection: SQLiteDBConnection): Promise<void> {
        const result = await connection.executeSql('PRAGMA integrity_check');
        if (result.rows.length !== 1 || result.rows.item(0)?.integrity_check !== 'ok') {
            throw new CoreError('SQLite database integrity validation failed.');
        }
    }

    /**
     * Check required Moodle schema/data surfaces without modifying them or conflating user_version with Moodle versions.
     *
     * @param name Logical database name.
     * @param connection Open connection.
     */
    protected async checkSchema(name: string, connection: SQLiteDBConnection): Promise<void> {
        const versions = await connection.executeSql('SELECT name, version FROM schema_versions');
        let sitesVersion = 0;
        for (let index = 0; index < versions.rows.length; index++) {
            const row = versions.rows.item(index);
            if (!row || typeof row.name !== 'string' || !row.name || typeof row.version !== 'number' ||
                    !Number.isSafeInteger(row.version) || row.version < 1) {
                throw new CoreError('Invalid Moodle SQLite schema versions.');
            }
            if (row.name === 'CoreSitesProvider') {
                sitesVersion = row.version;
            }
        }
        if (!sitesVersion) {
            throw new CoreError('Required Moodle SQLite schema is missing.');
        }
        if (name === 'MoodleMobile') {
            const sites = await connection.executeSql(sitesVersion < 2
                ? 'SELECT id, siteUrl FROM sites' : 'SELECT id, siteUrl FROM sites_2');
            for (let index = 0; index < sites.rows.length; index++) {
                const row = sites.rows.item(index);
                if (!row || typeof row.id !== 'string' || !/^Site-[a-zA-Z0-9_-]+$/.test('Site-' + row.id) ||
                        typeof row.siteUrl !== 'string' || !row.siteUrl) {
                    throw new CoreError('Invalid saved Moodle site data.');
                }
            }
        } else {
            await connection.executeSql('SELECT name, value FROM core_site_config LIMIT 1');
            await connection.executeSql('SELECT id, data FROM wscache_2 LIMIT 1');
        }
    }

}

type LifecycleRecord = {
    version: 2;
    name: string;
    origin: 'adopted' | 'created';
    state: 'creating' | 'created' | 'ready' | 'deleting' | 'deleted';
};

export type CoreSQLiteNativeLifecycleStorage = Omit<CoreSQLiteMigrationStartupStorage, 'writeJournal'> & {
    writeJournal(name: string, journal: unknown): Promise<void>;
    // Require a persisted v2 deletion intent, reject legacy/unknown files, unlink exact plugin files and fsync the directory.
    removeDatabaseFiles(name: string): Promise<void>;
};
