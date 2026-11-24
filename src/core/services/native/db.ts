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

import { Injectable } from '@angular/core';

import { SQLiteDB, SQLiteDBConnection } from '@classes/native/sqlitedb';
import { makeSingleton } from '@singletons';
import { CapacitorSQLite, CapacitorSQLitePlugin } from '@capacitor-community/sqlite';
import { CoreCapacitorSQLiteManager, CoreCapacitorSQLiteManagerDriver } from '@classes/native/capacitor-sqlite-manager';
import { CoreError } from '@classes/errors/error';
import { CorePlatform } from '@services/platform';
import { asyncInstance } from '@/core/utils/async-instance';
import { CoreLogger } from '@static/logger';

/**
 * This service allows interacting with the local database to store and retrieve data.
 */
@Injectable({ providedIn: 'root' })
export class CoreDbService {

    protected dbInstances: { [name: string]: SQLiteDB } = {};
    protected initialization?: Promise<void>;
    protected nativeSQLite: CoreNativeSQLiteDriver = CapacitorSQLite;
    protected manager = new CoreCapacitorSQLiteManager(this.nativeSQLite);
    protected logger: CoreLogger = CoreLogger.getInstance('CoreDb');

    /**
     * Share platform readiness and legacy-file migration across database operations.
     * A failed initialisation remains blocked until the application is restarted.
     *
     * @returns Promise resolved when database access is safe.
     */
    ready(): Promise<void> {
        this.initialization ??= this.initialize();

        return this.initialization;
    }

    /**
     * Prepare the active driver before allowing database access.
     */
    protected async initialize(): Promise<void> {
        await CorePlatform.ready();
        await this.manager.ready();
        await this.migrateLegacyDatabases();
    }

    /**
     * Move legacy SQLite files into the Capacitor database directory before opening connections.
     *
     * @returns Promise resolved when migration is complete.
     * @todo 7.0 Remove this legacy migration logic.
     */
    protected async migrateLegacyDatabases(): Promise<void> {

        const migrationOptions = CorePlatform.isIOS() ? { folderPath: 'Library/LocalDatabase' } : {};

        let result: Awaited<ReturnType<CoreNativeSQLiteDriver['getMigratableDbList']>>;
        try {
            result = await this.nativeSQLite.getMigratableDbList(migrationOptions);
        } catch (error) {
            if (this.isEmptyLegacyDatabaseListError(error)) {
                return;
            }

            throw error;
        }

        const dbNameList = result.values ?? [];
        if (dbNameList.length > 0) {
            this.logger.error(`Migrating databases: ${dbNameList.join(', ')}...`);
            await this.nativeSQLite.moveDatabasesAndAddSuffix({ dbNameList, ...migrationOptions });
        }
    }

    /**
     * Check for Capacitor SQLite's explicit empty-directory response.
     *
     * @param error Plugin error.
     * @returns Whether there are no legacy databases.
     */
    protected isEmptyLegacyDatabaseListError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

        return message.trim() === 'getMigratableDbList: No databases available';
    }

    /**
     * Check whether a logical database exists without opening or creating it.
     *
     * @param name Logical database name.
     * @returns Whether the database exists.
     */
    async databaseExists(name: string): Promise<boolean> {
        await this.ready();

        return this.manager.databaseExists(name);
    }

    /**
     * List database files without opening them.
     *
     * @returns Database filenames.
     */
    async listDatabaseFiles(): Promise<string[]> {
        await this.ready();
        const result = await this.getDatabaseList();
        if (!Array.isArray(result.values) || result.values.some(value => typeof value !== 'string')) {
            throw new CoreError('SQLite returned an invalid database list.');
        }

        return result.values;
    }

    /**
     * Obtain the database list from the active driver.
     *
     * @returns Plugin database list.
     */
    protected getDatabaseList(): ReturnType<CapacitorSQLitePlugin['getDatabaseList']> {
        return this.nativeSQLite.getDatabaseList();
    }

    /**
     * Get or create a database object.
     *
     * The database objects are cached statically.
     *
     * @param name DB name.
     * @param forceNew True if it should always create a new instance.
     * @returns DB.
     */
    getDB(name: string, forceNew?: boolean): SQLiteDB {
        if (this.dbInstances[name] === undefined || forceNew) {
            this.dbInstances[name] = new SQLiteDB(name, this.createDatabase(name));
        }

        return this.dbInstances[name];
    }

    /**
     * Create database connection.
     *
     * @param name Database name.
     * @returns Database connection.
     */
    protected createDatabase(name: string): SQLiteDBConnection {
        // Get the connection immediately so a later delete invalidates this handle,
        // rather than rebinding it to a recreated database.
        const connection = this.manager.getConnection(name);

        return asyncInstance(async () => {
            await this.ready();

            return connection;
        }, {});
    }

    /**
     * Delete a DB.
     *
     * @param name DB name.
     */
    async deleteDB(name: string): Promise<void> {
        await this.ready();

        await this.manager.deleteDatabase(name);
        delete this.dbInstances[name];
    }

}
export const CoreDB = makeSingleton(CoreDbService);

type CoreNativeSQLiteDriver = CoreCapacitorSQLiteManagerDriver &
    Pick<CapacitorSQLitePlugin, 'getMigratableDbList' | 'moveDatabasesAndAddSuffix' | 'getDatabaseList'>;
