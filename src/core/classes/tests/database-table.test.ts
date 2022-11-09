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
import { CoreDatabaseConfiguration, CoreDatabaseSorting, CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { SQLiteDB } from '@classes/sqlitedb';
import { CoreConfig } from '@services/config';

type User = {
    id: number;
    name: string;
    surname: string;
};

function userMatches(user: User, conditions: Partial<User>) {
    return !Object.entries(conditions).some(([column, value]) => user[column] !== value);
}

function prepareStubs(config: Partial<CoreDatabaseConfiguration> = {}): [User[], SQLiteDB, CoreDatabaseTable<User>] {
    const records: User[] = [];
    const database = mock<SQLiteDB>({
        getRecord: async <T>(_, conditions) => {
            const record = records.find(record => userMatches(record, conditions));

            if (!record) {
                throw new Error();
            }

            return record as unknown as T;
        },
        getRecords: async <T>(_, conditions) => records.filter(record => userMatches(record, conditions)) as unknown as T[],
        getAllRecords: async <T>() => records.slice(0) as unknown as T[],
        deleteRecords: async (_, conditions) => {
            const usersToDelete: User[] = [];

            for (const user of records) {
                if (conditions && !userMatches(user, conditions)) {
                    continue;
                }

                usersToDelete.push(user);
            }

            for (const user of usersToDelete) {
                records.splice(records.indexOf(user), 1);
            }

            return usersToDelete.length;
        },
        insertRecord: async (_, user: User) => records.push(user) && 1,
    });
    const table = new CoreDatabaseTableProxy<User>(config, database, 'users');

    mockSingleton(CoreConfig, { ready: () => Promise.resolve() });

    return [records, database, table];
}

async function testFindItems(records: User[], table: CoreDatabaseTable<User>) {
    const john = { id: 1, name: 'John', surname: 'Doe' };
    const amy = { id: 2, name: 'Amy', surname: 'Doe' };

    records.push(john);
    records.push(amy);

    await table.initialize();

    await expect(table.getOne({ surname: 'Doe', name: 'John' })).resolves.toEqual(john);
    await expect(table.getOne({ surname: 'Doe', name: 'Amy' })).resolves.toEqual(amy);
    await expect(table.getOneByPrimaryKey({ id: 1 })).resolves.toEqual(john);
    await expect(table.getOneByPrimaryKey({ id: 2 })).resolves.toEqual(amy);
}

async function testInsertItems(records: User[], database: SQLiteDB, table: CoreDatabaseTable<User>) {
    // Arrange.
    const john = { id: 1, name: 'John', surname: 'Doe' };

    await table.initialize();

    // Act.
    await table.insert(john);

    // Assert.
    expect(database.insertRecord).toHaveBeenCalledWith('users', john);

    await expect(table.getOneByPrimaryKey({ id: 1 })).resolves.toEqual(john);
}

async function testDeleteItems(records: User[], database: SQLiteDB, table: CoreDatabaseTable<User>) {
    // Arrange.
    const john = { id: 1, name: 'John', surname: 'Doe' };
    const amy = { id: 2, name: 'Amy', surname: 'Doe' };
    const jane = { id: 3, name: 'Jane', surname: 'Smith' };

    records.push(john);
    records.push(amy);
    records.push(jane);

    await table.initialize();

    // Act.
    await table.delete({ surname: 'Doe' });

    // Assert.
    expect(database.deleteRecords).toHaveBeenCalledWith('users', { surname: 'Doe' });

    await expect(table.getOneByPrimaryKey({ id: 1 })).rejects.toThrow();
    await expect(table.getOneByPrimaryKey({ id: 2 })).rejects.toThrow();
    await expect(table.getOneByPrimaryKey({ id: 3 })).resolves.toEqual(jane);
}

async function testDeleteItemsByPrimaryKey(records: User[], database: SQLiteDB, table: CoreDatabaseTable<User>) {
    // Arrange.
    const john = { id: 1, name: 'John', surname: 'Doe' };
    const amy = { id: 2, name: 'Amy', surname: 'Doe' };

    records.push(john);
    records.push(amy);

    await table.initialize();

    // Act.
    await table.deleteByPrimaryKey({ id: 1 });

    // Assert.
    expect(database.deleteRecords).toHaveBeenCalledWith('users', { id: 1 });

    await expect(table.getOneByPrimaryKey({ id: 1 })).rejects.toThrow();
    await expect(table.getOneByPrimaryKey({ id: 2 })).resolves.toEqual(amy);
}

describe('CoreDatabaseTable with eager caching', () => {

    let records: User[];
    let database: SQLiteDB;
    let table: CoreDatabaseTable<User>;

    beforeEach(() => [records, database, table] = prepareStubs({ cachingStrategy: CoreDatabaseCachingStrategy.Eager }));

    it('reads all records on initialization', async () => {
        await table.initialize();

        expect(database.getAllRecords).toHaveBeenCalledWith('users');
    });

    it('finds items', async () => {
        await testFindItems(records, table);

        expect(database.getRecord).not.toHaveBeenCalled();
    });

    it('sorts items', async () => {
        // Arrange.
        const john = { id: 1, name: 'John', surname: 'Doe' };
        const amy = { id: 2, name: 'Amy', surname: 'Doe' };
        const jane = { id: 3, name: 'Jane', surname: 'Smith' };
        const expectSorting = async (sorting: CoreDatabaseSorting<User>, expectedResults: User[]) => {
            const results = await table.getMany({}, { sorting });

            expect(results).toEqual(expectedResults);
        };

        records.push(john);
        records.push(amy);
        records.push(jane);

        await table.initialize();

        // Act & Assert.
        await expectSorting('name', [amy, jane, john]);
        await expectSorting('surname', [john, amy, jane]);
        await expectSorting({ name: 'desc' }, [john, jane, amy]);
        await expectSorting({ surname: 'desc' }, [jane, john, amy]);
        await expectSorting(['name', { surname: 'desc' }], [amy, jane, john]);
        await expectSorting([{ surname: 'desc' }, 'name'], [jane, amy, john]);
    });

    it('inserts items', () => testInsertItems(records, database, table));
    it('deletes items', () => testDeleteItems(records, database, table));
    it('deletes items by primary key', () => testDeleteItemsByPrimaryKey(records, database, table));

});

describe('CoreDatabaseTable with lazy caching', () => {

    let records: User[];
    let database: SQLiteDB;
    let table: CoreDatabaseTable<User>;

    beforeEach(() => [records, database, table] = prepareStubs({ cachingStrategy: CoreDatabaseCachingStrategy.Lazy }));

    it('reads no records on initialization', async () => {
        await table.initialize();

        expect(database.getRecords).not.toHaveBeenCalled();
        expect(database.getAllRecords).not.toHaveBeenCalled();
    });

    it('finds items', async () => {
        await testFindItems(records, table);

        expect(database.getRecord).toHaveBeenCalledTimes(2);
    });

    it('inserts items', () => testInsertItems(records, database, table));
    it('deletes items', () => testDeleteItems(records, database, table));
    it('deletes items by primary key', () => testDeleteItemsByPrimaryKey(records, database, table));

});

describe('CoreDatabaseTable with no caching', () => {

    let records: User[];
    let database: SQLiteDB;
    let table: CoreDatabaseTable<User>;

    beforeEach(() => [records, database, table] = prepareStubs({ cachingStrategy: CoreDatabaseCachingStrategy.None }));

    it('reads no records on initialization', async () => {
        await table.initialize();

        expect(database.getRecords).not.toHaveBeenCalled();
        expect(database.getAllRecords).not.toHaveBeenCalled();
    });

    it('finds items', async () => {
        await testFindItems(records, table);

        expect(database.getRecord).toHaveBeenCalledTimes(4);
    });

    it('inserts items', () => testInsertItems(records, database, table));
    it('deletes items', () => testDeleteItems(records, database, table));
    it('deletes items by primary key', () => testDeleteItemsByPrimaryKey(records, database, table));

});
