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

import { SubPartial } from '@/core/utils/types';
import { CoreError } from '@classes/errors/error';
import { SQLiteDB, SQLiteDBRecordValue, SQLiteDBRecordValues } from '@classes/sqlitedb';

/**
 * Wrapper used to interact with a database table.
 */
export class CoreDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    RowIdColumn extends PrimaryKeyColumn = PrimaryKeyColumn,
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>,
> {

    protected config: Partial<CoreDatabaseConfiguration>;
    protected database: SQLiteDB;
    protected tableName: string;
    protected primaryKeyColumns: PrimaryKeyColumn[];
    protected rowIdColumn: RowIdColumn | null;
    protected listeners: CoreDatabaseTableListener[] = [];

    constructor(
        config: Partial<CoreDatabaseConfiguration>,
        database: SQLiteDB,
        tableName: string,
        primaryKeyColumns?: PrimaryKeyColumn[],
        rowIdColumn?: RowIdColumn | null,
    ) {
        this.config = config;
        this.database = database;
        this.tableName = tableName;
        this.primaryKeyColumns = primaryKeyColumns ?? ['id'] as PrimaryKeyColumn[];
        this.rowIdColumn = rowIdColumn === null ? null : (rowIdColumn ?? 'id') as RowIdColumn;
    }

    /**
     * Get database configuration.
     *
     * @returns The database configuration.
     */
    getConfig(): Partial<CoreDatabaseConfiguration> {
        return this.config;
    }

    /**
     * Get database connection.
     *
     * @returns Database connection.
     */
    getDatabase(): SQLiteDB {
        return this.database;
    }

    /**
     * Get table name.
     *
     * @returns Table name.
     */
    getTableName(): string {
        return this.tableName;
    }

    /**
     * Get primary key columns.
     *
     * @returns Primary key columns.
     */
    getPrimaryKeyColumns(): PrimaryKeyColumn[] {
        return this.primaryKeyColumns.slice(0);
    }

    /**
     * Initialize.
     */
    async initialize(): Promise<void> {
        // Nothing to initialize by default, override this method if necessary.
    }

    /**
     * Destroy.
     */
    async destroy(): Promise<void> {
        this.listeners.forEach(listener => listener.onDestroy?.());
    }

    /**
     * Add listener.
     *
     * @param listener Listener.
     */
    addListener(listener: CoreDatabaseTableListener): void {
        this.listeners.push(listener);
    }

    /**
     * Check whether the table matches the given configuration for the values that concern it.
     *
     * @param config Database config.
     * @returns Whether the table matches the given configuration.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matchesConfig(config: Partial<CoreDatabaseConfiguration>): boolean {
        return true;
    }

    /**
     * Get records matching the given conditions.
     *
     * @param conditions Matching conditions. If this argument is missing, all records in the table will be returned.
     * @param options Query options.
     * @returns Database records.
     */
    getMany(conditions?: Partial<DBRecord>, options?: Partial<CoreDatabaseQueryOptions<DBRecord>>): Promise<DBRecord[]> {
        if (!conditions && !options) {
            return this.database.getAllRecords(this.tableName);
        }

        const sorting = options?.sorting
            && this.normalizedSorting(options.sorting).map(([column, direction]) => `${column.toString()} ${direction}`).join(', ');

        return this.database.getRecords(this.tableName, conditions, sorting, '*', options?.offset, options?.limit);
    }

    /**
     * Get records matching the given conditions.
     *
     * This method should be used when it's necessary to apply complex conditions; the simple `getMany`
     * method should be favored otherwise for better performance.
     *
     * @param conditions Matching conditions in SQL and JavaScript.
     * @returns Records matching the given conditions.
     */
    getManyWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<DBRecord[]>  {
        return this.database.getRecordsSelect(this.tableName, conditions.sql, conditions.sqlParams);
    }

    /**
     * Find one record matching the given conditions.
     *
     * @param conditions Matching conditions.
     * @param options Result options.
     * @returns Database record.
     */
    async getOne(
        conditions?: Partial<DBRecord>,
        options?: Partial<Omit<CoreDatabaseQueryOptions<DBRecord>, 'offset' | 'limit'>>,
    ): Promise<DBRecord> {
        if (!options) {
            return this.database.getRecord<DBRecord>(this.tableName, conditions);
        }

        const records = await this.getMany(conditions, {
            ...options,
            limit: 1,
        });

        if (records.length === 0) {
            throw new CoreError('No records found.');
        }

        return records[0];
    }

    /**
     * Find one record by its primary key.
     *
     * @param primaryKey Primary key.
     * @returns Database record.
     */
    getOneByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        return this.database.getRecord<DBRecord>(this.tableName, primaryKey);
    }

    /**
     * Reduce some records into a single value.
     *
     * @param reducer Reducer functions in SQL and JavaScript.
     * @param conditions Matching conditions in SQL and JavaScript. If this argument is missing, all records in the table
     *                   will be used.
     * @returns Reduced value.
     */
    reduce<T>(reducer: CoreDatabaseReducer<DBRecord, T>, conditions?: CoreDatabaseConditions<DBRecord>): Promise<T> {
        return this.database.getFieldSql(
            `SELECT ${reducer.sql} FROM ${this.tableName} ${conditions?.sql ?? ''}`,
            conditions?.sqlParams,
        ) as unknown as Promise<T>;
    }

    /**
     * Check whether the table is empty or not.
     *
     * @returns Whether the table is empty or not.
     */
    isEmpty(): Promise<boolean> {
        return this.hasAny();
    }

    /**
     * Check whether the table has any record matching the given conditions.
     *
     * @param conditions Matching conditions. If this argument is missing, this method will return whether the table
     *                   is empty or not.
     * @returns Whether the table contains any records matching the given conditions.
     */
    async hasAny(conditions?: Partial<DBRecord>): Promise<boolean> {
        try {
            await this.getOne(conditions);

            return true;
        } catch (error) {
            // Couldn't get a single record.
            return false;
        }
    }

    /**
     * Check whether the table has any record matching the given primary key.
     *
     * @param primaryKey Record primary key.
     * @returns Whether the table contains a record matching the given primary key.
     */
    async hasAnyByPrimaryKey(primaryKey: PrimaryKey): Promise<boolean> {
        try {
            await this.getOneByPrimaryKey(primaryKey);

            return true;
        } catch (error) {
            // Couldn't get the record.
            return false;
        }
    }

    /**
     * Count records in table.
     *
     * @param conditions Matching conditions.
     * @returns Number of records matching the given conditions.
     */
    count(conditions?: Partial<DBRecord>): Promise<number> {
        return this.database.countRecords(this.tableName, conditions);
    }

    /**
     * Insert a new record.
     *
     * @param record Database record.
     * @returns New record row id.
     */
    async insert(record: SubPartial<DBRecord, RowIdColumn>): Promise<number> {
        const rowId = await this.database.insertRecord(this.tableName, record);

        return rowId;
    }

    /**
     * Insert a new record synchronously.
     *
     * @param record Database record.
     */
    syncInsert(record: SubPartial<DBRecord, RowIdColumn>): void {
        // The current database architecture does not support synchronous operations,
        // so calling this method will mean that errors will be silenced. Because of that,
        // this should only be called if using the asynchronous alternatives is not possible.
        this.insert(record);
    }

    /**
     * Update records matching the given conditions.
     *
     * @param updates Record updates.
     * @param conditions Matching conditions. If this argument is missing, all records will be updated.
     */
    async update(updates: Partial<DBRecord>, conditions?: Partial<DBRecord>): Promise<void> {
        await this.database.updateRecords(this.tableName, updates, conditions);
    }

    /**
     * Update records matching the given conditions.
     *
     * This method should be used when it's necessary to apply complex conditions; the simple `update`
     * method should be favored otherwise for better performance.
     *
     * @param updates Record updates.
     * @param conditions Matching conditions in SQL and JavaScript.
     */
    async updateWhere(updates: Partial<DBRecord>, conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        await this.database.updateRecordsWhere(this.tableName, updates, conditions.sql, conditions.sqlParams);
    }

    /**
     * Delete records matching the given conditions.
     *
     * @param conditions Matching conditions. If this argument is missing, all records will be deleted.
     */
    async delete(conditions?: Partial<DBRecord>): Promise<void> {
        conditions
            ? await this.database.deleteRecords(this.tableName, conditions)
            : await this.database.deleteRecords(this.tableName);
    }

    /**
     * Delete records matching the given conditions.
     *
     * This method should be used when it's necessary to apply complex conditions; the simple `delete`
     * method should be favored otherwise for better performance.
     *
     * @param conditions Matching conditions in SQL and JavaScript.
     */
    async deleteWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        await this.database.deleteRecordsSelect(this.tableName, conditions.sql, conditions.sqlParams);
    }

    /**
     * Delete a single record identified by its primary key.
     *
     * @param primaryKey Record primary key.
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        await this.database.deleteRecords(this.tableName, primaryKey);
    }

    /**
     * Get the primary key from a database record.
     *
     * @param record Database record.
     * @returns Primary key.
     */
    protected getPrimaryKeyFromRecord(record: DBRecord): PrimaryKey {
        return this.primaryKeyColumns.reduce((primaryKey, column) => {
            primaryKey[column] = record[column];

            return primaryKey;
        }, {} as Record<PrimaryKeyColumn, unknown>) as PrimaryKey;
    }

    /**
     * Serialize a primary key with a string representation.
     *
     * @param primaryKey Primary key.
     * @returns Serialized primary key.
     */
    protected serializePrimaryKey(primaryKey: PrimaryKey): string {
        return Object.values(primaryKey).map(value => String(value)).join('-');
    }

    /**
     * Check whether a given record matches the given conditions.
     *
     * @param record Database record.
     * @param conditions Matching conditions.
     * @returns Whether the record matches the conditions.
     */
    protected recordMatches(record: DBRecord, conditions: Partial<DBRecord>): boolean {
        return !Object.entries(conditions).some(([column, value]) => record[column] !== value);
    }

    /**
     * Sort a list of records with the given order. This method mutates the input array.
     *
     * @param records Array of records to sort.
     * @param sorting Sorting conditions.
     * @returns Sorted array. This will be the same reference that was given as an argument.
     */
    protected sortRecords(records: DBRecord[], sorting: CoreDatabaseSorting<DBRecord>): DBRecord[] {
        const columnsSorting = this.normalizedSorting(sorting);

        records.sort((a, b) => {
            for (const [column, direction] of columnsSorting) {
                const aValue = a[column] ?? 0;
                const bValue = b[column] ?? 0;

                if (aValue > bValue) {
                    return direction === 'desc' ? -1 : 1;
                }

                if (aValue < bValue) {
                    return direction === 'desc' ? 1 : -1;
                }
            }

            return 0;
        });

        return records;
    }

    /**
     * Get a normalized array of sorting conditions.
     *
     * @param sorting Sorting conditions.
     * @returns Normalized sorting conditions.
     */
    protected normalizedSorting(sorting: CoreDatabaseSorting<DBRecord>): [keyof DBRecord, 'asc' | 'desc'][] {
        const sortingArray = Array.isArray(sorting) ? sorting : [sorting];

        return sortingArray.reduce((normalizedSorting, columnSorting) => {
            normalizedSorting.push(
                typeof columnSorting === 'object'
                    ? [
                        Object.keys(columnSorting)[0] as keyof DBRecord,
                        Object.values(columnSorting)[0] as 'asc' | 'desc',
                    ]
                    : [columnSorting, 'asc'],
            );

            return normalizedSorting;
        }, [] as [keyof DBRecord, 'asc' | 'desc'][]);
    }

}

