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
import { CoreLogger } from '@static/logger';
import {
    CoreDatabaseTable,
    CoreDatabaseConditions,
    GetDBRecordPrimaryKey,
    CoreDatabaseReducer,
    CoreDatabaseQueryOptions,
} from './database-table';
import { SubPartial } from '@/core/utils/types';

/**
 * Database table proxy used to debug runtime operations.
 *
 * This proxy should only be used for development purposes.
 */
export class CoreDebugDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    RowIdColumn extends PrimaryKeyColumn = PrimaryKeyColumn,
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>,
> extends CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn, PrimaryKey> {

    protected target: CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn, PrimaryKey>;
    protected logger: CoreLogger;

    constructor(target: CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn, PrimaryKey>) {
        super(target.getConfig(), target.getDatabase(), target.getTableName(), target.getPrimaryKeyColumns());

        this.target = target;
        this.logger = CoreLogger.getInstance(`CoreDatabase[${this.tableName}]`);
    }

    /**
     * Get underlying table instance.
     *
     * @returns Table instance.
     */
    getTarget(): CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn, PrimaryKey> {
        return this.target;
    }

    /**
     * @inheritdoc
     */
    async initialize(): Promise<void> {
        await super.initialize();

        this.logger.log('initialize', this.target);

        return this.target.initialize();
    }

    /**
     * @inheritdoc
     */
    async destroy(): Promise<void> {
        await super.destroy();

        this.logger.log('destroy');

        return this.target.destroy();
    }

    /**
     * @inheritdoc
     */
    getMany(conditions?: Partial<DBRecord>, options?: Partial<CoreDatabaseQueryOptions<DBRecord>>): Promise<DBRecord[]> {
        this.logger.log('getMany', conditions, options);

        return this.target.getMany(conditions, options);
    }

    /**
     * @inheritdoc
     */
    getManyWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<DBRecord[]> {
        this.logger.log('getManyWhere', conditions);

        return this.target.getManyWhere(conditions);
    }

    /**
     * @inheritdoc
     */
    getOne(
        conditions?: Partial<DBRecord>,
        options?: Partial<Omit<CoreDatabaseQueryOptions<DBRecord>, 'offset' | 'limit'>>,
    ): Promise<DBRecord> {
        this.logger.log('getOne', conditions, options);

        return this.target.getOne(conditions, options);
    }

    /**
     * @inheritdoc
     */
    getOneByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        this.logger.log('findByPrimaryKey', primaryKey);

        return this.target.getOneByPrimaryKey(primaryKey);
    }

    /**
     * @inheritdoc
     */
    reduce<T>(reducer: CoreDatabaseReducer<DBRecord, T>, conditions?: CoreDatabaseConditions<DBRecord>): Promise<T> {
        this.logger.log('reduce', reducer, conditions);

        return this.target.reduce<T>(reducer, conditions);
    }

    /**
     * @inheritdoc
     */
    hasAny(conditions?: Partial<DBRecord>): Promise<boolean> {
        this.logger.log('hasAny', conditions);

        return this.target.hasAny(conditions);
    }

    /**
     * @inheritdoc
     */
    hasAnyByPrimaryKey(primaryKey: PrimaryKey): Promise<boolean> {
        this.logger.log('hasAnyByPrimaryKey', primaryKey);

        return this.target.hasAnyByPrimaryKey(primaryKey);
    }

    /**
     * @inheritdoc
     */
    count(conditions?: Partial<DBRecord>): Promise<number> {
        this.logger.log('count', conditions);

        return this.target.count(conditions);
    }

    /**
     * @inheritdoc
     */
    insert(record: SubPartial<DBRecord, RowIdColumn>): Promise<number> {
        this.logger.log('insert', record);

        return this.target.insert(record);
    }

    /**
     * @inheritdoc
     */
    update(updates: Partial<DBRecord>, conditions?: Partial<DBRecord>): Promise<void> {
        this.logger.log('update', updates, conditions);

        return this.target.update(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    updateWhere(updates: Partial<DBRecord>, conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        this.logger.log('updateWhere', updates, conditions);

        return this.target.updateWhere(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    delete(conditions?: Partial<DBRecord>): Promise<void> {
        this.logger.log('delete', conditions);

        return this.target.delete(conditions);
    }

    /**
     * @inheritdoc
     */
    async deleteWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        this.logger.log('deleteWhere', conditions);

        return this.target.deleteWhere(conditions);
    }

    /**
     * @inheritdoc
     */
    deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        this.logger.log('deleteByPrimaryKey', primaryKey);

        return this.target.deleteByPrimaryKey(primaryKey);
    }

}
