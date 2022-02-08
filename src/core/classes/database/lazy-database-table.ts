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
import { CoreDatabaseTable, CoreDatabaseConditions, GetDBRecordPrimaryKey } from './database-table';

/**
 * Wrapper used to improve performance by caching records that are used often for faster read operations.
 *
 * This implementation works best for tables that have a lot of records and are read often; for tables with a few records use
 * CoreEagerDatabaseTable instead.
 */
export class CoreLazyDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>
> extends CoreDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey> {

    protected records: Record<string, DBRecord | null> = {};

    /**
     * @inheritdoc
     */
    async getOne(conditions: Partial<DBRecord>): Promise<DBRecord> {
        let record: DBRecord | null =
            Object.values(this.records).find(record => record && this.recordMatches(record, conditions)) ?? null;

        if (!record) {
            record = await super.getOne(conditions);

            this.records[this.serializePrimaryKey(this.getPrimaryKeyFromRecord(record))] = record;
        }

        return record;
    }

    /**
     * @inheritdoc
     */
    async getOneByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        const serializePrimaryKey = this.serializePrimaryKey(primaryKey);

        if (!(serializePrimaryKey in this.records)) {
            try {
                const record = await super.getOneByPrimaryKey(primaryKey);

                this.records[serializePrimaryKey] = record;

                return record;
            } catch (error) {
                this.records[serializePrimaryKey] = null;

                throw error;
            }
        }

        const record = this.records[serializePrimaryKey];

        if (!record) {
            throw new CoreError('No records found.');
        }

        return record;
    }

    /**
     * @inheritdoc
     */
    async insert(record: DBRecord): Promise<void> {
        await super.insert(record);

        this.records[this.serializePrimaryKey(this.getPrimaryKeyFromRecord(record))] = record;
    }

    /**
     * @inheritdoc
     */
    async update(updates: Partial<DBRecord>, conditions?: Partial<DBRecord>): Promise<void> {
        await super.update(updates, conditions);

        for (const record of Object.values(this.records)) {
            if (!record || (conditions && !this.recordMatches(record, conditions))) {
                continue;
            }

            Object.assign(record, updates);
        }
    }

    /**
     * @inheritdoc
     */
    async updateWhere(updates: Partial<DBRecord>, conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        await super.updateWhere(updates, conditions);

        for (const record of Object.values(this.records)) {
            if (!record || !conditions.js(record)) {
                continue;
            }

            Object.assign(record, updates);
        }
    }

    /**
     * @inheritdoc
     */
    async delete(conditions?: Partial<DBRecord>): Promise<void> {
        await super.delete(conditions);

        for (const [primaryKey, record] of Object.entries(this.records)) {
            if (!record || (conditions && !this.recordMatches(record, conditions))) {
                continue;
            }

            this.records[primaryKey] = null;
        }
    }

    /**
     * @inheritdoc
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        await super.deleteByPrimaryKey(primaryKey);

        this.records[this.serializePrimaryKey(primaryKey)] = null;
    }

}
