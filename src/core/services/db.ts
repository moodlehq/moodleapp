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

import { SQLiteDB } from '@classes/sqlitedb';
import { SQLiteDBMock } from '@features/emulator/classes/sqlitedb';
import { CoreBrowser } from '@singletons/browser';
import { makeSingleton, SQLite } from '@singletons';
import { CorePlatform } from '@services/platform';

const tableNameRegex = new RegExp([
    '^SELECT.*FROM ([^ ]+)',
    '^INSERT.*INTO ([^ ]+)',
    '^UPDATE ([^ ]+)',
    '^DELETE FROM ([^ ]+)',
    '^CREATE TABLE IF NOT EXISTS ([^ ]+)',
    '^ALTER TABLE ([^ ]+)',
    '^DROP TABLE IF EXISTS ([^ ]+)',
].join('|'));

/**
 * This service allows interacting with the local database to store and retrieve data.
 */
@Injectable({ providedIn: 'root' })
export class CoreDbProvider {

    queryLogs: CoreDbQueryLog[] = [];

    protected dbInstances: {[name: string]: SQLiteDB} = {};

    /**
     * Check whether database queries should be logged.
     *
     * @returns Whether queries should be logged.
     */
    loggingEnabled(): boolean {
        return CoreBrowser.hasDevelopmentSetting('DBLoggingEnabled');
    }

    /**
     * Print query history in console.
     *
     * @param format Log format, with the following substitutions: :dbname, :sql, :duration, and :result.
     */
    printHistory(format: string = ':dbname | :sql | Duration: :duration | Result: :result'): void {
        const substituteParams = ({ sql, params, duration, error, dbName }: CoreDbQueryLog) => format
            .replace(':dbname', dbName)
            .replace(':sql', Object
                .values(params ?? [])
                .reduce((sql: string, param: string) => sql.replace('?', param) as string, sql) as string)
            .replace(':duration', `${Math.round(duration).toString().padStart(4, '0')}ms`)
            .replace(':result', error?.message ?? 'Success');

        // eslint-disable-next-line no-console
        console.log(this.queryLogs.map(substituteParams).join('\n'));
    }

    /**
     * Get the table name from a SQL query.
     *
     * @param sql SQL query.
     * @returns Table name, undefined if not found.
     */
    protected getTableNameFromSql(sql: string): string | undefined {
        const matches = sql.match(tableNameRegex);

        return matches?.find((matchEntry, index) => index > 0 && !!matchEntry);
    }

    /**
     * Check if a value matches a certain filter.
     *
     * @param value Value.
     * @param filter Filter.
     * @returns Whether the value matches the filter.
     */
    protected valueMatchesFilter(value: string, filter?: RegExp | string): boolean {
        if (typeof filter === 'string') {
            return value === filter;
        } else if (filter) {
            return !!value.match(filter);
        }

        return true;
    }

    /**
     * Build an object with the summary data for each db, table and statement.
     *
     * @param filters Filters to limit the data stored.
     * @returns Object with the summary data.
     */
    protected buildStatementsSummary(
        filters: TablesSummaryFilters = {},
    ): Record<string, Record<string, Record<string, CoreDbStatementSummary>>> {
        const statementsSummary: Record<string, Record<string, Record<string, CoreDbStatementSummary>>> = {};

        this.queryLogs.forEach(log => {
            if (!this.valueMatchesFilter(log.dbName, filters.dbName)) {
                return;
            }

            const statement = log.sql.substring(0, log.sql.indexOf(' '));
            if (!statement) {
                console.warn(`Statement not found from sql: ${log.sql}`); // eslint-disable-line no-console

                return;
            }

            const tableName = this.getTableNameFromSql(log.sql);
            if (!tableName) {
                console.warn(`Table name not found from sql: ${log.sql}`); // eslint-disable-line no-console

                return;
            }

            if (!this.valueMatchesFilter(tableName, filters.tableName)) {
                return;
            }

            statementsSummary[log.dbName] = statementsSummary[log.dbName] ?? {};
            statementsSummary[log.dbName][tableName] = statementsSummary[log.dbName][tableName] ?? {};
            statementsSummary[log.dbName][tableName][statement] = statementsSummary[log.dbName][tableName][statement] ?? {
                count: 0,
                duration: 0,
                errors: 0,
            };

            statementsSummary[log.dbName][tableName][statement].count++;
            statementsSummary[log.dbName][tableName][statement].duration += log.duration;
            if (log.error) {
                statementsSummary[log.dbName][tableName][statement].errors++;
            }
        });

        return statementsSummary;
    }

    /**
     * Print summary of statements for several tables.
     *
     * @param filters Filters to limit the results printed.
     * @param format Log format, with the following substitutions: :dbname, :table, :statement, :count, :duration and :errors.
     */
    printTablesSummary(
        filters: TablesSummaryFilters = {},
        format = ':dbname, :table, :statement, :count, :duration, :errors',
    ): void {
        const statementsSummary = this.buildStatementsSummary(filters);

        const substituteParams = (dbName: string,  tableName: string, statementName: string) => format
            .replace(':dbname', dbName)
            .replace(':table', tableName)
            .replace(':statement', statementName)
            .replace(':count', String(statementsSummary[dbName][tableName][statementName].count))
            .replace(':duration', statementsSummary[dbName][tableName][statementName].duration.toFixed(2) + 'ms')
            .replace(':errors', String(statementsSummary[dbName][tableName][statementName].errors));

        // eslint-disable-next-line no-console
        console.log(
            Object.keys(statementsSummary)
                .sort()
                .map(dbName => Object.keys(statementsSummary[dbName])
                    .sort()
                    .map(tableName => Object.keys(statementsSummary[dbName][tableName])
                        .sort()
                        .map(statementName => substituteParams(dbName, tableName, statementName))
                        .join('\n')).join('\n')).join('\n'),
        );
    }

    /**
     * Log a query.
     *
     * @param log Query log.
     */
    logQuery(log: CoreDbQueryLog): void {
        this.queryLogs.push(log);
    }

    /**
     * Clear stored logs.
     */
    clearLogs(): void {
        this.queryLogs = [];
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
            if (CorePlatform.is('cordova')) {
                this.dbInstances[name] = new SQLiteDB(name);
            } else {
                this.dbInstances[name] = new SQLiteDBMock(name);
            }
        }

        return this.dbInstances[name];
    }

    /**
     * Delete a DB.
     *
     * @param name DB name.
     * @returns Promise resolved when the DB is deleted.
     */
    async deleteDB(name: string): Promise<void> {
        if (this.dbInstances[name] !== undefined) {
            // Close the database first.
            await this.dbInstances[name].close();

            const db = this.dbInstances[name];
            delete this.dbInstances[name];

            if (db instanceof SQLiteDBMock) {
                // In WebSQL we cannot delete the database, just empty it.
                return db.emptyDatabase();
            } else {
                return SQLite.deleteDatabase({
                    name,
                    location: 'default',
                });
            }
        } else if (CorePlatform.is('cordova')) {
            return SQLite.deleteDatabase({
                name,
                location: 'default',
            });
        }
    }

}

export const CoreDB = makeSingleton(CoreDbProvider);

/**
 * Database query log entry.
 */
export interface CoreDbQueryLog {
    dbName: string;
    sql: string;
    duration: number;
    error?: Error;
    params?: unknown[];
}

/**
 * Summary about a certain DB statement.
 */
type CoreDbStatementSummary = {
    count: number;
    duration: number;
    errors: number;
};

/**
 * Filters to print tables summary.
 */
type TablesSummaryFilters = {
    dbName?: RegExp | string;
    tableName?: RegExp | string;
};
