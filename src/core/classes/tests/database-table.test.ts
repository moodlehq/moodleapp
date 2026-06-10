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
import {
    CoreDatabaseConfiguration,
    CoreDatabaseSorting,
    CoreDatabaseTable,
} from '@classes/database/database-table';
import { CoreInMemoryDatabaseConditions, CoreInMemoryDatabaseReducer } from '@classes/database/inmemory-database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { SQLiteDB } from '@classes/sqlitedb';
import { CoreConfig } from '@services/config';

type User = {
    id: number;
    name: string;
    surname: string;
};

/**
 * Checks if a user object matches specified conditions.
 *
 * @param user The user object to be checked.
 * @param conditions The conditions to match against the user object.
 * @returns Returns true if the user matches the conditions, false otherwise.
 */
function userMatches(user: User, conditions: Partial<User>) {
    return !Object.entries(conditions).some(([column, value]) => user[column as keyof User] !== value);
}

/**
 * Sort users according to database sorting string format.
 *
 * @param users Users to sort.
 * @param sorting SQL-like sorting string. E.g. 'name asc, surname desc'.
 * @returns Sorted users.
 */
function sortUsers(users: User[], sorting?: string): User[] {
    if (!sorting) {
        return users;
    }

    const sortingConditions = sorting
        .split(',')
        .map(condition => condition.trim())
        .filter(Boolean)
        .map(condition => {
            const [column, direction = 'asc'] = condition.split(/\s+/);

            return {
                column: column as keyof User,
                direction: direction.toLowerCase() === 'desc' ? 'desc' : 'asc',
            };
        });

    return users.sort((a, b) => {
        for (const { column, direction } of sortingConditions) {
            if (a[column] > b[column]) {
                return direction === 'desc' ? -1 : 1;
            }

            if (a[column] < b[column]) {
                return direction === 'desc' ? 1 : -1;
            }
        }

        return 0;
    });
}

/**
 * Checks if a user object matches SQL conditions used in tests.
 *
 * @param user The user object to be checked.
 * @param sql SQL where clause.
 * @param sqlParams SQL params.
 * @returns Whether the user matches.
 */
function userMatchesSql(user: User, sql?: string, sqlParams?: unknown[]): boolean {
    if (!sql) {
        return true;
    }

    const simpleEqualityCondition = /^WHERE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\?$/i.exec(sql.trim());

    if (!simpleEqualityCondition) {
        throw new Error(`Unsupported SQL condition in test: ${sql}`);
    }

    const column = simpleEqualityCondition[1] as keyof User;

    return user[column] === sqlParams?.[0];
}

/**
 * Prepares stubs for testing with a mock database configuration.
 *
 * @param config The partial CoreDatabaseConfiguration to use for the mock database.
 * @returns An array containing a mock user records array, a mock SQLite database,
 * and a CoreDatabaseTable instance for the 'users' table.
 */
