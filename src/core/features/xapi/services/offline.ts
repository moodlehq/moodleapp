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
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreXAPIStateDBRecord, CoreXAPIStatementDBRecord, STATEMENTS_TABLE_NAME, STATES_TABLE_NAME } from './database/xapi';
import { CoreXAPIStateOptions } from './xapi';

/**
 * Service to handle offline xAPI.
 */
@Injectable({ providedIn: 'root' })
export class CoreXAPIOfflineProvider {

    /**
     * Check if there are offline data to send for a context.
     *
     * @param contextId Context ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline data, false otherwise.
     */
    async contextHasData(contextId: number, siteId?: string): Promise<boolean> {
        const [hasStatements, hasSates] = await Promise.all([
            this.contextHasStatements(contextId, siteId),
            this.itemHasStates(contextId, siteId),
        ]);

        return hasStatements || hasSates;
    }

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
     * Delete all states from a component that fulfill the supplied condition.
     *
     * @param component Component.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    async deleteStates(
        component: string,
        options: CoreXAPIOfflineDeleteStatesOptions = {},
    ): Promise<void> {
        const db = await CoreSites.getSiteDb(options.siteId);

        const conditions: Partial<CoreXAPIStateDBRecord> = {
            component,
        };
        if (options.itemId !== undefined) {
            conditions.itemid = options.itemId;
        }
        if (options.stateId !== undefined) {
            conditions.stateid = options.stateId;
        }
        if (options.registration !== undefined) {
            conditions.registration = options.registration;
        }

        await db.deleteRecords(STATES_TABLE_NAME, conditions);
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
     * Get all offline states.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with all the data.
     */
    async getAllStates(siteId?: string): Promise<CoreXAPIStateDBRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getRecords(STATES_TABLE_NAME, undefined, 'timemodified ASC');
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
     * Get states for an item.
     *
     * @param itemId item ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the data.
     */
    async getItemStates(itemId: number, siteId?: string): Promise<CoreXAPIStateDBRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getRecords<CoreXAPIStateDBRecord>(STATES_TABLE_NAME, { itemid: itemId }, 'timecreated ASC');
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
     * Get a certain state (if it exists).
     *
     * @param component Component.
     * @param itemId The Agent Id (usually the plugin instance).
     * @param stateId The xAPI state ID.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    async getState(
        component: string,
        itemId: number,
        stateId: string,
        options: CoreXAPIStateOptions = {},
    ): Promise<CoreXAPIStateDBRecord> {
        const db = await CoreSites.getSiteDb(options?.siteId);

        const conditions: Partial<CoreXAPIStateDBRecord> = {
            component,
            itemid: itemId,
            stateid: stateId,
        };
        if (options.registration) {
            conditions.registration = options.registration;
        }

        return db.getRecord(STATES_TABLE_NAME, conditions);
    }

    /**
     * Check if there are offline states to send for an item.
     *
     * @param itemId Item ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline states, false otherwise.
     */
    async itemHasStates(itemId: number, siteId?: string): Promise<boolean> {
        const statesList = await this.getItemStates(itemId, siteId);

        return statesList && statesList.length > 0;
    }

    /**
     * Save state.
     *
     * @param component Component.
     * @param itemId The Agent Id (usually the plugin instance).
     * @param stateId The xAPI state ID.
     * @param stateData JSON object with the state data.
     * @param options Options.
     * @returns Promise resolved when state is successfully saved.
     */
    async saveState(
        component: string,
        itemId: number,
        stateId: string,
        stateData: string,
        options: CoreXAPIOfflineSaveStateOptions = {},
    ): Promise<void> {
        const db = await CoreSites.getSiteDb(options?.siteId);

        const storedState = await CoreUtils.ignoreErrors(this.getState(component, itemId, stateId, options));

        if (storedState) {
            const newData: Partial<CoreXAPIStateDBRecord> = {
                statedata: stateData,
                timemodified: Date.now(),
            };
            const conditions: Partial<CoreXAPIStateDBRecord> = {
                component,
                itemid: itemId,
                stateid: stateId,
                registration: options?.registration,
            };

            await db.updateRecords(STATES_TABLE_NAME, newData, conditions);
        } else {
            const entry: Omit<CoreXAPIStateDBRecord, 'id'> = {
                component,
                itemid: itemId,
                stateid: stateId,
                statedata: stateData,
                timecreated: Date.now(),
                timemodified: Date.now(),
                courseid: options?.courseId,
                extra: options?.extra,
            };

            await db.insertRecord(STATES_TABLE_NAME, entry);
        }
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
 * Common options to pass to save functions.
 */
export type CoreXAPIOfflineSaveCommonOptions = {
    courseId?: number; // Course ID if the context is inside a course.
    extra?: string; // Extra data to store.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to saveStatements function.
 */
export type CoreXAPIOfflineSaveStatementsOptions = CoreXAPIOfflineSaveCommonOptions;

/**
 * Options to pass to saveStatements function.
 */
export type CoreXAPIOfflineSaveStateOptions = CoreXAPIOfflineSaveCommonOptions & {
    registration?: string; // The xAPI registration UUID.
};

/**
 * Options to pass to deleteStates function.
 */
export type CoreXAPIOfflineDeleteStatesOptions = CoreXAPIStateOptions & {
    itemId?: number;
    stateId?: string;
};
