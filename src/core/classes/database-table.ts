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

import { SQLiteDB, SQLiteDBRecordValues } from './sqlitedb';

/**
 * Database table wrapper used to improve performance by caching all data in memory
 * for faster read operations.
 */
export abstract class CoreDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumns extends keyof DBRecord = 'id',
    PrimaryKey extends GetPrimaryKey<DBRecord, PrimaryKeyColumns> = GetPrimaryKey<DBRecord, PrimaryKeyColumns>
> {

    /**
     * Create an instance.
     *
     * @param db Database connection.
     * @returns Instance.
     */
    static async create<This extends AnyCoreDatabaseTable>(this: CoreDatabaseTableConstructor<This>, db: SQLiteDB): Promise<This> {
        const instance = new this(db);

        await instance.initialize();

        return instance;
    }

    protected db: SQLiteDB;
    protected data: Record<string, DBRecord>;
    protected primaryKeys: string[] = ['id'];

    constructor(db: SQLiteDB) {
        this.db = db;
        this.data = {};
    }

    /**
     * Find a record matching the given conditions.
     *
     * @param conditions Matching conditions.
     * @returns Database record.
     */
    find(conditions: Partial<DBRecord>): DBRecord | null  {
        return Object.values(this.data).find(record => this.recordMatches(record, conditions)) ?? null;
    }

    /**
     * Find a record by its primary key.
     *
     * @param primaryKey Primary key.
     * @returns Database record.
     */
    findByPrimaryKey(primaryKey: PrimaryKey): DBRecord | null {
        return this.data[this.serializePrimaryKey(primaryKey)] ?? null;
    }

    /**
     * Insert a new record.
     *
     * @param record Database record.
     */
    async insert(record: DBRecord): Promise<void> {
        await this.db.insertRecord(this.table, record);

        const primaryKey = this.serializePrimaryKey(this.getPrimaryKeyFromRecord(record));

        this.data[primaryKey] = record;
    }

    /**
     * Delete records matching the given conditions.
     *
     * @param conditions Matching conditions. If this argument is missing, all records will be deleted.
     */
    async delete(conditions?: Partial<DBRecord>): Promise<void> {
        if (!conditions) {
            await this.db.deleteRecords(this.table);

            this.data = {};

            return;
        }

        await this.db.deleteRecords(this.table, conditions);

        Object.entries(this.data).forEach(([id, record]) => {
            if (!this.recordMatches(record, conditions)) {
                return;
            }

            delete this.data[id];
        });
    }

    /**
     * Delete a single record identified by its primary key.
     *
     * @param primaryKey Record primary key.
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        await this.db.deleteRecords(this.table, primaryKey);

        delete this.data[this.serializePrimaryKey(primaryKey)];
    }

    /**
     * Database table name.
     */
    protected abstract get table(): string;

    /**
     * Initialize object by getting the current state of the database table.
     */
    protected async initialize(): Promise<void> {
        const records = await this.db.getRecords<DBRecord>(this.table);

        this.data = records.reduce((data, record) => {
            const primaryKey = this.serializePrimaryKey(this.getPrimaryKeyFromRecord(record));

            data[primaryKey] = record;

            return data;
        }, {});
    }

    /**
     * Get an object with the columns representing the primary key of a database record.
     *
     * @param record Database record.
     * @returns Primary key column-value pairs.
     */
    protected getPrimaryKeyFromRecord(record: DBRecord): PrimaryKey {
        return this.primaryKeys.reduce((primaryKey, column) => {
            primaryKey[column] = record[column];

            return primaryKey;
        }, {} as Record<PrimaryKeyColumns, unknown>) as PrimaryKey;
    }

    /**
     * Serialize a primary key with a string representation.
     *
     * @param primaryKey Database record primary key.
     * @returns Serialized primary key.
     */
    protected serializePrimaryKey(primaryKey: PrimaryKey): string {
        return Object.values(primaryKey).map(value => String(value)).join('-');
    }

    /**
     * Check whether a given record matches the given conditions.
     *
     * @param record Database record.
     * @param conditions Conditions.
     * @returns Whether the record matches the conditions.
     */
    protected recordMatches(record: DBRecord, conditions: Partial<DBRecord>): boolean {
        return !Object.entries(conditions).some(([column, value]) => record[column] !== value);
    }

}

/**
 * Generic type to match against any concrete database table type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCoreDatabaseTable = CoreDatabaseTable<SQLiteDBRecordValues, string, Record<string, any>>;

/**
 * Database table constructor.
 */
type CoreDatabaseTableConstructor<T extends AnyCoreDatabaseTable> = {
    new (db: SQLiteDB): T;
};

/**
 * Infer primary key type from database record and columns types.
 */
type GetPrimaryKey<DBRecord extends SQLiteDBRecordValues, PrimaryKeyColumns extends keyof DBRecord> = {
    [column in PrimaryKeyColumns]: DBRecord[column];
};