/**
 * Database configuration.
 */
export interface CoreDatabaseConfiguration {
    // This definition is augmented in subclasses.
}

/**
 * Database table listener.
 */
export interface CoreDatabaseTableListener {
    onDestroy?(): void;
}

/**
 * CoreDatabaseTable constructor.
 */
export type CoreDatabaseTableConstructor<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    RowIdColumn extends PrimaryKeyColumn = PrimaryKeyColumn,
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>,
> = {

    new (
        config: Partial<CoreDatabaseConfiguration>,
        database: SQLiteDB,
        tableName: string,
        primaryKeyColumns?: PrimaryKeyColumn[],
        rowIdColumn?: RowIdColumn | null,
    ): CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn, PrimaryKey>;

};

/**
 * Infer primary key type from database record and primary key column types.
 */
export type GetDBRecordPrimaryKey<DBRecord extends SQLiteDBRecordValues, PrimaryKeyColumn extends keyof DBRecord> = {
    [column in PrimaryKeyColumn]: DBRecord[column];
};

/**
 * Reducer used to accumulate a value from multiple records both in SQL and JavaScript.
 *
 * Both operations should be equivalent.
 */
export type CoreDatabaseReducer<DBRecord, T> = {
    sql: string;
    js: (previousValue: T, record: DBRecord) => T;
    jsInitialValue: T;
};

