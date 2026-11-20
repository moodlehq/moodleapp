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

import type { CapacitorSQLitePlugin } from '@capacitor-community/sqlite';
import { CoreCapacitorSQLiteDBConnection, CoreCapacitorSQLiteDriver } from '@classes/capacitor-sqlite-db-connection';
import { CoreError } from '@classes/errors/error';
import { CoreQueueRunner } from '@classes/queue-runner';
import { SQLiteDBConnection } from '@classes/sqlitedb';

/**
 * Connection owner. All wrappers, including forceNew wrappers, must use this same manager.
 */
export class CoreCapacitorSQLiteManager {

    protected entries = new Map<string, ConnectionEntry>();
    protected initialization?: Promise<void>;

    constructor(protected sqlite: CoreCapacitorSQLiteManagerDriver) {}

    /**
     * Return a deferred handle without opening files. Multiple handles share one native connection and SQL queue.
     * Handles obtained before deletion remain invalid afterwards, even if the same name is recreated.
     *
     * @param name Logical database name.
     * @returns App connection handle.
     */
    getConnection(name: string): SQLiteDBConnection {
        const entry = this.getEntry(name);
        const generation = entry.generation;
        const run = <T>(operation: () => Promise<T>) => entry.queue.run(async () => {
            await this.ready();
            if (entry.generation !== generation) {
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
                const adapter = await this.connect(name, entry);
                try {
                    await adapter.open();
                } catch (error) {
                    await this.fail(entry, name, error);
                }
            }),
            close: () => entry.queue.run(async () => {
                await this.ready();
                if (entry.generation !== generation) {
                    throw new CoreError('SQLite connection belongs to a deleted database.');
                }
                await this.closeAdapter(name, entry);
            }),
        };
    }

    /**
     * Drain prior work, invalidate old handles and delete through Capacitor SQLite.
     * A failed deletion blocks this name for the rest of the process.
     *
     * @param name Logical database name.
     * @returns Promise resolved after the database is deleted.
     */
    deleteDatabase(name: string): Promise<void> {
        const entry = this.getEntry(name);

        return entry.queue.run(async () => {
            await this.ready();
            if (entry.failure) {
                throw entry.failure;
            }
            entry.generation++;

            try {
                await this.closeAdapter(name, entry);
                if (await this.checkDatabaseExists(name)) {
                    if (!entry.registered) {
                        await this.register(name, entry);
                    }
                    await this.sqlite.deleteDatabase({ database: name, readonly: false });
                }
                if (entry.registered) {
                    await this.sqlite.closeConnection({ database: name, readonly: false });
                    entry.registered = false;
                }
                entry.adapter = undefined;
            } catch (error) {
                await this.fail(entry, name, error);
            }
        });
    }

    /**
     * Check whether a logical database file exists.
     *
     * @param name Logical database name.
     * @returns Whether the database exists.
     */
    databaseExists(name: string): Promise<boolean> {
        const entry = this.getEntry(name);

        return entry.queue.run(async () => {
            await this.ready();
            if (entry.failure) {
                throw entry.failure;
            }

            return this.checkDatabaseExists(name);
        });
    }

    /**
     * Release registrations retained across WebView reloads before opening database connections.
     * Share this barrier, including its failure, across every operation.
     *
     * @returns Promise resolved when the manager can use native connections.
     */
    ready(): Promise<void> {
        this.initialization ??= this.initialize();

        return this.initialization;
    }

    /**
     * Initialize the manager and ensure native connections are consistent.
     */
    protected async initialize(): Promise<void> {
        // An empty list tells the plugin to close those stale native connections before any new ones are opened.
        await this.sqlite.checkConnectionsConsistency({ dbNames: [], openModes: [] });
    }

