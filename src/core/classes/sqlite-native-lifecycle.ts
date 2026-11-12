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

import { CapacitorSQLite, CapacitorSQLitePlugin } from '@capacitor-community/sqlite';
import { CoreCapacitorSQLiteLifecycle } from '@classes/capacitor-sqlite-manager';
import { CoreError } from '@classes/errors/error';
import { CoreQueueRunner } from '@classes/queue-runner';
import { SQLiteDBConnection } from '@classes/sqlitedb';

/**
 * Migrate and validate native databases without persistent lifecycle metadata.
 * Interrupted database creation or deletion may need manual recovery.
 */
export class CoreSQLiteNativeLifecycle implements CoreCapacitorSQLiteLifecycle {

    protected initialization?: Promise<void>;
    protected queue = new CoreQueueRunner();
    protected creations = new Set<string>();

    constructor(protected sqlite: CoreSQLiteNativeLifecycleDriver = CapacitorSQLite) {}

    /**
     * Share the one-time native startup barrier.
     *
     * @returns Promise resolved when migration is complete.
     */
    ready(): Promise<void> {
        this.initialization ??= this.migrate();

        return this.initialization;
    }

    /**
     * Move legacy databases before any connection opens.
     *
     * @returns Promise resolved when migration is complete.
     */
    protected async migrate(): Promise<void> {
        let result: Awaited<ReturnType<CoreSQLiteNativeLifecycleDriver['getMigratableDbList']>>;
        try {
            result = await this.sqlite.getMigratableDbList({ folderPath: 'default' });
        } catch (error) {
            if (isSQLiteEmptyDatabaseListError(error, 'getMigratableDbList')) {
                return;
            }

            throw error;
        }
        const values = result.values;
        if (!Array.isArray(values)) {
            throw new CoreError('SQLite migration returned an invalid database list.');
        }
        const databases: string[] = [];
        const names: string[] = [];
        for (const value of values) {
            if (typeof value !== 'string' || value.includes('/') || value.includes('\\')) {
                throw new CoreError('SQLite migration returned an invalid database list.');
            }

            const isDatabase = value === 'MoodleMobile' || value.startsWith('MoodleMobile.') ||
                value.startsWith('Site-') || value.endsWith('.db');
            if (!isDatabase) {
                // iOS lists all entries in Documents, including app folders such as "sites".
                continue;
            }

            const name = value.endsWith('.db') ? value.slice(0, -3) : value;
            if (name !== 'MoodleMobile' && /^Site-[a-zA-Z0-9_-]+$/.exec(name)?.[0] !== name) {
                throw new CoreError('SQLite migration returned an invalid database list.');
            }

            databases.push(value);
            names.push(name);
        }
        if (new Set(names).size !== names.length) {
            throw new CoreError('SQLite migration returned a duplicate database.');
        }
        if (databases.length === 0) {
            return;
        }
        if (names.some(name => name.startsWith('Site-')) && !names.includes('MoodleMobile')) {
            throw new CoreError('SQLite migration global database is missing.');
        }

        await this.sqlite.moveDatabasesAndAddSuffix({ dbNameList: databases });
    }

    /**
     * Authorise the first global database only when no native databases exist.
     * An empty installation is treated as fresh; this is intentionally not distinguishable from total data loss.
     *
     * @returns Promise resolved when the global database may be opened.
     */
    prepareGlobalDatabase(): Promise<void> {
        return this.run(async () => {
            const names = await this.getDatabaseNames();
            if (names.includes('MoodleMobile')) {
                return;
            }
            if (names.length > 0) {
                throw new CoreError('SQLite global database is missing while other databases remain.');
            }
            this.creations.add('MoodleMobile');
        });
    }

    /**
     * Authorise an absent site database for the current process only.
     *
     * @param siteId Authenticated site ID.
     * @returns Promise resolved when creation may proceed.
     */
    prepareSiteDatabase(siteId: string): Promise<void> {
        return this.run(async () => {
            const name = this.siteDatabaseName(siteId);
            if (!await this.isDatabase('MoodleMobile')) {
                throw new CoreError('SQLite global database must exist before creating site databases.');
            }
            if (!await this.isDatabase(name)) {
                this.creations.add(name);
            }
        });
    }

