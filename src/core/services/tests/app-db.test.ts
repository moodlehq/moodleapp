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

import { mock, mockSingleton } from '@/testing/utils';
import { CoreAppDB, CoreAppDBService } from '@services/app-db';
import { CoreDB } from '@services/db';
import { SQLiteDB } from '@classes/sqlitedb';
import initializeDatabases from '@/core/initializers/initialize-databases';
import { CoreConfig } from '@services/config';
import { CoreCronDelegate } from '@services/cron';
import { CoreFilepool } from '@services/filepool';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreSites } from '@services/sites';
import { CoreStorage } from '@services/storage';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreLogger } from '@static/logger';

class TestAppDBService extends CoreAppDBService {

    /**
     * Exercise schema installation without bootstrapping the schema-version cache.
     *
     * @returns Uninstalled schema version.
     */
    protected async getInstalledSchemaVersion(): Promise<number> {
        return 0;
    }

}

describe('App database schema failure handling', () => {
    it('logs schema failures', async () => {
        const logger = CoreLogger.getInstance('CoreAppDB');
        jest.spyOn(logger, 'error');
        jest.spyOn(CoreLogger, 'getInstance').mockReturnValue(logger);
        const service = new TestAppDBService();
        const error = new Error('Cannot create required schema');
        const connection = mock<SQLiteDB>({ createTablesFromSchema: jest.fn(async () => { throw error; }) });
        jest.spyOn(service, 'getDB').mockReturnValue(connection);

        await expect(service.createTablesFromSchema({ name: 'test', version: 1, tables: [] })).resolves.toBe(undefined);
        expect(logger.error).toHaveBeenCalledWith('Error applying schema to app DB: test', error);
    });
});

describe('Global database initialization order', () => {
    beforeEach(() => {
        mockSingleton(CoreDB, { ready: jest.fn(async () => undefined) });
        mockSingleton(CoreAppDB, { initializeDatabase: jest.fn(async () => undefined) });
        mockSingleton(CoreConfig, { initializeDatabase: jest.fn(async () => undefined) });
        mockSingleton(CoreCronDelegate, { initializeDatabase: jest.fn(async () => undefined) });
        mockSingleton(CoreFilepool, { initializeDatabase: jest.fn(async () => undefined) });
        mockSingleton(CoreLocalNotifications, { initializeDatabase: jest.fn(async () => undefined) });
        mockSingleton(CoreSites, { initializeDatabase: jest.fn(async () => undefined) });
        mockSingleton(CoreStorage, { initializeDatabase: jest.fn(async () => undefined) });
    });

    it('initializes the application database before feature schemas', async () => {
        const pending = new CorePromisedValue<void>();
        const entered = new CorePromisedValue<void>();
        jest.mocked(CoreAppDB.initializeDatabase).mockImplementation(async () => {
            entered.resolve();
            await pending;
        });
        const initializing = initializeDatabases();
        await entered;
        expect(CoreSites.initializeDatabase).not.toHaveBeenCalled();
        pending.resolve();
        await initializing;
        expect(CoreSites.initializeDatabase).toHaveBeenCalledTimes(1);
    });

    it('does not initialize feature schemas when the application database fails', async () => {
        const error = new Error('Application database initialization failed');
        jest.mocked(CoreAppDB.initializeDatabase).mockRejectedValue(error);

        await expect(initializeDatabases()).rejects.toBe(error);
        expect(CoreConfig.initializeDatabase).not.toHaveBeenCalled();
        expect(CoreSites.initializeDatabase).not.toHaveBeenCalled();
    });

    it('propagates a feature database initialization failure', async () => {
        const error = new Error('Feature schema installation failed');
        jest.mocked(CoreSites.initializeDatabase).mockRejectedValue(error);

        await expect(initializeDatabases()).rejects.toBe(error);
    });
});
