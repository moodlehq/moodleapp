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

import { SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreSingletonDatabaseTable } from './singleton-database-table';
import {
    CoreDatabaseConditions,
    GetDBRecordPrimaryKey,
    CoreDatabaseReducer,
    CoreDatabaseQueryOptions,
} from './database-table';
import { CoreInMemoryDatabaseTable } from './inmemory-database-table';

/**
 * Wrapper used to improve performance by caching all the records for faster read operations.
 *
 * This implementation works best for tables that don't have a lot of records and are read often; for tables with too many
 * records use CoreLazyDatabaseTable instead.
 */
export class CoreEagerDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>
> extends CoreSingletonDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey> {

    protected inMemoryDb!: CoreInMemoryDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey>;

    /**
     * @inheritdoc
     */
    async initialize(): Promise<void> {
        this.inMemoryDb = new CoreInMemoryDatabaseTable(this.config, this.database, this.tableName, this.primaryKeyColumns);

        await super.initialize();

        const records = await super.getMany();

        for (const record of records) {
            await this.inMemoryDb.insert(record);
        }
    }

    /**
     * @inheritdoc
     */
    async getMany(conditions?: Partial<DBRecord>, options?: Partial<CoreDatabaseQueryOptions<DBRecord>>): Promise<DBRecord[]> {
        return await this.inMemoryDb.getMany(conditions, options);
    }

    /**
     * @inheritdoc
     */
    async getManyWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<DBRecord[]> {
        return await this.inMemoryDb.getManyWhere(conditions);
    }

    /**
     * @inheritdoc
     */
    async getOne(
        conditions?: Partial<DBRecord>,
        options?: Partial<Omit<CoreDatabaseQueryOptions<DBRecord>, 'offset' | 'limit'>>,
    ): Promise<DBRecord> {
        return await this.inMemoryDb.getOne(conditions, options);
    }

    /**
     * @inheritdoc
     */
    async getOneByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        return await this.inMemoryDb.getOneByPrimaryKey(primaryKey);
    }

    /**
     * @inheritdoc
     */
    async reduce<T>(reducer: CoreDatabaseReducer<DBRecord, T>, conditions?: CoreDatabaseConditions<DBRecord>): Promise<T> {
        return this.inMemoryDb.reduce(reducer, conditions);
    }

    /**
     * @inheritdoc
     */
    async hasAny(conditions?: Partial<DBRecord>): Promise<boolean> {
        return this.inMemoryDb.hasAny(conditions);
    }

    /**
     * @inheritdoc
     */
    async hasAnyByPrimaryKey(primaryKey: PrimaryKey): Promise<boolean> {
        return this.inMemoryDb.hasAnyByPrimaryKey(primaryKey);
    }

    /**
     * @inheritdoc
     */
    async count(conditions?: Partial<DBRecord>): Promise<number> {
        return await this.inMemoryDb.count(conditions);
    }

    /**
     * @inheritdoc
     */
    async insert(record: DBRecord): Promise<void> {
        await super.insert(record);
        await this.inMemoryDb.insert(record);
    }

    /**
     * @inheritdoc
     */
    async update(updates: Partial<DBRecord>, conditions?: Partial<DBRecord>): Promise<void> {
        await super.update(updates, conditions);
        await this.inMemoryDb.update(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    async updateWhere(updates: Partial<DBRecord>, conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        await super.updateWhere(updates, conditions);
        await this.inMemoryDb.updateWhere(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    async delete(conditions?: Partial<DBRecord>): Promise<void> {
        await super.delete(conditions);
        await this.inMemoryDb.delete(conditions);
    }

    /**
     * @inheritdoc
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        await super.deleteByPrimaryKey(primaryKey);
        await this.inMemoryDb.deleteByPrimaryKey(primaryKey);
    }

}
