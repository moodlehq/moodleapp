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

import { SQLiteDB, SQLiteDBConnection } from '@classes/sqlitedb';
import { makeSingleton } from '@singletons';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { CoreCapacitorSQLiteManager } from '@classes/capacitor-sqlite-manager';
import { CoreSQLiteNativeLifecycle } from '@classes/sqlite-native-lifecycle';
import { CorePlatform } from '@services/platform';
import { asyncInstance } from '@/core/utils/async-instance';

/**
 * This service allows interacting with the local database to store and retrieve data.
 */
@Injectable({ providedIn: 'root' })
export class CoreDbService {

    protected dbInstances: { [name: string]: SQLiteDB } = {};
    protected initialization?: Promise<void>;
    protected lifecycle = new CoreSQLiteNativeLifecycle(CapacitorSQLite);
    protected manager = new CoreCapacitorSQLiteManager(CapacitorSQLite, this.lifecycle);

    /**
     * Share driver readiness across startup, early connections and deletion.
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
        await this.lifecycle.prepareGlobalDatabase();
        const global = this.manager.getConnection('MoodleMobile');
        await global.open();
        await this.lifecycle.reconcileSites(global);
    }

    /**
     * Reserve native database creation for an authenticated new site.
     *
     * @param siteId Authenticated site ID absent from the saved-site list.
     */
    async prepareSiteDatabase(siteId: string): Promise<void> {
        await this.ready();
        await this.lifecycle.prepareSiteDatabase(siteId);
    }

    /**
     * Seal required schemas after successful app/site installation.
     *
     * @param name Logical database name.
     */
    async completeDatabaseInitialization(name: string): Promise<void> {
        await this.ready();
        await this.manager.completeInitialization(name);
    }

    /**
     * Reject failed schema installation.
     *
     * @param name Logical database name.
     * @param error Already logged schema-installation error.
     */
    onDatabaseInitializationError(name: string, error: unknown): never {
        throw error;
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
        // Capture the handle before deletion can retire its generation.
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
