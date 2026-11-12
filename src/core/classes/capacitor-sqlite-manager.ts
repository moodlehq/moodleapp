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
import { CoreCapacitorSQLiteDriver, CoreCapacitorSQLiteObject } from '@classes/capacitor-sqlite-object';
import { CoreError } from '@classes/errors/error';
import { CoreQueueRunner } from '@classes/queue-runner';
import { SQLiteDBConnection } from '@classes/sqlitedb';

/**
 * Inactive native connection owner. All wrappers, including forceNew wrappers, must use this same manager.
 * Lifecycle validation is mandatory; this class alone cannot safely create or delete a database.
 */
export class CoreCapacitorSQLiteManager {

    protected entries = new Map<string, ConnectionEntry>();
    protected initialization?: Promise<void>;

    constructor(protected sqlite: CoreCapacitorSQLiteManagerDriver, protected lifecycle: CoreCapacitorSQLiteLifecycle) {}

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
                if (!entry.closed) {
                    return;
                }

                try {
                    await adapter.open();
                    await this.lifecycle.validateOpen(name, adapter);
                    entry.closed = false;
                } catch (error) {
                    await this.fail(entry, name, error);
                }
            }),
            close: () => entry.queue.run(async () => {
                await this.ready();
                if (entry.generation !== generation) {
                    throw new CoreError('SQLite connection belongs to a deleted database.');
                }
                if (entry.adapter) {
                    await entry.adapter.close();
                    entry.closed = true;
                }
            }),
        };
    }

    /**
     * Drain prior work, invalidate old handles and delete through Capacitor SQLite.
     * A failed deletion blocks this name for the rest of the process.
     *
     * @param name Logical database name.
     * @returns Promise resolved after the database is deleted and verified absent.
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
                if (entry.adapter) {
                    await entry.adapter.close();
                    entry.closed = true;
                }
                const permission = await this.lifecycle.prepareDelete(name);
                const exists = await this.sqlite.isDatabase({ database: name });
                if ((permission !== 'existing' && permission !== 'absent') ||
                        exists.result !== (permission === 'existing')) {
                    throw new CoreError('SQLite database files do not match the authorised deletion.');
                }

                if (entry.registered) {
                    await this.sqlite.closeConnection({ database: name, readonly: false });
                    entry.registered = false;
                }
                entry.adapter = undefined;
                if (permission === 'existing') {
                    await this.sqlite.deleteDatabase({ database: name });
                }
                await this.lifecycle.completeDelete(name);
            } catch (error) {
                await this.fail(entry, name, error);
            }
        });
    }

    /**
     * Validate newly installed app schemas without interleaving SQL from other handles.
     *
     * @param name Logical database name.
     * @returns Promise resolved after schema validation.
     */
    completeInitialization(name: string): Promise<void> {
        const entry = this.getEntry(name);

        return entry.queue.run(async () => {
            await this.ready();
            if (entry.failure) {
                throw entry.failure;
            }
            try {
                const adapter = await this.connect(name, entry);
                await this.lifecycle.completeInitialization(name, adapter);
            } catch (error) {
                await this.fail(entry, name, error);
            }
        });
    }

    /**
     * Share the all-database migration barrier, including its failure, across every operation.
     *
     * @returns Promise resolved when native lifecycle operations are safe.
     */
    protected ready(): Promise<void> {
        this.initialization ??= Promise.resolve().then(() => this.lifecycle.ready());

        return this.initialization;
    }

    /**
     * Keep the per-name queue after deletion so old and new handles can never use separate queues.
     *
     * @param name Logical database name.
     * @returns Connection state.
     */
    protected getEntry(name: string): ConnectionEntry {
        if (name !== 'MoodleMobile' && /^Site-[a-zA-Z0-9_-]+$/.exec(name)?.[0] !== name) {
            throw new CoreError('Invalid SQLite database name.');
        }

        let entry = this.entries.get(name);
        if (!entry) {
            entry = { queue: new CoreQueueRunner(), generation: 0, registered: false, closed: false };
            this.entries.set(name, entry);
        }

        return entry;
    }

    /**
     * Authorise the initial open, register exactly once and validate before exposing SQL to callers.
     *
     * @param name Logical database name.
     * @param entry Connection state.
     * @returns Validated adapter.
     */
    protected async connect(name: string, entry: ConnectionEntry): Promise<CoreCapacitorSQLiteObject> {
        if (entry.adapter) {
            return entry.adapter;
        }

        try {
            const permission = await this.lifecycle.prepareOpen(name);
            const exists = await this.sqlite.isDatabase({ database: name });
            if (permission !== 'existing' && permission !== 'create') {
                throw new CoreError('Invalid SQLite open authorisation.');
            }
            if (exists.result !== (permission === 'existing')) {
                throw new CoreError('SQLite database files do not match the authorised open.');
            }

            await this.register(name, entry);
            await this.sqlite.open({ database: name, readonly: false });
            const adapter = new CoreCapacitorSQLiteObject(name, this.sqlite);
            await this.lifecycle.validateOpen(name, adapter);
            entry.adapter = adapter;
            entry.closed = false;

            return adapter;
        } catch (error) {
            return this.fail(entry, name, error);
        }
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
                entry.failure = new CoreError('SQLite lifecycle failed and connection cleanup could not be confirmed.', {
                    debug: { details: `Operation: ${String(error)}; cleanup: ${String(cleanupError)}` },
                });
            }
        }

        throw entry.failure;
    }

}

export type CoreCapacitorSQLiteManagerDriver = CoreCapacitorSQLiteDriver &
    Pick<CapacitorSQLitePlugin, 'createConnection' | 'closeConnection' | 'deleteDatabase'>;

/**
 * Native database checks shared by every connection operation.
 */
export type CoreCapacitorSQLiteLifecycle = {
    // Complete legacy database migration before any native connection.
    ready(): Promise<void>;
    // Verify presence or explicitly authorise a new database for this process.
    prepareOpen(name: string): Promise<'existing' | 'create'>;
    // Check integrity and expected global/site data before exposing SQL to callers.
    validateOpen(name: string, connection: SQLiteDBConnection): Promise<void>;
    // Check required app schemas after installation.
    completeInitialization(name: string, connection: SQLiteDBConnection): Promise<void>;
    // Check global/site invariants before deletion.
    prepareDelete(name: string): Promise<'existing' | 'absent'>;
    // Verify deletion completed.
    completeDelete(name: string): Promise<void>;
};

type ConnectionEntry = {
    queue: CoreQueueRunner;
    generation: number;
    registered: boolean;
    closed: boolean;
    adapter?: CoreCapacitorSQLiteObject;
    failure?: Error;
};
