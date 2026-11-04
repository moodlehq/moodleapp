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
import { CoreCapacitorSQLiteObject, CoreCapacitorSQLiteDriver } from '@classes/capacitor-sqlite-object';
import { CoreError } from '@classes/errors/error';
import { CoreQueueRunner } from '@classes/queue-runner';
import { SQLiteDBConnection } from '@classes/sqlitedb';
import { CoreDbProvider } from '@services/db';

/**
 * Browser SQLite storage. The old moodleapp-idb store is deliberately neither opened nor removed.
 * Each logical database has one connection and queue, including forceNew wrappers.
 */
export class CoreDbServiceMock extends CoreDbProvider {

    protected entries = new Map<string, BrowserConnectionEntry>();

    constructor(
        protected sqlite: CoreBrowserSQLiteDriver = CapacitorSQLite,
        protected initializeStore: () => Promise<void> = initializeBrowserSQLite,
    ) {
        super();
    }

    /**
     * @inheritdoc
     */
    protected async initialize(): Promise<void> {
        await this.initializeStore();
        await this.sqlite.initWebStore();
    }

    /**
     * Browser databases are created on first access without native lifecycle metadata.
     *
     * @inheritdoc
     */
    async prepareSiteDatabase(): Promise<void> {
        await this.ready();
    }

    /**
     * Browser schema installation requires no native lifecycle sealing.
     *
     * @inheritdoc
     */
    async completeDatabaseInitialization(): Promise<void> {
        await this.ready();
    }

    /**
     * @inheritdoc
     */
    protected createDatabase(name: string): SQLiteDBConnection {
        const entry = this.getEntry(name);
        const generation = entry.generation;
        const run = <T>(operation: () => Promise<T>) => entry.queue.run(async () => {
            await this.ready();
            if (generation !== entry.generation) {
                throw new CoreError('SQLite connection belongs to a deleted database.');
            }
            if (entry.failure) {
                throw entry.failure;
            }

            return operation();
        });

        return {
            executeSql: (sql, params) => run(async () => (await this.connect(name, entry)).executeSql(sql, params)),
            sqlBatch: statements => run(async () => (await this.connect(name, entry)).sqlBatch(statements)),
            open: () => run(async () => {
                try {
                    const adapter = await this.connect(name, entry);
                    if (!entry.closed) {
                        return;
                    }
                    await adapter.open();
                    await this.disableForeignKeys(name);
                    entry.closed = false;
                } catch (error) {
                    entry.failure = error;
                    throw error;
                }
            }),
            close: () => run(async () => {
                try {
                    if (entry.adapter) {
                        await entry.adapter.close();
                        entry.closed = true;
                    }
                } catch (error) {
                    entry.failure = error;
                    throw error;
                }
            }),
        };
    }

    /**
     * Delete only the named plugin database after queued writes finish. Retire every old wrapper.
     *
     * @param name Logical database name.
     */
    async deleteDB(name: string): Promise<void> {
        const entry = this.getEntry(name);
        await entry.queue.run(async () => {
            await this.ready();
            if (entry.failure) {
                throw entry.failure;
            }
            entry.generation++;
            try {
                const exists = await this.sqlite.isDatabase({ database: name });
                if (entry.adapter || exists.result) {
                    await (await this.connect(name, entry)).close();
                    await this.sqlite.deleteDatabase({ database: name, readonly: false });
                    await this.sqlite.closeConnection({ database: name, readonly: false });
                }
                entry.adapter = undefined;
                entry.closed = false;
                delete this.dbInstances[name];
            } catch (error) {
                entry.failure = error;
                throw error;
            }
        });
    }

    /**
     * @inheritdoc
     */
    onDatabaseInitializationError(name: string, error: unknown): never {
        throw error;
    }

