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
import { CoreError } from '@classes/errors/error';
import { CoreQueueRunner } from '@classes/queue-runner';
import { SQLiteDBConnection, SQLiteDBRecordValue, SQLiteDBResult, SQLiteDBStatement } from '@classes/sqlitedb';

/**
 * SQL contract adapter for an already opened Capacitor connection.
 * The connection owner must validate it before exposing it to app callers; adoption and deletion remain outside this adapter.
 * One adapter must own each native connection so batches and mutation metadata cannot interleave.
 */
export class CoreCapacitorSQLiteObject implements SQLiteDBConnection {

    protected queue = new CoreQueueRunner();
    protected closed = false;
    protected failure?: CoreError;

    constructor(
        protected name: string,
        protected sqlite: CoreCapacitorSQLiteDriver,
        protected persist?: () => Promise<void>,
    ) {}

    /**
     * Execute one statement, preserving the app's rows and mutation-result shape.
     *
     * @param statement Single SQL statement.
     * @param params Bound parameters; undefined is stored as SQL NULL.
     * @returns Normalised SQL result.
     */
    executeSql(statement: string, params: SQLiteDBRecordValue[] = []): Promise<SQLiteDBResult> {
        return this.queue.run(async () => {
            this.requireOpen();

            const prepared = this.prepare(statement, params);
            const result = await this.execute(prepared);
            if (!['SELECT', 'EXPLAIN'].includes(prepared.kind)) {
                await this.persist?.();
            }

            return result;
        });
    }

    /**
     * Execute a whole batch in one transaction without interleaving other adapter operations.
     *
     * @param statements Statements, optionally paired with bound parameters.
     * @returns Promise resolved after the transaction commits.
     */
    sqlBatch(statements: SQLiteDBStatement[]): Promise<void> {
        return this.queue.run(async () => {
            this.requireOpen();
            if (!Array.isArray(statements)) {
                throw new CoreError('SQLite batch must be an array.');
            }

            const prepared = statements.map(statement => typeof statement === 'string'
                ? this.prepare(statement, [])
                : this.prepare(statement[0], statement[1] ?? []));
            if (prepared.length === 0) {
                return;
            }
            if (prepared.some(statement => statement.kind === 'PRAGMA' || statement.kind === 'VACUUM')) {
                throw new CoreError('SQLite maintenance statements cannot run in an atomic batch.');
            }

            try {
                await this.sqlite.beginTransaction({ database: this.name });
                for (const statement of prepared) {
                    await this.execute(statement);
                }
                await this.sqlite.commitTransaction({ database: this.name });
            } catch (error) {
                try {
                    // SQLite can roll back automatically, for example INSERT OR ROLLBACK.
                    const active = await this.sqlite.isTransactionActive({ database: this.name });
                    if (active.result !== false) {
                        await this.sqlite.rollbackTransaction({ database: this.name });
                    }
                } catch (rollbackError) {
                    this.failure = new CoreError('SQLite batch failed and rollback could not be confirmed.', {
                        debug: { details: `Statement: ${String(error)}; rollback: ${String(rollbackError)}` },
                    });
                    throw this.failure;
                }

                throw error;
            }

            // Persist only after COMMIT: sql.js export cannot run inside an active transaction.
            await this.persist?.();
        });
    }

    /**
     * Reopen a previously closed, registered connection. The provider retains adoption responsibility.
     *
     * @returns Promise resolved after opening.
     */
    open(): Promise<void> {
        return this.queue.run(async () => {
            if (this.failure) {
                throw this.failure;
            }
            if (!this.closed) {
                return;
            }
            const exists = await this.sqlite.isDatabase({ database: this.name });
            if (exists.result !== true) {
                throw new CoreError('SQLite database is missing; refusing to reopen an empty replacement.');
            }
            await this.sqlite.open({ database: this.name, readonly: false });
            this.closed = false;
        });
    }

    /**
     * Close after queued operations finish; later SQL calls reject until explicitly reopened.
     *
     * @returns Promise resolved after closing.
     */
    close(): Promise<void> {
        return this.queue.run(async () => {
            if (this.closed) {
                return;
            }
            if (this.persist && this.failure) {
                throw this.failure;
            }
            await this.sqlite.close({ database: this.name, readonly: false });
            this.closed = true;
        });
    }

    /**
     * Reject unsafe access after close or an unconfirmed rollback.
     */
    protected requireOpen(): void {
        if (this.failure) {
            throw this.failure;
        }
        if (this.closed) {
            throw new CoreError('SQLite database is closed.');
        }
    }

