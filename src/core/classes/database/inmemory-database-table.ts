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

import { CoreError } from '@classes/errors/error';
import { SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreSingletonDatabaseTable } from './singleton-database-table';
import {
    CoreDatabaseConditions,
    GetDBRecordPrimaryKey,
    CoreDatabaseReducer,
    CoreDatabaseQueryOptions,
} from './database-table';

/**
 * Wrapper used to caching records in testing environment.
 */
export class CoreInMemoryDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>
> extends CoreSingletonDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey> {

    protected records: Record<string, DBRecord> = {};

    /**
     * @inheritdoc
     */
    async getMany(conditions?: Partial<DBRecord>, options?: Partial<CoreDatabaseQueryOptions<DBRecord>>): Promise<DBRecord[]> {
        const records = Object.values(this.records);
        const filteredRecords = conditions
            ? records.filter(record => this.recordMatches(record, conditions))
            : records;

        if (options?.sorting) {
            this.sortRecords(filteredRecords, options.sorting);
        }

        return filteredRecords.slice(options?.offset ?? 0, options?.limit);
    }

    /**
     * @inheritdoc
     */
    async getManyWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<DBRecord[]> {
        return Object.values(this.records).filter(record => conditions.js(record));
    }

    /**
     * @inheritdoc
     */
    async getOne(
        conditions?: Partial<DBRecord>,
        options?: Partial<Omit<CoreDatabaseQueryOptions<DBRecord>, 'offset' | 'limit'>>,
    ): Promise<DBRecord> {
        let record: DBRecord | undefined;

        if (options?.sorting) {
            record = this.getMany(conditions, { ...options, limit: 1 })[0];
        } else if (conditions) {
            record = Object.values(this.records).find(record => this.recordMatches(record, conditions));
        } else {
            record = Object.values(this.records)[0];
        }

        if (!record) {
            throw new CoreError('No records found.');
        }

        return record;
    }

    /**
     * @inheritdoc
     */
    async getOneByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        const record = this.records[this.serializePrimaryKey(primaryKey)] ?? null;

        if (record === null) {
            throw new CoreError('No records found.');
        }

        return record;
    }

    /**
     * @inheritdoc
     */
    async reduce<T>(reducer: CoreDatabaseReducer<DBRecord, T>, conditions?: CoreDatabaseConditions<DBRecord>): Promise<T> {
        return Object
            .values(this.records)
            .reduce(
                (result, record) => (!conditions || conditions.js(record)) ? reducer.js(result, record) : result,
                reducer.jsInitialValue,
            );
    }

    /**
     * @inheritdoc
     */
    async hasAny(conditions?: Partial<DBRecord>): Promise<boolean> {
        return conditions
            ? Object.values(this.records).some(record => this.recordMatches(record, conditions))
            : Object.values(this.records).length > 0;
    }

    /**
     * @inheritdoc
     */
    async hasAnyByPrimaryKey(primaryKey: PrimaryKey): Promise<boolean> {
        return this.serializePrimaryKey(primaryKey) in this.records;
    }

    /**
     * @inheritdoc
     */
    async count(conditions?: Partial<DBRecord>): Promise<number> {
        return conditions
            ? Object.values(this.records).filter(record => this.recordMatches(record, conditions)).length
            : Object.values(this.records).length;
    }

    /**
     * @inheritdoc
     */
    async insert(record: DBRecord): Promise<void> {
        const primaryKey = this.serializePrimaryKey(this.getPrimaryKeyFromRecord(record));
        this.records[primaryKey] = record;
    }

    /**
     * @inheritdoc
     */
    async update(updates: Partial<DBRecord>, conditions?: Partial<DBRecord>): Promise<void> {
        for (const record of Object.values(this.records)) {
            if (conditions && !this.recordMatches(record, conditions)) {
                continue;
            }

            Object.assign(record, updates);
        }
    }

    /**
     * @inheritdoc
     */
    async updateWhere(updates: Partial<DBRecord>, conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        for (const record of Object.values(this.records)) {
            if (!conditions.js(record)) {
                continue;
            }

            Object.assign(record, updates);
        }
    }

    /**
     * @inheritdoc
     */
    async delete(conditions?: Partial<DBRecord>): Promise<void> {
        if (!conditions) {
            this.records = {};

            return;
        }

        Object.entries(this.records).forEach(([id, record]) => {
            if (!this.recordMatches(record, conditions)) {
                return;
            }

            delete this.records[id];
        });
    }

    /**
     * @inheritdoc
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        delete this.records[this.serializePrimaryKey(primaryKey)];
    }

}