    /**
     * Obtain the queue shared by all generations of a database.
     *
     * @param name Logical database name.
     * @returns Shared connection state.
     */
    protected getEntry(name: string): BrowserConnectionEntry {
        if (name !== 'MoodleMobile' && /^Site-[a-zA-Z0-9_-]+$/.exec(name)?.[0] !== name) {
            throw new CoreError('Invalid SQLite database name.');
        }
        let entry = this.entries.get(name);
        if (!entry) {
            entry = { queue: new CoreQueueRunner(), generation: 0, closed: false };
            this.entries.set(name, entry);
        }

        return entry;
    }

    /**
     * Register/open once and persist writes before acknowledging them. Persistence failures block the name until reload.
     *
     * @param name Logical database name.
     * @param entry Shared connection state.
     * @returns Open SQL adapter.
     */
    protected async connect(name: string, entry: BrowserConnectionEntry): Promise<CoreCapacitorSQLiteObject> {
        if (entry.adapter) {
            return entry.adapter;
        }
        const persist = async () => {
            try {
                const settings = await this.sqlite.query({ database: name, statement: 'PRAGMA foreign_keys', values: [] });
                const foreignKeys = settings.values?.[0]?.foreign_keys;
                if (foreignKeys !== 0 && foreignKeys !== 1) {
                    throw new CoreError('Invalid SQLite foreign-key setting.');
                }
                await this.sqlite.saveToStore({ database: name });
                // Export resets connection PRAGMAs and jeep-sqlite enables constraints; preserve the caller's setting.
                await this.sqlite.query({ database: name, statement: `PRAGMA foreign_keys = ${foreignKeys}`, values: [] });
            } catch (error) {
                entry.failure = error;
                throw error;
            }
        };
        try {
            await this.sqlite.createConnection({
                database: name, version: 1, encrypted: false, mode: 'no-encryption', readonly: false,
            });
            await this.sqlite.open({ database: name, readonly: false });
            await this.disableForeignKeys(name);
            await persist();
            entry.adapter = new CoreCapacitorSQLiteObject(name, this.sqlite, persist);

            return entry.adapter;
        } catch (error) {
            entry.failure = error;
            throw error;
        }
    }

    /**
     * Preserve wa-sqlite's default behaviour; enabling constraints requires a separate app-wide compatibility review.
     *
     * @param name Logical database name.
     */
    protected async disableForeignKeys(name: string): Promise<void> {
        await this.sqlite.query({ database: name, statement: 'PRAGMA foreign_keys = OFF', values: [], readonly: false });
    }

}

/**
 * Register the browser-only custom element and verify its local WASM asset before allowing plugin opens.
 */
export async function initializeBrowserSQLite(): Promise<void> {
    const wasmPath = new URL('assets/lib/sql.js', document.baseURI).href.replace(/\/$/, '');
    const response = await fetch(`${wasmPath}/sql-wasm.wasm`);
    if (!response.ok) {
        throw new CoreError(`Cannot load SQLite WASM (${response.status}).`);
    }
    // The bundled sql.js loader does not reliably reject its outer promise when fetching/compiling WASM fails.
    await WebAssembly.compile(await response.arrayBuffer());
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    defineCustomElements(window);
    await customElements.whenDefined('jeep-sqlite');
    let element = document.querySelector('jeep-sqlite');
    if (!element) {
        element = document.createElement('jeep-sqlite');
        element.autoSave = false;
        element.wasmPath = wasmPath;
        element.hidden = true;
        document.body.appendChild(element);
    }
    await element.componentOnReady();
    if (element.autoSave || element.wasmPath !== wasmPath || !await element.isStoreOpen()) {
        throw new CoreError('SQLite browser store configuration is unavailable or incompatible.');
    }
}

export type CoreBrowserSQLiteDriver = CoreCapacitorSQLiteDriver & Pick<CapacitorSQLitePlugin,
    'initWebStore' | 'saveToStore' | 'createConnection' | 'closeConnection' | 'deleteDatabase'>;

type BrowserConnectionEntry = {
    queue: CoreQueueRunner;
    generation: number;
    closed: boolean;
    adapter?: CoreCapacitorSQLiteObject;
    failure?: unknown;
};
