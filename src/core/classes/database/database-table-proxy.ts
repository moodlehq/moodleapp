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
import { SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreConfig, CoreConfigProvider } from '@services/config';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    CoreDatabaseConfiguration,
    CoreDatabaseReducer,
    CoreDatabaseTable,
    CoreDatabaseConditions,
    GetDBRecordPrimaryKey,
    CoreDatabaseQueryOptions,
    CoreDatabaseTableConstructor,
} from './database-table';
import { CoreDebugDatabaseTable } from './debug-database-table';
import { CoreEagerDatabaseTable } from './eager-database-table';
import { CoreLazyDatabaseTable } from './lazy-database-table';
import { SubPartial } from '@/core/utils/types';

/**
 * Database caching strategies.
 */
export enum CoreDatabaseCachingStrategy {
    Eager = 'eager',
    Lazy = 'lazy',
    None = 'none',
}

/**
 * Database table proxy used to route database interactions through different implementations.
 *
 * This class allows using a database wrapper with different optimization strategies that can be changed at runtime.
 */
export class CoreDatabaseTableProxy<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    RowIdColumn extends PrimaryKeyColumn = PrimaryKeyColumn,
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>,
> extends CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn, PrimaryKey> {

    protected static readonly DEFAULT_CACHING_STRATEGY = CoreDatabaseCachingStrategy.None;

    protected target = asyncInstance<CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn>>();
    protected environmentObserver?: CoreEventObserver;
    protected targetConstructors: Record<
        CoreDatabaseCachingStrategy,
        CoreDatabaseTableConstructor<DBRecord, PrimaryKeyColumn, RowIdColumn>
    > = {
        [CoreDatabaseCachingStrategy.Eager]: CoreEagerDatabaseTable,
        [CoreDatabaseCachingStrategy.Lazy]: CoreLazyDatabaseTable,
        [CoreDatabaseCachingStrategy.None]: CoreDatabaseTable,
    };

    /**
     * @inheritdoc
     */
    async initialize(): Promise<void> {
        await super.initialize();

        this.environmentObserver = CoreEvents.on(CoreConfigProvider.ENVIRONMENT_UPDATED, async () => {
            if (!(await this.shouldUpdateTarget())) {
                return;
            }

            this.updateTarget();
        });

        await this.updateTarget();
    }

    /**
     * @inheritdoc
     */
    async destroy(): Promise<void> {
        await super.destroy();

        this.environmentObserver?.off();
    }

    /**
     * @inheritdoc
     */
    matchesConfig(config: Partial<CoreDatabaseConfiguration>): boolean {
        const thisDebug = this.config.debug ?? false;
        const thisCachingStrategy = this.config.cachingStrategy ?? CoreDatabaseTableProxy.DEFAULT_CACHING_STRATEGY;
        const otherDebug = config.debug ?? false;
        const otherCachingStrategy = config.cachingStrategy ?? CoreDatabaseTableProxy.DEFAULT_CACHING_STRATEGY;

        return super.matchesConfig(config) && thisDebug === otherDebug && thisCachingStrategy === otherCachingStrategy;
    }

    /**
     * @inheritdoc
     */
    async getMany(conditions?: Partial<DBRecord>, options?: Partial<CoreDatabaseQueryOptions<DBRecord>>): Promise<DBRecord[]> {
        return this.target.getMany(conditions, options);
    }

    /**
     * @inheritdoc
     */
    getManyWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<DBRecord[]>  {
        return this.target.getManyWhere(conditions);
    }

    /**
     * @inheritdoc
     */
    async getOne(
        conditions?: Partial<DBRecord>,
        options?: Partial<Omit<CoreDatabaseQueryOptions<DBRecord>, 'offset' | 'limit'>>,
    ): Promise<DBRecord> {
        return this.target.getOne(conditions, options);
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
    hasAny(conditions?: Partial<DBRecord>): Promise<boolean> {
        return this.target.hasAny(conditions);
    }

    /**
     * @inheritdoc
     */
    hasAnyByPrimaryKey(primaryKey: PrimaryKey): Promise<boolean> {
        return this.target.hasAnyByPrimaryKey(primaryKey);
    }

    /**
     * @inheritdoc
     */
    count(conditions?: Partial<DBRecord>): Promise<number> {
        return this.target.count(conditions);
    }

    /**
     * @inheritdoc
     */
    async insert(record: SubPartial<DBRecord, RowIdColumn>): Promise<number> {
        return this.target.insert(record);
    }

    /**
     * @inheritdoc
     */
    syncInsert(record: SubPartial<DBRecord, RowIdColumn>): void {
        this.target.syncInsert(record);
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
    async deleteWhere(conditions: CoreDatabaseConditions<DBRecord>): Promise<void> {
        return this.target.deleteWhere(conditions);
    }

    /**
     * @inheritdoc
     */
    async deleteByPrimaryKey(primaryKey: PrimaryKey): Promise<void> {
        return this.target.deleteByPrimaryKey(primaryKey);
    }

    /**
     * Get database configuration to use at runtime.
     *
     * @returns Database configuration.
     */
    protected async getRuntimeConfig(): Promise<Partial<CoreDatabaseConfiguration>> {
        await CoreConfig.ready();

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
        const newTarget = await this.createTarget();

        if (oldTarget) {
            await oldTarget.destroy();

            this.target.resetInstance();
        }

        await newTarget.initialize();

        this.target.setInstance(newTarget);
    }

    /**
     * Check whether the underlying target should be updated.
     *
     * @returns Whether target should be updated.
     */
    protected async shouldUpdateTarget(): Promise<boolean> {
        const config = await this.getRuntimeConfig();
        const target = await this.target.getInstance();
        const originalTarget = target instanceof CoreDebugDatabaseTable ? target.getTarget() : target;
        const cachingStrategy = config.cachingStrategy ?? CoreDatabaseTableProxy.DEFAULT_CACHING_STRATEGY;

        return (config.debug && target === originalTarget)
            || originalTarget?.constructor !== this.targetConstructors[cachingStrategy]
            || !originalTarget.matchesConfig(config);
    }

    /**
     * Create proxy target.
     *
     * @returns Target instance.
     */
    protected async createTarget(): Promise<CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn>> {
        const config = await this.getRuntimeConfig();
        const table = this.createTable(config);

        return config.debug ? new CoreDebugDatabaseTable(table) : table;
    }

    /**
     * Create a database table using the given caching strategy.
     *
     * @param config Database configuration.
     * @returns Database table.
     */
    protected createTable(config: Partial<CoreDatabaseConfiguration>): CoreDatabaseTable<DBRecord, PrimaryKeyColumn, RowIdColumn> {
        const DatabaseTable = this.targetConstructors[config.cachingStrategy ?? CoreDatabaseTableProxy.DEFAULT_CACHING_STRATEGY];

        return new DatabaseTable(config, this.database, this.tableName, this.primaryKeyColumns);
    }

}

declare module '@classes/database/database-table' {

    /**
     * Augment CoreDatabaseConfiguration interface with data specific to this class.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreDatabaseConfiguration {
        cachingStrategy: CoreDatabaseCachingStrategy;
        debug: boolean;
    }

}
