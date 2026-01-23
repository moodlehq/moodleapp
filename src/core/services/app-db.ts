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

import { CoreDB } from '@services/db';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';

import { makeSingleton } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { DBNAME, SCHEMA_VERSIONS_TABLE_NAME, SCHEMA_VERSIONS_TABLE_SCHEMA, SchemaVersionsDBEntry } from '@services/database/app';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { asyncInstance } from '../utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';

/**
 * Factory to provide access to the global app database.
 *
 * @description
 * Each service or component should be responsible of creating their own database tables. Example:
 *
 * ```ts
 *     CoreAppDB.getDB();
 *     CoreAppDB.createTableFromSchema(this.tableSchema);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CoreAppDBService {

    protected db?: SQLiteDB;
    protected logger: CoreLogger;
    protected schemaVersionsTable = asyncInstance<CoreDatabaseTable<SchemaVersionsDBEntry, 'name'>>();

    constructor() {
        this.logger = CoreLogger.getInstance('CoreAppDB');
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        const database = this.getDB();

        await database.createTableFromSchema(SCHEMA_VERSIONS_TABLE_SCHEMA);

        const schemaVersionsTable = new CoreDatabaseTableProxy<SchemaVersionsDBEntry, 'name'>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            database,
            SCHEMA_VERSIONS_TABLE_NAME,
            ['name'],
        );

        await schemaVersionsTable.initialize();

        this.schemaVersionsTable.setInstance(schemaVersionsTable);
    }

    /**
     * Install and upgrade a certain schema.
     *
     * @param schema The schema to create.
     */
    async createTablesFromSchema(schema: CoreAppSchema): Promise<void> {
        this.logger.debug(`Apply schema to app DB: ${schema.name}`);

        try {
            const oldVersion = await this.getInstalledSchemaVersion(schema);

            if (oldVersion >= schema.version) {
                // Version already installed, nothing else to do.
                return;
            }

            this.logger.debug(`Migrating schema '${schema.name}' of app DB from version ${oldVersion} to ${schema.version}`);

            if (schema.tables) {
                await this.getDB().createTablesFromSchema(schema.tables);
            }
            if (schema.install && oldVersion === 0) {
                await schema.install(this.getDB());
            }
            if (schema.migrate && oldVersion > 0) {
                await schema.migrate(this.getDB(), oldVersion);
            }

            // Set installed version.
            await this.schemaVersionsTable.insert({ name: schema.name, version: schema.version });
        } catch (error) {
            // Only log the error, don't throw it.
            this.logger.error(`Error applying schema to app DB: ${schema.name}`, error);
        }
    }

    /**
     * Delete table schema.
     *
     * @param name Schema name.
     */
    async deleteTableSchema(name: string): Promise<void> {
        await this.schemaVersionsTable.deleteByPrimaryKey({ name });
    }

    /**
     * Get the application global database.
     *
     * @returns App's DB.
     */
    getDB(): SQLiteDB {
        if (!this.db) {
            this.db = CoreDB.getDB(DBNAME);
        }

        return this.db;
    }

    /**
     * Get the installed version for the given schema.
     *
     * @param schema App schema.
     * @returns Installed version number, or 0 if the schema is not installed.
     */
    protected async getInstalledSchemaVersion(schema: CoreAppSchema): Promise<number> {
        try {
            // Fetch installed version of the schema.
            const entry = await this.schemaVersionsTable.getOneByPrimaryKey({ name: schema.name });

            return entry.version;
        } catch {
            // No installed version yet.
            return 0;
        }
    }

}

export const CoreAppDB = makeSingleton(CoreAppDBService);

/**
 * App DB schema and migration function.
 */
export type CoreAppSchema = {
    /**
     * Name of the schema.
     */
    name: string;

    /**
     * Latest version of the schema (integer greater than 0).
     */
    version: number;

    /**
     * Tables to create when installing or upgrading the schema.
     */
    tables?: SQLiteDBTableSchema[];

    /**
     * Migrates the schema to the latest version.
     *
     * Called when upgrading the schema, after creating the defined tables.
     *
     * @param db The affected DB.
     * @param oldVersion Old version of the schema or 0 if not installed.
     * @returns Promise resolved when done.
     */
    migrate?(db: SQLiteDB, oldVersion: number): Promise<void>;

    /**
     * Make changes to install the schema.
     *
     * Called when installing the schema, after creating the defined tables.
     *
     * @param db Site database.
     * @returns Promise resolved when done.
     */
    install?(db: SQLiteDB): Promise<void> | void;
};