    /**
     * Execute without reentering the queue. Native automatic transactions are disabled within our queue.
     *
     * @param statement Validated statement.
     * @returns App-shaped result with the total-changes delta used by native Cordova SQLite.
     */
    protected async execute(statement: PreparedStatement): Promise<SQLiteDBResult> {
        const options = { database: this.name, statement: statement.sql, values: statement.values, readonly: false };
        if (['SELECT', 'PRAGMA', 'EXPLAIN'].includes(statement.kind)) {
            const response = await this.sqlite.query(options);

            return this.result(this.rows(response.values), 0);
        }

        const response = await this.sqlite.run({ ...options, transaction: false, returnMode: 'no' });
        if (typeof response.changes?.changes !== 'number' ||
                !Number.isSafeInteger(response.changes.changes) || response.changes.changes < 0) {
            throw new CoreError('Invalid SQLite mutation response.');
        }
        const { changes, lastId } = response.changes;
        const inserted = changes > 0 && ['INSERT', 'REPLACE'].includes(statement.kind);
        if (inserted && typeof lastId !== 'number') {
            throw new CoreError('Invalid SQLite insert metadata.');
        }
        if (lastId !== undefined && !Number.isSafeInteger(lastId)) {
            throw new CoreError('Invalid SQLite insert ID.');
        }

        return this.result(
            [],
            changes,
            inserted ? lastId : undefined,
        );
    }

    /**
     * Validate one statement without interpreting SQL expressions or substituting parameter values.
     *
     * @param sql SQL source.
     * @param params Bound parameters.
     * @returns SQL with leading comments removed and its top-level operation identified.
     */
    protected prepare(sql: string, params: SQLiteDBRecordValue[]): PreparedStatement {
        if (typeof sql !== 'string' || !Array.isArray(params)) {
            throw new CoreError('Invalid SQLite statement or parameters.');
        }

        // Quoted text, identifiers and comments must not masquerade as SQL keywords or separators.
        const tokenPattern = new RegExp([
            '--[^\\r\\n]*', '/\\*[\\s\\S]*?\\*/', '\'(?:\'\'|[^\'])*\'', '"(?:""|[^"])*"',
            '`(?:``|[^`])*`', '\\[[^\\]]*\\]', '[a-zA-Z_][a-zA-Z_0-9$]*', '[^\\s]',
        ].join('|'), 'g');
        const tokens = sql.match(tokenPattern) ?? [];
        const words: string[] = [];
        let depth = 0;
        let ended = false;
        for (const token of tokens) {
            if (token.startsWith('--') || token.startsWith('/*')) {
                continue;
            }
            if (ended) {
                throw new CoreError('Only one SQLite statement is allowed per batch entry.');
            }
            if (token === ';' && depth === 0) {
                ended = true;
            } else if (token === '(') {
                depth++;
            } else if (token === ')') {
                depth--;
            } else if (depth === 0 && /^[a-zA-Z_]/.test(token)) {
                words.push(token.toUpperCase());
            }
        }

        const kind = words[0] === 'WITH'
            ? words.find(word => ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'REPLACE'].includes(word))
            : words[0];
        if (!kind || !['SELECT', 'PRAGMA', 'EXPLAIN', 'INSERT', 'REPLACE', 'UPDATE', 'DELETE',
            'CREATE', 'ALTER', 'DROP', 'VACUUM', 'ANALYZE', 'REINDEX'].includes(kind)) {
            throw new CoreError('Unsupported SQLite statement; transactions are managed by the adapter.');
        }
        if (words.includes('RETURNING')) {
            throw new CoreError('SQLite RETURNING is not supported by the compatibility adapter.');
        }
        const values = params.map(value => {
            if (value === undefined || value === null) {
                return null;
            }
            if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) {
                throw new CoreError('Unsupported SQLite parameter value.');
            }

            return value;
        });
        const leading = /^(\s|--[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)*/.exec(sql)?.[0].length ?? 0;

        return { sql: sql.slice(leading), kind, values };
    }

    /**
     * Normalise only the raw iOS column metadata sentinel, not a user column named ios_columns.
     *
     * @param values Raw query rows.
     * @returns Validated row objects.
     */
    protected rows(values: unknown): Record<string, unknown>[] {
        if (!Array.isArray(values) || values.some(row => row === null || typeof row !== 'object' || Array.isArray(row))) {
            throw new CoreError('Invalid SQLite query response.');
        }
        const rows: Record<string, unknown>[] = values;
        const first = rows[0];

        return first && Object.keys(first).length === 1 && Array.isArray(first.ios_columns) &&
            first.ios_columns.every(column => typeof column === 'string') ? rows.slice(1) : rows;
    }

    /**
     * Construct the WebSQL-style row accessor consumed by SQLiteDB.
     *
     * @param rows Query rows.
     * @param rowsAffected Directly affected rows.
     * @param insertId New row ID, only for successful insert/replace statements.
     * @returns App-shaped result.
     */
    protected result(rows: Record<string, unknown>[], rowsAffected: number, insertId?: number): SQLiteDBResult {
        return {
            rows: { length: rows.length, item: index => rows[index] },
            rowsAffected,
            ...(insertId === undefined ? {} : { insertId }),
        };
    }

}

export type CoreCapacitorSQLiteDriver = Pick<CapacitorSQLitePlugin,
    'query' | 'run' | 'beginTransaction' | 'commitTransaction' | 'rollbackTransaction' |
    'isTransactionActive' | 'isDatabase' | 'close' | 'open'>;

type PreparedStatement = {
    sql: string;
    kind: string;
    values: (number | string | null)[];
};
