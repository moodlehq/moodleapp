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
import { CoreCapacitorSQLiteDBConnection } from '@classes/native/capacitor-sqlite-db-connection';
import {
    ConnectionEntry,
    CoreCapacitorSQLiteManager,
    CoreCapacitorSQLiteManagerDriver,
} from '@classes/native/capacitor-sqlite-manager';
import { CoreError } from '@classes/errors/error';
import { SQLiteDBConnection } from '@classes/native/sqlitedb';
import { CoreDbService } from '@services/native/db';

/**
 * Browser SQLite storage. The old moodleapp-idb store is deliberately neither opened nor removed.
 * Each logical database has one connection and queue, including forceNew wrappers.
 */
export class CoreDbServiceMock extends CoreDbService {

    constructor(
        protected sqlite: CoreBrowserSQLiteDriver = CapacitorSQLite,
        protected initializeStore: () => Promise<void> = initializeBrowserSQLite,
    ) {
        super();
        this.manager = new CoreBrowserSQLiteManager(sqlite, initializeStore);
    }

    /**
     * @inheritdoc
     */
    protected async initialize(): Promise<void> {
        await this.manager.ready();
    }

    /**
     * @inheritdoc
     */
    protected getDatabaseList(): ReturnType<CapacitorSQLitePlugin['getDatabaseList']> {
        return this.sqlite.getDatabaseList();
    }

    /**
     * @inheritdoc
     */
    protected createDatabase(name: string): SQLiteDBConnection {
        return this.manager.getConnection(name);
    }

    /**
     * @inheritdoc
     */
    async deleteDB(name: string): Promise<void> {
        // The manager's readiness barrier also initialises the web store, so deletion can join the queue immediately.
        await this.manager.deleteDatabase(name);
        delete this.dbInstances[name];
    }

}

/**
 * Browser-specific storage and failure handling for the shared connection manager.
 */
class CoreBrowserSQLiteManager extends CoreCapacitorSQLiteManager {

    constructor(
        protected sqlite: CoreBrowserSQLiteDriver,
        protected initializeStore: () => Promise<void>,
    ) {
        super(sqlite);
    }

    /**
     * @inheritdoc
     */
    protected async initialize(): Promise<void> {
        await this.initializeStore();
        await this.sqlite.initWebStore();
    }

    /**
     * @inheritdoc
     */
    protected async createAdapter(name: string): Promise<CoreCapacitorSQLiteDBConnection> {
        const entry = this.getEntry(name);
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
                await this.fail(entry, name, error);
            }
        };
        await this.disableForeignKeys(name);
        await persist();

        return new CoreCapacitorSQLiteDBConnection(name, this.sqlite, persist, () => this.disableForeignKeys(name));
    }

    /**
     * @inheritdoc
     */
    protected async closeAdapter(name: string, entry: ConnectionEntry): Promise<void> {
        if (entry.failure) {
            throw entry.failure;
        }
        try {
            await super.closeAdapter(name, entry);
        } catch (error) {
            await this.fail(entry, name, error);
        }
    }

    /**
     * Do not release a browser connection after failure: closing it can export unacknowledged data.
     *
     * @param entry Connection state.
     * @param name Logical database name.
     * @param error Original failure.
     */
    protected async fail(entry: ConnectionEntry, name: string, error: unknown): Promise<never> {
        entry.failure = error instanceof Error ? error : new CoreError(String(error));

        throw entry.failure;
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

export type CoreBrowserSQLiteDriver = CoreCapacitorSQLiteManagerDriver &
    Pick<CapacitorSQLitePlugin, 'initWebStore' | 'saveToStore' | 'getDatabaseList'>;
