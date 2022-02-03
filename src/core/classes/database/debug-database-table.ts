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
import { CoreLogger } from '@singletons/logger';
import { CoreDatabaseTable, CoreDatabaseConditions, GetDBRecordPrimaryKey, CoreDatabaseReducer } from './database-table';

/**
 * Database table proxy used to debug runtime operations.
 *
 * This proxy should only be used for development purposes.
 */
export class CoreDebugDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>
> extends CoreDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey> {

    protected target: CoreDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey>;
    protected logger: CoreLogger;

    constructor(target: CoreDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey>) {
        super(target.getDatabase(), target.getTableName(), target.getPrimaryKeyColumns());

        this.target = target;
        this.logger = CoreLogger.getInstance(`CoreDatabase[${this.tableName}]`);
    }

    /**
     * @inheritdoc
     */
    initialize(): Promise<void> {
        this.logger.log('initialize');

        return this.target.initialize();
    }

    /**
     * @inheritdoc
     */
    destroy(): Promise<void> {
        this.logger.log('destroy');

        return this.target.destroy();
    }

    /**
     * @inheritdoc
     */
    all(conditions?: Partial<DBRecord>): Promise<DBRecord[]> {
        this.logger.log('all', conditions);

        return this.target.all(conditions);
    }

    /**
     * @inheritdoc
     */
    find(conditions: Partial<DBRecord>): Promise<DBRecord> {
        this.logger.log('find', conditions);

        return this.target.find(conditions);
    }

    /**
     * @inheritdoc
     */
    findByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        this.logger.log('findByPrimaryKey', primaryKey);

        return this.target.findByPrimaryKey(primaryKey);
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
    insert(record: DBRecord): Promise<void> {
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
    deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        this.logger.log('deleteByPrimaryKey', primaryKey);

        return this.target.deleteByPrimaryKey(primaryKey);
    }

}
