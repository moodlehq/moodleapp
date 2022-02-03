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

import { CorePromisedValue } from '@classes/promised-value';
import { SQLiteDB, SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreDatabaseReducer, CoreDatabaseTable, CoreDatabaseConditions, GetDBRecordPrimaryKey } from './database-table';
import { CoreEagerDatabaseTable } from './eager-database-table';

/**
 * Database table proxy used to route database interactions through different implementations.
 *
 * This class allows using a database wrapper with different optimization strategies that can be changed at runtime.
 */
export class CoreDatabaseTableProxy<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>
> extends CoreDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey> {

    protected config: CoreDatabaseConfiguration;
    protected target: CorePromisedValue<CoreDatabaseTable<DBRecord, PrimaryKeyColumn>> = new CorePromisedValue();

    constructor(
        config: Partial<CoreDatabaseConfiguration>,
        database: SQLiteDB,
        tableName: string,
        primaryKeyColumns?: PrimaryKeyColumn[],
    ) {
        super(database, tableName, primaryKeyColumns);

        this.config = { ...this.getConfigDefaults(), ...config };
    }

    /**
     * @inheritdoc
     */
    async initialize(): Promise<void> {
        const target = this.createTarget();

        await target.initialize();

        this.target.resolve(target);
    }

    /**
     * @inheritdoc
     */
    async all(conditions?: Partial<DBRecord>): Promise<DBRecord[]> {
        const target = await this.target;

        return target.all(conditions);
    }

    /**
     * @inheritdoc
     */
    async find(conditions: Partial<DBRecord>): Promise<DBRecord> {
        const target = await this.target;

        return target.find(conditions);
    }

    /**
     * @inheritdoc
     */
    async findByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        const target = await this.target;

        return target.findByPrimaryKey(primaryKey);
    }

    /**
     * @inheritdoc
     */
    async reduce<T>(reducer: CoreDatabaseReducer<DBRecord, T>, conditions?: CoreDatabaseConditions<DBRecord>): Promise<T> {
        const target = await this.target;

        return target.reduce<T>(reducer, conditions);
    }

    /**
     * @inheritdoc
     */
    async insert(record: DBRecord): Promise<void> {
        const target = await this.target;

        return target.insert(record);
    }

    /**
     * @inheritdoc
     */
    async update(updates: Partial<DBRecord>, conditions?: Partial<DBRecord>): Promise<void> {
        const target = await this.target;

        return target.update(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    async updateWhere(updates: Partial<DBRecord>, conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        const target = await this.target;

        return target.updateWhere(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    async delete(conditions?: Partial<DBRecord>): Promise<void> {
        const target = await this.target;

        return target.delete(conditions);
    }

    /**
     * @inheritdoc
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        const target = await this.target;

        return target.deleteByPrimaryKey(primaryKey);
    }

    /**
     * Get default configuration values.
     *
     * @returns Config defaults.
     */
    protected getConfigDefaults(): CoreDatabaseConfiguration {
        return {
            cachingStrategy: CoreDatabaseCachingStrategy.None,
        };
    }

    /**
     * Create proxy target.
     *
     * @returns Target instance.
     */
    protected createTarget(): CoreDatabaseTable<DBRecord, PrimaryKeyColumn> {
        return this.createTable(this.config.cachingStrategy);
    }

    /**
     * Create a database table using the given caching strategy.
     *
     * @param cachingStrategy Caching strategy.
     * @returns Database table.
     */
    protected createTable(cachingStrategy: CoreDatabaseCachingStrategy): CoreDatabaseTable<DBRecord, PrimaryKeyColumn> {
        switch (cachingStrategy) {
            case CoreDatabaseCachingStrategy.Eager:
                return new CoreEagerDatabaseTable(this.database, this.tableName, this.primaryKeyColumns);
            case CoreDatabaseCachingStrategy.None:
                return new CoreDatabaseTable(this.database, this.tableName, this.primaryKeyColumns);
        }
    }

}

/**
 * Database proxy configuration.
 */
export interface CoreDatabaseConfiguration {
    cachingStrategy: CoreDatabaseCachingStrategy;
}

/**
 * Database caching strategies.
 */
export enum CoreDatabaseCachingStrategy {
    Eager = 'eager',
    None = 'none',
}