function prepareStubs(config: Partial<CoreDatabaseConfiguration> = {}): [User[], SQLiteDB, CoreDatabaseTable<User>] {
    const records: User[] = [];
    const database = mock<SQLiteDB>({
        getRecord: async <T>(_table: string, conditions: Partial<User>) => {
            const record = records.find(record => userMatches(record, conditions));

            if (!record) {
                throw new Error();
            }

            return record as unknown as T;
        },
        getRecords: async <T>(_table: string, conditions: Partial<User>, sorting?: string) => {
            const filteredRecords = records.filter(record => userMatches(record, conditions));
            const sortedRecords = sortUsers(filteredRecords, sorting);

            return sortedRecords as unknown as T[];
        },
        getAllRecords: async <T>() => records.slice(0) as unknown as T[],
        getRecordsSelect: async <T>(_table: string, sql: string, sqlParams?: unknown[]) => {
            const matchingUsers = records.filter(record => userMatchesSql(record, sql, sqlParams));

            return matchingUsers as unknown as T[];
        },
        countRecords: async (_table: string, conditions?: Partial<User>) =>
            conditions
                ? records.filter(record => userMatches(record, conditions)).length
                : records.length,
        getFieldSql: async (_table: string, params?: unknown[]) =>
            records.filter(record => userMatchesSql(record, 'WHERE surname = ?', params)).length,
        deleteRecords: async (_table: string, conditions?: Partial<User>) => {
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
        updateRecords: async (_table: string, updates: Partial<User>, conditions?: Partial<User>) => {
            let updatedRecords = 0;

            for (const record of records) {
                if (conditions && !userMatches(record, conditions)) {
                    continue;
                }

                Object.assign(record, updates);
                updatedRecords++;
            }

            return updatedRecords;
        },
        updateRecordsWhere: async (_table: string, updates: Partial<User>, sql: string, sqlParams?: unknown[]) => {
            let updatedRecords = 0;

            for (const record of records) {
                if (!userMatchesSql(record, sql, sqlParams)) {
                    continue;
                }

                Object.assign(record, updates);
                updatedRecords++;
            }

            return updatedRecords;
        },
        deleteRecordsSelect: async (_table: string, sql: string, sqlParams?: unknown[]) => {
            const usersToDelete = records.filter(record => userMatchesSql(record, sql, sqlParams));

            for (const user of usersToDelete) {
                records.splice(records.indexOf(user), 1);
            }

            return usersToDelete.length;
        },
        insertRecord: async (_table: string, user: User) => records.push(user) && 1,
    });
    const table = CoreDatabaseTableProxy.createInstance<User>(config, database, 'users');

    mockSingleton(CoreConfig, { ready: () => Promise.resolve() });

    return [records, database, table];
}

/**
 * Test function for finding items in the database.
 *
 * @param records An array of user records to use for testing.
 * @param table The CoreDatabaseTable instance to test.
 */
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

/**
 * Tests the insertion of items into a database table.
 *
 * @param records An array of User records.
 * @param database The SQLite database instance.
 * @param table The database table instance.
 */
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

/**
 * Tests the deletion of items from a database table based on a condition.
 *
 * @param records An array of User records.
 * @param database The SQLite database instance.
 * @param table The database table instance.
 */
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

/**
 * Tests the deletion of items from a database table based on primary key values.
 *
 * @param records An array of User records.
 * @param database The SQLite database instance.
 * @param table The database table instance.
 */
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

/**
 * Tests updateWhere with custom conditions.
 *
 * @param records An array of User records.
 * @param database The SQLite database instance.
 * @param table The database table instance.
 * @param extraConditions Additional update conditions.
 */
async function testUpdateWhereItems(
    records: User[],
    database: SQLiteDB,
    table: CoreDatabaseTable<User>,
    extraConditions: Partial<Pick<CoreInMemoryDatabaseConditions<User>, 'js'>> = {},
) {
    const john = { id: 1, name: 'John', surname: 'Doe' };
    const amy = { id: 2, name: 'Amy', surname: 'Doe' };
    const jane = { id: 3, name: 'Jane', surname: 'Smith' };

    const conditions = {
        sql: 'WHERE surname = ?',
        sqlParams: ['Doe'],
        ...extraConditions,
    };

    records.push(john, amy, jane);

    await table.initialize();
    await table.updateWhere({ surname: 'Wong' }, conditions);

    expect(database.updateRecordsWhere).toHaveBeenCalledWith('users', { surname: 'Wong' }, conditions.sql, conditions.sqlParams);

    await expect(table.getOneByPrimaryKey({ id: 1 })).resolves.toEqual({ ...john, surname: 'Wong' });
    await expect(table.getOneByPrimaryKey({ id: 2 })).resolves.toEqual({ ...amy, surname: 'Wong' });
    await expect(table.getOneByPrimaryKey({ id: 3 })).resolves.toEqual(jane);
}

/**
 * Tests deleteWhere with custom conditions.
 *
 * @param records An array of User records.
 * @param database The SQLite database instance.
 * @param table The database table instance.
 * @param extraConditions Delete conditions.
 */
async function testDeleteWhereItems(
    records: User[],
    database: SQLiteDB,
    table: CoreDatabaseTable<User>,
    extraConditions: Partial<Pick<CoreInMemoryDatabaseConditions<User>, 'js'>> = {},
) {
    const john = { id: 1, name: 'John', surname: 'Doe' };
    const amy = { id: 2, name: 'Amy', surname: 'Doe' };
    const jane = { id: 3, name: 'Jane', surname: 'Smith' };

    const conditions = {
        sql: 'WHERE surname = ?',
        sqlParams: ['Doe'],
        ...extraConditions,
    };

    records.push(john, amy, jane);

    await table.initialize();
    await table.deleteWhere(conditions);

    expect(database.deleteRecordsSelect).toHaveBeenCalledWith('users', conditions.sql, conditions.sqlParams);

    await expect(table.getOneByPrimaryKey({ id: 1 })).rejects.toThrow();
    await expect(table.getOneByPrimaryKey({ id: 2 })).rejects.toThrow();
    await expect(table.getOneByPrimaryKey({ id: 3 })).resolves.toEqual(jane);
}

/**
 * Tests listeners being called on destroy.
 *
 * @param table The database table instance.
 */
async function testListeners(table: CoreDatabaseTable<User>) {
    const onDestroy = jest.fn();

    await table.initialize();
    table.addListener({ onDestroy });
    await table.destroy();

    expect(onDestroy).toHaveBeenCalledTimes(1);
}

/**
 * Tests proxy-specific configuration matching.
 *
 * @param table The database table instance.
 * @param cachingStrategy Table caching strategy.
 */
function testMatchesConfig(table: CoreDatabaseTable<User>, cachingStrategy: CoreDatabaseCachingStrategy) {
    expect(table.matchesConfig({ cachingStrategy })).toBe(true);
    expect(table.matchesConfig({ cachingStrategy, debug: false })).toBe(true);
    expect(table.matchesConfig({ cachingStrategy: CoreDatabaseCachingStrategy.None, debug: false }))
        .toBe(cachingStrategy === CoreDatabaseCachingStrategy.None);
    expect(table.matchesConfig({ cachingStrategy, debug: true })).toBe(false);
}

/**
 * Tests getMany filtering by plain conditions.
 *
 * @param records An array of User records.
 * @param table The database table instance.
 */
async function testGetManyWithConditions(records: User[], table: CoreDatabaseTable<User>) {
    records.push(
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Amy', surname: 'Doe' },
        { id: 3, name: 'Jane', surname: 'Smith' },
    );

    await table.initialize();

    await expect(table.getMany({ surname: 'Doe' })).resolves.toEqual([
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Amy', surname: 'Doe' },
    ]);
}

/**
 * Tests sorting items with getMany.
 *
 * @param records An array of User records.
 * @param table The database table instance.
 */
async function testSortItems(records: User[], table: CoreDatabaseTable<User>) {
    const john = { id: 1, name: 'John', surname: 'Doe' };
    const amy = { id: 2, name: 'Amy', surname: 'Doe' };
    const jane = { id: 3, name: 'Jane', surname: 'Smith' };
    const expectSorting = async (sorting: CoreDatabaseSorting<User>, expectedResults: User[]) => {
        const results = await table.getMany({}, { sorting });

        expect(results).toEqual(expectedResults);
    };

    records.push(john, amy, jane);

    await table.initialize();

    await expectSorting('name', [amy, jane, john]);
    await expectSorting('surname', [john, amy, jane]);
    await expectSorting({ name: 'desc' }, [john, jane, amy]);
    await expectSorting({ surname: 'desc' }, [jane, john, amy]);
    await expectSorting(['name', { surname: 'desc' }], [amy, jane, john]);
    await expectSorting([{ surname: 'desc' }, 'name'], [jane, amy, john]);
}

/**
 * Tests getManyWhere filtering.
 *
 * @param records An array of User records.
 * @param table The database table instance.
 * @param extraConditions Additional conditions for in-memory implementations.
 */
async function testGetManyWhere(
    records: User[],
    table: CoreDatabaseTable<User>,
    extraConditions: Partial<Pick<CoreInMemoryDatabaseConditions<User>, 'js'>> = {},
) {
    records.push(
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Amy', surname: 'Doe' },
        { id: 3, name: 'Jane', surname: 'Smith' },
    );

    await table.initialize();

    const results = await table.getManyWhere({
        sql: 'WHERE surname = ?',
        sqlParams: ['Doe'],
        ...extraConditions,
    });

    expect(results).toEqual([
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Amy', surname: 'Doe' },
    ]);
}

/**
 * Tests reduce operation.
 *
 * @param records An array of User records.
 * @param table The database table instance.
 * @param extraReducer Additional reducer definition.
 * @param extraConditions Additional reduce conditions.
 */
async function testReduce(
    records: User[],
    table: CoreDatabaseTable<User>,
    extraReducer: Partial<Pick<CoreInMemoryDatabaseReducer<User, number>, 'js' | 'jsInitialValue'>> = {},
    extraConditions: Partial<Pick<CoreInMemoryDatabaseConditions<User>, 'js'>> = {},
) {
    const reducer = { sql: 'COUNT(*)' };
    const conditions = { sql: 'WHERE surname = ?', sqlParams: ['Doe'] };

    records.push(
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Amy', surname: 'Doe' },
        { id: 3, name: 'Jane', surname: 'Smith' },
    );

    await table.initialize();

    await expect(table.reduce<number>({ ...reducer, ...extraReducer }, { ...conditions, ...extraConditions })).resolves.toBe(2);
}

/**
 * Tests count operation.
 *
 * @param records An array of User records.
 * @param table The database table instance.
 */
async function testCount(records: User[], table: CoreDatabaseTable<User>) {
    records.push(
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Amy', surname: 'Doe' },
        { id: 3, name: 'Jane', surname: 'Smith' },
    );

    await table.initialize();

    await expect(table.count()).resolves.toBe(3);
    await expect(table.count({ surname: 'Doe' })).resolves.toBe(2);
}

/**
 * Tests update with plain conditions.
 *
 * @param records An array of User records.
 * @param database The SQLite database instance.
 * @param table The database table instance.
 */
async function testUpdate(records: User[], database: SQLiteDB, table: CoreDatabaseTable<User>) {
    records.push(
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Amy', surname: 'Doe' },
        { id: 3, name: 'Jane', surname: 'Smith' },
    );

    await table.initialize();
    await table.update({ surname: 'Wong' }, { surname: 'Doe' });

    expect(database.updateRecords).toHaveBeenCalledWith('users', { surname: 'Wong' }, { surname: 'Doe' });
    await expect(table.getOneByPrimaryKey({ id: 1 })).resolves.toEqual({ id: 1, name: 'John', surname: 'Wong' });
    await expect(table.getOneByPrimaryKey({ id: 2 })).resolves.toEqual({ id: 2, name: 'Amy', surname: 'Wong' });
    await expect(table.getOneByPrimaryKey({ id: 3 })).resolves.toEqual({ id: 3, name: 'Jane', surname: 'Smith' });
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

    it('sorts items', () => testSortItems(records, table));
    it('inserts items', () => testInsertItems(records, database, table));
    it('deletes items', () => testDeleteItems(records, database, table));
    it('deletes items by primary key', () => testDeleteItemsByPrimaryKey(records, database, table));
    it('calls listeners on destroy', () => testListeners(table));
    it('matches proxy config', () => testMatchesConfig(table, CoreDatabaseCachingStrategy.Eager));
    it('gets many records filtered by conditions', () => testGetManyWithConditions(records, table));
    it('gets many records with where conditions', () => testGetManyWhere(records, table, { js: user => user.surname === 'Doe' }));
    it('reduces records with where conditions', () => testReduce(
        records,
        table,
        {
            js: accumulator => accumulator + 1,
            jsInitialValue: 0,
        },
        {
            js: user => user.surname === 'Doe',
        },
    ));
    it('counts records', () => testCount(records, table));
    it('updates records filtered by conditions', () => testUpdate(records, database, table));
    it('updates items with updateWhere', () => testUpdateWhereItems(records, database, table, {
        js: user => user.surname === 'Doe',
    }));
    it('deletes items with deleteWhere', () => testDeleteWhereItems(records, database, table, {
        js: user => user.surname === 'Doe',
    }));

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

    it('sorts items', () => testSortItems(records, table));
    it('inserts items', () => testInsertItems(records, database, table));
    it('deletes items', () => testDeleteItems(records, database, table));
    it('deletes items by primary key', () => testDeleteItemsByPrimaryKey(records, database, table));
    it('calls listeners on destroy', () => testListeners(table));
    it('matches proxy config', () => testMatchesConfig(table, CoreDatabaseCachingStrategy.Lazy));
    it('gets many records filtered by conditions', () => testGetManyWithConditions(records, table));
    it('gets many records with where conditions', () => testGetManyWhere(records, table, { js: user => user.surname === 'Doe' }));
    it('reduces records with where conditions', () => testReduce(
        records,
        table,
        {
            js: accumulator => accumulator + 1,
            jsInitialValue: 0,
        },
        {
            js: user => user.surname === 'Doe',
        },
    ));
    it('counts records', () => testCount(records, table));
    it('updates records filtered by conditions', () => testUpdate(records, database, table));
    it('updates items with updateWhere', () => testUpdateWhereItems(records, database, table, {
        js: user => user.surname === 'Doe',
    }));
    it('deletes items with deleteWhere', () => testDeleteWhereItems(records, database, table, {
        js: user => user.surname === 'Doe',
    }));

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

    it('sorts items', () => testSortItems(records, table));
    it('inserts items', () => testInsertItems(records, database, table));
    it('deletes items', () => testDeleteItems(records, database, table));
    it('deletes items by primary key', () => testDeleteItemsByPrimaryKey(records, database, table));
    it('calls listeners on destroy', () => testListeners(table));
    it('matches proxy config', () => testMatchesConfig(table, CoreDatabaseCachingStrategy.None));
    it('gets many records filtered by conditions', () => testGetManyWithConditions(records, table));
    it('gets many records with where conditions', () => testGetManyWhere(records, table));
    it('reduces records with where conditions', () => testReduce(records, table));
    it('counts records', () => testCount(records, table));
    it('updates records filtered by conditions', () => testUpdate(records, database, table));
    it('updates items with updateWhere', () => testUpdateWhereItems(records, database, table));
    it('deletes items with deleteWhere', () => testDeleteWhereItems(records, database, table));

});
