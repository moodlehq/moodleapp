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

import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreXAPIStatementDBRecord, STATEMENTS_TABLE_NAME } from './database/xapi';

/**
 * Service to handle offline xAPI.
 */
@Injectable({ providedIn: 'root' })
export class CoreXAPIOfflineProvider {

    /**
     * Check if there are offline statements to send for a context.
     *
     * @param contextId Context ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline statements, false otherwise.
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
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteStatements(id: number, siteId?: string): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);

        await db.deleteRecords(STATEMENTS_TABLE_NAME, { id });
    }

    /**
     * Delete all statements of a certain context.
     *
     * @param contextId Context ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteStatementsForContext(contextId: number, siteId?: string): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);

        await db.deleteRecords(STATEMENTS_TABLE_NAME, { contextid: contextId });
    }

    /**
     * Get all offline statements.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with all the data.
     */
    async getAllStatements(siteId?: string): Promise<CoreXAPIStatementDBRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getRecords(STATEMENTS_TABLE_NAME, undefined, 'timecreated ASC');
    }

    /**
     * Get statements for a context.
     *
     * @param contextId Context ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the data.
     */
    async getContextStatements(contextId: number, siteId?: string): Promise<CoreXAPIStatementDBRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getRecords<CoreXAPIStatementDBRecord>(STATEMENTS_TABLE_NAME, { contextid: contextId }, 'timecreated ASC');
    }

    /**
     * Get certain statements.
     *
     * @param id ID of the statements.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the data.
     */
    async getStatements(id: number, siteId?: string): Promise<CoreXAPIStatementDBRecord> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getRecord<CoreXAPIStatementDBRecord>(STATEMENTS_TABLE_NAME, { id });
    }

    /**
     * Save statements.
     *
     * @param contextId Context ID.
     * @param component Component to send the statements to.
     * @param statements Statements (JSON-encoded).
     * @param options Options.
     * @returns Promise resolved when statements are successfully saved.
     */
    async saveStatements(
        contextId: number,
        component: string,
        statements: string,
        options?: CoreXAPIOfflineSaveStatementsOptions,
    ): Promise<void> {
        const db = await CoreSites.getSiteDb(options?.siteId);

        const entry: Omit<CoreXAPIStatementDBRecord, 'id'> = {
            contextid: contextId,
            component: component,
            statements: statements,
            timecreated: Date.now(),
            courseid: options?.courseId,
            extra: options?.extra,
        };

        await db.insertRecord(STATEMENTS_TABLE_NAME, entry);
    }

}

export const CoreXAPIOffline = makeSingleton(CoreXAPIOfflineProvider);

/**
 * Options to pass to saveStatements function.
 */
export type CoreXAPIOfflineSaveStatementsOptions = {
    courseId?: number; // Course ID if the context is inside a course.
    extra?: string; // Extra data to store.
    siteId?: string; // Site ID. If not defined, current site.
};
