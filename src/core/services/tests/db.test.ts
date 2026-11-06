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
import { CoreDbProvider } from '@services/db';
import { SQLite } from '@singletons';
import { SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { CorePromisedValue } from '@classes/promised-value';

class PendingDbProvider extends CoreDbProvider {

    initialize = jest.fn(async () => this.pending);
    pending = new CorePromisedValue<void>();

}

describe('CoreDB readiness', () => {
    let provider: PendingDbProvider;
    let create: jest.Mock;
    let remove: jest.Mock;
    let connection: SQLiteObject;

    beforeEach(() => {
        provider = new PendingDbProvider();
        jest.spyOn(provider, 'loggingEnabled').mockReturnValue(false);
        connection = mock<SQLiteObject>({
            executeSql: jest.fn(async () => ({ rows: { length: 0 } })),
            close: jest.fn(async () => undefined),
        });
        create = jest.fn(async () => connection);
        remove = jest.fn(async () => undefined);
        mockSingleton(SQLite, { create, deleteDatabase: remove });
    });

    it('keeps getDB synchronous and blocks early queries and deletion behind one shared barrier', async () => {
        const database = provider.getDB('MoodleMobile');
        expect(provider.getDB('MoodleMobile')).toBe(database);
        const query = database.execute('SELECT 1');
        const deletion = provider.deleteDB('Site-inactive');
        const readiness = provider.ready();

        expect(provider.ready()).toBe(readiness);
        expect(create).not.toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
        provider.pending.resolve();
        await Promise.all([query, deletion, readiness]);

        expect(provider.initialize).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledWith({ name: 'MoodleMobile', location: 'default' });
        expect(remove).toHaveBeenCalledWith({ name: 'Site-inactive', location: 'default' });
    });

    it('rejects concurrent and later queries and deletions after readiness fails', async () => {
        const error = new Error('Native database adoption failed');
        const database = provider.getDB('MoodleMobile');
        const queries = [database.execute('SELECT 1'), database.execute('SELECT 2')];
        const deletion = provider.deleteDB('Site-inactive');
        provider.pending.reject(error);

        await expect(queries[0]).rejects.toBe(error);
        await expect(queries[1]).rejects.toBe(error);
        await expect(deletion).rejects.toBe(error);
        await expect(database.execute('SELECT 3')).rejects.toBe(error);
        await expect(provider.getDB('Site-another').execute('SELECT 1')).rejects.toBe(error);
        await expect(provider.deleteDB('MoodleMobile')).rejects.toBe(error);
        expect(create).not.toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
    });

    it('preserves forceNew and close-before-deletion once ready', async () => {
        provider.pending.resolve();
        const original = provider.getDB('MoodleMobile');
        await original.execute('SELECT 1');
        const replacement = provider.getDB('MoodleMobile', true);
        expect(replacement).not.toBe(original);
        await replacement.execute('SELECT 1');
        await provider.deleteDB('MoodleMobile');

        expect(create).toHaveBeenCalledTimes(2);
        expect(connection.close).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
        expect(jest.mocked(connection.close).mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
        expect(provider.getDB('MoodleMobile')).not.toBe(replacement);
    });
});
