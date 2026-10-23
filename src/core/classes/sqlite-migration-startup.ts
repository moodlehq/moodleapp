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

import { CoreSQLiteMigration, CoreSQLiteMigrationStorage } from '@classes/sqlite-migration';
import { CoreError } from '@classes/errors/error';

/**
 * One startup barrier for every native database, not just the active site.
 * Use only with the replacement driver, before opening any connection or deleting any database.
 */
export class CoreSQLiteMigrationStartup {

    protected initialization?: Promise<readonly string[]>;
    protected migration: CoreSQLiteMigration;

    constructor(protected storage: CoreSQLiteMigrationStartupStorage) {
        this.migration = new CoreSQLiteMigration(storage);
    }

    /**
     * Inventory and preflight everything before moving files. Failures remain latched for this process.
     *
     * @returns Existing database names whose complete file sets have been adopted.
     */
    ready(): Promise<readonly string[]> {
        this.initialization ??= this.initialize();

        return this.initialization;
    }

    /**
     * Prepare every database while all database consumers remain blocked.
     *
     * @returns Names discovered from files and persistent migration records.
     */
    protected async initialize(): Promise<readonly string[]> {
        const files = await this.storage.list();
        const recordedNames = await this.storage.listJournalNames();
        const databases = CoreSQLiteMigrationStartup.getDatabaseNames(files, recordedNames);
        if (databases.length > 0 && !databases.includes('MoodleMobile')) {
            throw new CoreError('SQLite migration global database is missing.');
        }

        for (const name of databases) {
            await this.migration.validate(name, files);
        }

        for (const name of databases) {
            await this.migration.rename(name);
        }

        return Object.freeze(databases);
    }

    /**
     * Discover owned names from both files and metadata, without interpreting their lifecycle state.
     *
     * @param files Closed-database inventory.
     * @param recordedNames Persisted or interrupted metadata names.
     * @returns Sorted logical names.
     */
    static getDatabaseNames(files: string[], recordedNames: string[]): string[] {
        const names = new Set(recordedNames);

        for (const file of files) {
            // Unrelated native database files are not owned by this migration.
            if (!file.startsWith('MoodleMobile') && !file.startsWith('Site-')) {
                continue;
            }

            const principal = file.replace(/-(wal|shm|journal)$/, '');
            names.add(principal.endsWith('SQLite.db') ? principal.slice(0, -'SQLite.db'.length) : principal);
        }

        return [...names].sort();
    }

}

export type CoreSQLiteMigrationStartupStorage = CoreSQLiteMigrationStorage & {
    // Include completed records even when their principal files have disappeared.
    listJournalNames(): Promise<string[]>;
};
