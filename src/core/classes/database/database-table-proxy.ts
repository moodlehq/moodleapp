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

import { CoreConstants } from '@/core/constants';
import { asyncInstance } from '@/core/utils/async-instance';
import { SQLiteDB, SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreConfigProvider } from '@services/config';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreDatabaseReducer, CoreDatabaseTable, CoreDatabaseConditions, GetDBRecordPrimaryKey } from './database-table';
import { CoreDebugDatabaseTable } from './debug-database-table';
import { CoreEagerDatabaseTable } from './eager-database-table';
import { CoreLazyDatabaseTable } from './lazy-database-table';

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
    protected target = asyncInstance<CoreDatabaseTable<DBRecord, PrimaryKeyColumn>>();
    protected environmentObserver?: CoreEventObserver;

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
        this.environmentObserver = CoreEvents.on(CoreConfigProvider.ENVIRONMENT_UPDATED, () => this.updateTarget());

        await this.updateTarget();
    }

    /**
     * @inheritdoc
     */
    async destroy(): Promise<void> {
        this.environmentObserver?.off();
    }

    /**
     * @inheritdoc
     */
    async getMany(conditions?: Partial<DBRecord>): Promise<DBRecord[]> {
        return this.target.getMany(conditions);
    }

    /**
     * @inheritdoc
     */
    async getOne(conditions: Partial<DBRecord>): Promise<DBRecord> {
        return this.target.getOne(conditions);
    }

    /**
     * @inheritdoc
     */
    async getOneByPrimaryKey(primaryKey: PrimaryKey): Promise<DBRecord> {
        return this.target.getOneByPrimaryKey(primaryKey);
    }

    /**
     * @inheritdoc
     */
    async reduce<T>(reducer: CoreDatabaseReducer<DBRecord, T>, conditions?: CoreDatabaseConditions<DBRecord>): Promise<T> {
        return this.target.reduce<T>(reducer, conditions);
    }

    /**
     * @inheritdoc
     */
    async insert(record: DBRecord): Promise<void> {
        return this.target.insert(record);
    }

    /**
     * @inheritdoc
     */
    async update(updates: Partial<DBRecord>, conditions?: Partial<DBRecord>): Promise<void> {
        return this.target.update(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    async updateWhere(updates: Partial<DBRecord>, conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        return this.target.updateWhere(updates, conditions);
    }

    /**
     * @inheritdoc
     */
    async delete(conditions?: Partial<DBRecord>): Promise<void> {
        return this.target.delete(conditions);
    }

    /**
     * @inheritdoc
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        return this.target.deleteByPrimaryKey(primaryKey);
    }

    /**
     * Get default configuration values.
     *
     * @returns Config defaults.
     */
    protected getConfigDefaults(): CoreDatabaseConfiguration {
        return {
            cachingStrategy: CoreDatabaseCachingStrategy.None,
            debug: false,
        };
    }

    /**
     * Get database configuration to use at runtime.
     *
     * @returns Database configuration.
     */
    protected getRuntimeConfig(): CoreDatabaseConfiguration {
        return {
            ...this.config,
            ...CoreConstants.CONFIG.databaseOptimizations,
            ...CoreConstants.CONFIG.databaseTableOptimizations?.[this.tableName],
        };
    }

    /**
     * Update underlying target instance.
     */
    protected async updateTarget(): Promise<void> {
        const oldTarget = this.target.instance;
        const newTarget = this.createTarget();

        if (oldTarget) {
            await oldTarget.destroy();

            this.target.resetInstance();
        }

        await newTarget.initialize();

        this.target.setInstance(newTarget);
    }

    /**
     * Create proxy target.
     *
     * @returns Target instance.
     */
    protected createTarget(): CoreDatabaseTable<DBRecord, PrimaryKeyColumn> {
        const config = this.getRuntimeConfig();
        const table = this.createTable(config.cachingStrategy);

        return config.debug ? new CoreDebugDatabaseTable(table) : table;
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
            case CoreDatabaseCachingStrategy.Lazy:
                return new CoreLazyDatabaseTable(this.database, this.tableName, this.primaryKeyColumns);
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
    debug: boolean;
}

/**
 * Database caching strategies.
 */
export enum CoreDatabaseCachingStrategy {
    Eager = 'eager',
    Lazy = 'lazy',
    None = 'none',
}
