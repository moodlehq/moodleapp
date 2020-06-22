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
import { CoreSites, CoreSiteSchema } from '@providers/sites';
import { SQLiteDB } from '@classes/sqlitedb';
import { makeSingleton } from '@singletons/core.singletons';

/**
 * Service to handle offline xAPI.
 */
@Injectable()
export class CoreXAPIOfflineProvider {

    // Variables for database.
    static STATEMENTS_TABLE = 'core_xapi_statements';

    protected siteSchema: CoreSiteSchema = {
        name: 'CoreXAPIOfflineProvider',
        version: 1,
        tables: [
            {
                name: CoreXAPIOfflineProvider.STATEMENTS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    {
                        name: 'contextid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'component',
                        type: 'TEXT'
                    },
                    {
                        name: 'statements',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'extra',
                        type: 'TEXT'
                    },
                ],
            }
        ]
    };

    protected dbReady: Promise<any>; // Promise resolved when the DB schema is ready.

    constructor() {
        this.dbReady = CoreSites.instance.registerSiteSchema(this.siteSchema);
    }

    /**
     * Check if there are offline statements to send for a context.
     *
     * @param contextId Context ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: true if has offline statements, false otherwise.
     */
    async contextHasStatements(contextId: number, siteId?: string): Promise<boolean> {
        const statementsList = await this.getContextStatements(contextId, siteId);

        return statementsList && statementsList.length > 0;
    }

    /**
     * Delete certain statements.
     *
     * @param id ID of the statements.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if stored, rejected if failure.
     */
    async deleteStatements(id: number, siteId?: string): Promise<void> {
        const db = await this.getSiteDB(siteId);

        await db.deleteRecords(CoreXAPIOfflineProvider.STATEMENTS_TABLE, {id});
    }

    /**
     * Delete all statements of a certain context.
     *
     * @param contextId Context ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if stored, rejected if failure.
     */
    async deleteStatementsForContext(contextId: number, siteId?: string): Promise<void> {
        const db = await this.getSiteDB(siteId);

        await db.deleteRecords(CoreXAPIOfflineProvider.STATEMENTS_TABLE, {contextid: contextId});
    }

    /**
     * Get all offline statements.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with all the data.
     */
    async getAllStatements(siteId?: string): Promise<CoreXAPIOfflineStatementsDBData[]> {
        const db = await this.getSiteDB(siteId);

        return db.getRecords(CoreXAPIOfflineProvider.STATEMENTS_TABLE, undefined, 'timecreated ASC');
    }

    /**
     * Get statements for a context.
     *
     * @param contextId Context ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the data.
     */
    async getContextStatements(contextId: number, siteId?: string): Promise<CoreXAPIOfflineStatementsDBData[]> {
        const db = await this.getSiteDB(siteId);

        return db.getRecords(CoreXAPIOfflineProvider.STATEMENTS_TABLE, {contextid: contextId}, 'timecreated ASC');
    }

    /**
     * Get certain statements.
     *
     * @param id ID of the statements.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the data.
     */
    async getStatements(id: number, siteId?: string): Promise<CoreXAPIOfflineStatementsDBData> {
        const db = await this.getSiteDB(siteId);

        return db.getRecord(CoreXAPIOfflineProvider.STATEMENTS_TABLE, {id});
    }

    /**
     * Save statements.
     *
     * @param contextId Context ID.
     * @param component  Component to send the statements to.
     * @param statements Statements (JSON-encoded).
     * @param options Options.
     * @return Promise resolved when statements are successfully saved.
     */
    async saveStatements(contextId: number, component: string, statements: string, options?: CoreXAPIOfflineSaveStatementsOptions)
            : Promise<void> {

        const db = await this.getSiteDB(options.siteId);

        const entry = {
            contextid: contextId,
            component: component,
            statements: statements,
            timecreated: Date.now(),
            courseid: options.courseId,
            extra: options.extra,
        };

        await db.insertRecord(CoreXAPIOfflineProvider.STATEMENTS_TABLE, entry);
    }

    /**
     * Get Site database when ready.
     *
     * @param siteId Site id.
     * @return SQLiteDB Site database.
     */
    protected async getSiteDB(siteId: string): Promise<SQLiteDB> {
        await this.dbReady;

        return CoreSites.instance.getSiteDb(siteId);
    }
}

export class CoreXAPIOffline extends makeSingleton(CoreXAPIOfflineProvider) {}

/**
 * DB data stored for statements.
 */
export type CoreXAPIOfflineStatementsDBData = {
    id: number; // ID.
    contextid: number; // Context ID of the statements.
    component: string; // Component to send the statements to.
    statements: string; // Statements (JSON-encoded).
    timecreated: number; // When were the statements created.
    courseid?: number; // Course ID if the context is inside a course.
    extra?: string; // Extra data.
};

/**
 * Options to pass to saveStatements function.
 */
export type CoreXAPIOfflineSaveStatementsOptions = {
    courseId?: number; // Course ID if the context is inside a course.
    extra?: string; // Extra data to store.
    siteId?: string; // Site ID. If not defined, current site.
};