    /**
     * Verify the saved-site table and ensure every saved site still has a database.
     *
     * @param connection Open global database.
     * @returns Promise resolved when saved sites match native databases.
     */
    reconcileSites(connection: SQLiteDBConnection): Promise<void> {
        return this.run(async () => {
            if (this.creations.has('MoodleMobile')) {
                return;
            }

            const sitesVersion = await this.getSitesVersion(connection);
            const table = sitesVersion < 2 ? 'sites' : 'sites_2';
            const sites = await connection.executeSql(`SELECT id FROM ${table}`);
            for (let index = 0; index < sites.rows.length; index++) {
                const id = sites.rows.item(index)?.id;
                if (typeof id !== 'string' || this.siteDatabaseName(id) !== `Site-${id}`) {
                    throw new CoreError('Invalid saved Moodle site ID.');
                }
                if (!await this.isDatabase(`Site-${id}`)) {
                    throw new CoreError(`SQLite database for saved site "${id}" is missing.`);
                }
            }
        });
    }

    /**
     * Permit opening an existing database or one explicitly authorised during this process.
     *
     * @param name Logical database name.
     * @returns Whether a database exists or is newly authorised.
     */
    prepareOpen(name: string): Promise<'existing' | 'create'> {
        return this.run(async () => {
            this.checkName(name);
            if (await this.isDatabase(name)) {
                return 'existing';
            }
            if (this.creations.has(name)) {
                return 'create';
            }

            throw new CoreError('SQLite database is missing; explicit creation authorisation is required.');
        });
    }

    /**
     * Validate recovered database integrity and schema before exposing an existing database.
     *
     * @param name Logical database name.
     * @param connection Open database connection.
     * @returns Promise resolved after validation.
     */
    validateOpen(name: string, connection: SQLiteDBConnection): Promise<void> {
        return this.run(async () => {
            await this.checkIntegrity(connection);
            if (!this.creations.has(name)) {
                await this.checkSchema(name, connection);
            }
        });
    }

    /**
     * Validate completed application schemas and finish the in-memory creation state.
     *
     * @param name Logical database name.
     * @param connection Open database connection.
     * @returns Promise resolved after schema validation.
     */
    completeInitialization(name: string, connection: SQLiteDBConnection): Promise<void> {
        return this.run(async () => {
            await this.checkIntegrity(connection);
            await this.checkSchema(name, connection);
            this.creations.delete(name);
        });
    }

    /**
     * Check the current database inventory before deletion.
     *
     * @param name Logical database name.
     * @returns Whether the database exists.
     */
    prepareDelete(name: string): Promise<'existing' | 'absent'> {
        return this.run(async () => {
            this.checkName(name);
            if (name === 'MoodleMobile' && (await this.getDatabaseNames()).some(database => database.startsWith('Site-'))) {
                throw new CoreError('SQLite global database cannot be deleted while site databases exist.');
            }

            return await this.isDatabase(name) ? 'existing' : 'absent';
        });
    }

    /**
     * Verify deletion and remove any in-memory creation authorisation.
     *
     * @param name Logical database name.
     * @returns Promise resolved after confirming the database is absent.
     */
    completeDelete(name: string): Promise<void> {
        return this.run(async () => {
            if (await this.isDatabase(name)) {
                throw new CoreError('SQLite database deletion did not complete.');
            }
            this.creations.delete(name);
        });
    }

    /**
     * Serialize lifecycle checks around the process-local creation set.
     *
     * @param operation Lifecycle operation.
     * @returns Operation result.
     */
    protected run<T>(operation: () => Promise<T>): Promise<T> {
        return this.queue.run(async () => {
            await this.ready();

            return operation();
        });
    }