    /**
     * Keep the per-name queue after deletion so old and new handles can never use separate queues.
     *
     * @param name Logical database name.
     * @returns Connection state.
     */
    protected getEntry(name: string): ConnectionEntry {
        if (!CoreCapacitorSQLiteManager.isValidDatabaseName(name)) {
            throw new CoreError('Invalid SQLite database name.');
        }

        let entry = this.entries.get(name);
        if (!entry) {
            entry = { queue: new CoreQueueRunner(), generation: 0, registered: false };
            this.entries.set(name, entry);
        }

        return entry;
    }

    /**
     * Validate the logical database name.
     *
     * @param name Logical database name.
     * @returns Whether the name is valid.
     */
    static isValidDatabaseName(name: string): boolean {
        return /^[a-zA-Z0-9-]+$/.test(name);
    }

    /**
     * Query the native plugin for a database without changing connection state.
     *
     * @param name Logical database name.
     * @returns Whether the database exists.
     */
    protected async checkDatabaseExists(name: string): Promise<boolean> {
        const result = await this.sqlite.isDatabase({ database: name });
        if (typeof result.result !== 'boolean') {
            throw new CoreError('Invalid SQLite existence response.');
        }

        return result.result;
    }

    /**
     * Register exactly once and open the named database.
     *
     * @param name Logical database name.
     * @param entry Connection state.
     * @returns Validated adapter.
     */
    protected async connect(name: string, entry: ConnectionEntry): Promise<CoreCapacitorSQLiteDBConnection> {
        if (entry.adapter) {
            return entry.adapter;
        }

        try {
            await this.register(name, entry);
            await this.sqlite.open({ database: name, readonly: false });
            const adapter = await this.createAdapter(name);
            entry.adapter = adapter;

            return adapter;
        } catch (error) {
            return this.fail(entry, name, error);
        }
    }

    /**
     * Create an adapter after the native connection has opened.
     *
     * @param name Logical database name.
     * @returns Open adapter.
     */
    protected async createAdapter(name: string): Promise<CoreCapacitorSQLiteDBConnection> {
        return new CoreCapacitorSQLiteDBConnection(name, this.sqlite);
    }

    /**
     * Close an existing adapter without creating a connection.
     *
     * @param name Logical database name.
     * @param entry Connection state.
     */
    protected async closeAdapter(name: string, entry: ConnectionEntry): Promise<void> {
        await entry.adapter?.close();
    }

    /**
     * Register without opening or installing plugin schema-upgrade statements.
     *
     * @param name Logical database name.
     * @param entry Connection state.
     */
    protected async register(name: string, entry: ConnectionEntry): Promise<void> {
        await this.sqlite.createConnection({
            database: name, encrypted: false, mode: 'no-encryption', version: 1, readonly: false,
        });
        entry.registered = true;
    }

    /**
     * Latch uncertain lifecycle failures and release only registrations acknowledged as ours.
     *
     * @param entry Connection state.
     * @param name Logical database name.
     * @param error Original failure.
     */
    protected async fail(entry: ConnectionEntry, name: string, error: unknown): Promise<never> {
        entry.failure = error instanceof Error ? error : new CoreError(String(error));
        if (entry.registered) {
            try {
                await this.sqlite.closeConnection({ database: name, readonly: false });
                entry.registered = false;
                entry.adapter = undefined;
            } catch (cleanupError) {
                entry.failure = new CoreError('SQLite operation failed and connection cleanup could not be confirmed.', {
                    debug: { details: `Operation: ${String(error)}; cleanup: ${String(cleanupError)}` },
                });
            }
        }

        throw entry.failure;
    }

}

export type CoreCapacitorSQLiteManagerDriver = CoreCapacitorSQLiteDriver &
    Pick<CapacitorSQLitePlugin, 'createConnection' | 'closeConnection' | 'deleteDatabase' | 'checkConnectionsConsistency'>;

export type ConnectionEntry = {
    queue: CoreQueueRunner;
    generation: number;
    registered: boolean;
    adapter?: CoreCapacitorSQLiteDBConnection;
    failure?: Error;
};
