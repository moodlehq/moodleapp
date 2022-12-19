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
import { CoreInMemoryDatabaseTable } from './inmemory-database-table';
import {
    CoreDatabaseConfiguration,
    CoreDatabaseConditions,
    GetDBRecordPrimaryKey,
    CoreDatabaseQueryOptions,
} from './database-table';

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
> extends CoreInMemoryDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey> {

    protected readonly DEFAULT_CACHE_LIFETIME = 60000;

    protected records: Record<string, DBRecord | null> = {};
    protected interval?: number;

    /**
     * @inheritdoc
     */
    async initialize(): Promise<void> {
        await super.initialize();

        this.interval = window.setInterval(() => (this.records = {}), this.config.lazyCacheLifetime ?? this.DEFAULT_CACHE_LIFETIME);
    }

    /**
     * @inheritdoc
     */
    async destroy(): Promise<void> {
        await super.destroy();

        this.interval && window.clearInterval(this.interval);
    }

    /**
     * @inheritdoc
     */
    matchesConfig(config: Partial<CoreDatabaseConfiguration>): boolean {
        const thisCacheLifetime = this.config.lazyCacheLifetime ?? this.DEFAULT_CACHE_LIFETIME;
        const otherCacheLifetime = config.lazyCacheLifetime ?? this.DEFAULT_CACHE_LIFETIME;

        return super.matchesConfig(config) && thisCacheLifetime === otherCacheLifetime;
    }

    /**
     * @inheritdoc
     */
    async getOne(
        conditions?: Partial<DBRecord>,
        options?: Partial<Omit<CoreDatabaseQueryOptions<DBRecord>, 'offset' | 'limit'>>,
    ): Promise<DBRecord> {
        const record = await super.getOne(conditions, options);

        this.records[this.serializePrimaryKey(this.getPrimaryKeyFromRecord(record))] = record;

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
    async hasAny(conditions?: Partial<DBRecord>): Promise<boolean> {
        const hasAnyMatching = Object
            .values(this.records)
            .some(record => record !== null && (!conditions || this.recordMatches(record, conditions)));

        if (hasAnyMatching) {
            return true;
        }

        return super.hasAny(conditions);
    }

    /**
     * @inheritdoc
     */
    async hasAnyByPrimaryKey(primaryKey: PrimaryKey): Promise<boolean> {
        const record = this.records[this.serializePrimaryKey(primaryKey)] ?? null;

        return record !== null;
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

declare module '@classes/database/database-table' {

    /**
     * Augment CoreDatabaseConfiguration interface with data specific to this table.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreDatabaseConfiguration {
        lazyCacheLifetime: number;
    }

}
