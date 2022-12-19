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
import { SQLiteDB, SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreLogger } from '@singletons/logger';
import { CoreDatabaseTable, GetDBRecordPrimaryKey } from './database-table';

/**
 * Database wrapper that caches database records in memory to speed up read operations.
 *
 * Extensions of this class should only be used as singletons, or the data integrity of the inmemory cache
 * could be compromised.
 */
export abstract class CoreInMemoryDatabaseTable<
    DBRecord extends SQLiteDBRecordValues = SQLiteDBRecordValues,
    PrimaryKeyColumn extends keyof DBRecord = 'id',
    PrimaryKey extends GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn> = GetDBRecordPrimaryKey<DBRecord, PrimaryKeyColumn>
> extends CoreDatabaseTable<DBRecord, PrimaryKeyColumn, PrimaryKey> {

    private static readonly ACTIVE_TABLES: WeakMap<SQLiteDB, Set<string>> = new WeakMap();
    private static readonly LOGGER: CoreLogger = CoreLogger.getInstance('CoreInMemoryDatabaseTable');

    /**
     * @inheritdoc
     */
    async initialize(): Promise<void> {
        await super.initialize();

        const activeTables = CoreInMemoryDatabaseTable.ACTIVE_TABLES.get(this.database) ?? new Set();

        if (activeTables.has(this.tableName)) {
            const message = `Trying to create multiple instances of an in-memory table for '${this.tableName}', ` +
                'use singletons instead.';

            if (!CoreConstants.BUILD.isProduction) {
                throw new Error(message);
            }

            CoreInMemoryDatabaseTable.LOGGER.warn(message);
        }

        activeTables.add(this.tableName);
        CoreInMemoryDatabaseTable.ACTIVE_TABLES.set(this.database, activeTables);
    }

    /**
     * @inheritdoc
     */
    async destroy(): Promise<void> {
        await super.destroy();

        const activeTables = CoreInMemoryDatabaseTable.ACTIVE_TABLES.get(this.database);

        activeTables?.delete(this.tableName);

        if (activeTables?.size === 0) {
            CoreInMemoryDatabaseTable.ACTIVE_TABLES.delete(this.database);
        }
    }

}
