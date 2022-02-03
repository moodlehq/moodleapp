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

import { SQLiteDB, SQLiteDBRecordValue, SQLiteDBRecordValues } from '@classes/sqlitedb';

/**
 * Wrapper used to interact with a database table.
 */
export class CoreDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>
> {

    protected database: SQLiteDB;
    protected tableName: string;
    protected primaryKeyColumns: PrimaryKeyColumn[];

    constructor(database: SQLiteDB, tableName: string, primaryKeyColumns?: PrimaryKeyColumn[]) {
        this.database = database;
        this.tableName = tableName;
        this.primaryKeyColumns = primaryKeyColumns ?? ['id'] as PrimaryKeyColumn[];
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
        // Nothing to destroy by default, override this method if necessary.
    }

    /**
     * Get records matching the given conditions.
     *
     * @param conditions Matching conditions. If this argument is missing, all records in the table will be returned.
     * @returns Database records.
     */
    all(conditions?: Partial<DBRecord>): Promise<DBRecord[]> {
        return conditions
            ? this.database.getRecords(this.tableName, conditions)
            : this.database.getAllRecords(this.tableName);
    }

    /**
     * Find one record matching the given conditions.
     *
     * @param conditions Matching conditions.
     * @returns Database record.
     */
    find(conditions: Partial<DBRecord>): Promise<DBRecord> {
        return this.database.getRecord<DBRecord>(this.tableName, conditions);
    }

    /**
     * Find one record by its primary key.
     *
     * @param primaryKey Primary key.
     * @returns Database record.
     */
    findByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
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
     * Insert a new record.
     *
     * @param record Database record.
     */
    async insert(record: DBRecord): Promise<void> {
        await this.database.insertRecord(this.tableName, record);
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

}

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