/**
 * Conditions to match database records both in SQL and JavaScript.
 *
 * Both conditions should be equivalent.
 */
export type CoreDatabaseConditions<DBRecord> = {
    sql: string;
    sqlParams?: SQLiteDBRecordValue[];
    js: (record: DBRecord) => boolean;
};

/**
 * Sorting conditions for a single column.
 *
 * This type will accept an object that defines sorting conditions for a single column, but not more.
 * For example, `{id: 'desc'}` and `{name: 'asc'}` would be acceptend values, but `{id: 'desc', name: 'asc'}` wouldn't.
 *
 * @see https://stackoverflow.com/questions/57571664/typescript-type-for-an-object-with-only-one-key-no-union-type-allowed-as-a-key
 */
export type CoreDatabaseColumnSorting<DBRecordColumn extends string | symbol | number> = {
    [Column in DBRecordColumn]:
    (Record<Column, 'asc' | 'desc'> & Partial<Record<Exclude<DBRecordColumn, Column>, never>>) extends infer ColumnSorting
        ? { [Column in keyof ColumnSorting]: ColumnSorting[Column] }
        : never;
}[DBRecordColumn];

/**
 * Sorting conditions to apply to query results.
 *
 * Columns will be sorted in ascending order by default.
 */
export type CoreDatabaseSorting<DBRecord> =
    keyof DBRecord |
    CoreDatabaseColumnSorting<keyof DBRecord> |
    Array<keyof DBRecord | CoreDatabaseColumnSorting<keyof DBRecord>>;

/**
 * Options to configure query results.
 */
export type CoreDatabaseQueryOptions<DBRecord> = {
    offset: number;
    limit: number;
    sorting: CoreDatabaseSorting<DBRecord>;
};