    /**
     * List existing native database files.
     *
     * @returns Logical database names.
     */
    protected async getDatabaseNames(): Promise<string[]> {
        let result: Awaited<ReturnType<CoreSQLiteNativeLifecycleDriver['getDatabaseList']>>;
        try {
            result = await this.sqlite.getDatabaseList();
        } catch (error) {
            if (isSQLiteEmptyDatabaseListError(error, 'getDatabaseList')) {
                return [];
            }

            throw error;
        }
        const values = result.values;
        if (!Array.isArray(values)) {
            throw new CoreError('SQLite database list is invalid.');
        }

        return values.map(value => {
            if (typeof value !== 'string' || !value.endsWith('SQLite.db')) {
                throw new CoreError('SQLite database list contains an invalid name.');
            }

            const name = value.slice(0, -'SQLite.db'.length);
            this.checkName(name);

            return name;
        });
    }

    /**
     * Check whether one logical database exists.
     *
     * @param name Logical database name.
     * @returns Whether the database exists.
     */
    protected async isDatabase(name: string): Promise<boolean> {
        const result = await this.sqlite.isDatabase({ database: name });
        if (typeof result.result !== 'boolean') {
            throw new CoreError('SQLite existence check returned an invalid result.');
        }

        return result.result;
    }

    /**
     * Read and validate the Moodle site schema version.
     *
     * @param connection Open global database.
     * @returns Site schema version.
     */
    protected async getSitesVersion(connection: SQLiteDBConnection): Promise<number> {
        const versions = await connection.executeSql('SELECT version FROM schema_versions WHERE name = ?', ['CoreSitesProvider']);
        const version = versions.rows.item(0)?.version;
        if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
            throw new CoreError('SQLite saved-site schema version is missing or invalid.');
        }

        return version;
    }

    /**
     * Validate SQLite recovery before trusting stored rows.
     *
     * @param connection Open database connection.
     */
    protected async checkIntegrity(connection: SQLiteDBConnection): Promise<void> {
        const result = await connection.executeSql('PRAGMA integrity_check');
        if (result.rows.length !== 1 || result.rows.item(0)?.integrity_check !== 'ok') {
            throw new CoreError('SQLite database integrity validation failed.');
        }
    }

    /**
     * Validate required Moodle schema and saved-site records.
     *
     * @param name Logical database name.
     * @param connection Open database connection.
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
                if (!row || typeof row.id !== 'string' || this.siteDatabaseName(row.id) !== `Site-${row.id}` ||
                        typeof row.siteUrl !== 'string' || !row.siteUrl) {
                    throw new CoreError('Invalid saved Moodle site data.');
                }
            }
        } else {
            await connection.executeSql('SELECT name, value FROM core_site_config LIMIT 1');
            await connection.executeSql('SELECT id, data FROM wscache_2 LIMIT 1');
        }
    }

    /**
     * Validate and return the database name for a site ID.
     *
     * @param siteId Moodle site ID.
     * @returns Logical database name.
     */
    protected siteDatabaseName(siteId: string): string {
        const name = `Site-${siteId}`;
        this.checkName(name);

        return name;
    }

    /**
     * Reject unsafe or unexpected database names.
     *
     * @param name Logical database name.
     */
    protected checkName(name: string): void {
        if (name !== 'MoodleMobile' && /^Site-[a-zA-Z0-9_-]+$/.exec(name)?.[0] !== name) {
            throw new CoreError('Invalid SQLite database name.');
        }
    }

}

export type CoreSQLiteNativeLifecycleDriver = Pick<
    CapacitorSQLitePlugin,
    'getMigratableDbList' | 'moveDatabasesAndAddSuffix' | 'getDatabaseList' | 'isDatabase'
>;

/**
 * Check for the Capacitor plugin's explicit empty-directory response.
 *
 * @param error Plugin error.
 * @param method Database-list method.
 * @returns Whether the directory contains no databases.
 */
function isSQLiteEmptyDatabaseListError(
    error: unknown,
    method: 'getDatabaseList' | 'getMigratableDbList',
): boolean {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

    return message.trim() === `${method}: No databases available`;
}
