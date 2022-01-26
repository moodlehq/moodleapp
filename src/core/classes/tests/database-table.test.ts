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

import { mock } from '@/testing/utils';
import { CoreDatabaseTable } from '@classes/database-table';
import { SQLiteDB, SQLiteDBRecordValues } from '@classes/sqlitedb';

interface User extends SQLiteDBRecordValues {
    id: number;
    name: string;
    surname: string;
}

class UsersTable extends CoreDatabaseTable<User> {

    protected table = 'users';

}

describe('CoreDatabaseTable', () => {

    let records: User[];
    let db: SQLiteDB;

    beforeEach(() => {
        records = [];
        db = mock<SQLiteDB>({
            getRecords: async <T>() => records as unknown as T[],
            deleteRecords: async () => 0,
            insertRecord: async () => 0,
        });
    });

    it('reads all records on create', async () => {
        await UsersTable.create(db);

        expect(db.getRecords).toHaveBeenCalledWith('users');
    });

    it('finds items', async () => {
        const john = { id: 1, name: 'John', surname: 'Doe' };
        const amy = { id: 2, name: 'Amy', surname: 'Doe' };

        records.push(john);
        records.push(amy);

        const table = await UsersTable.create(db);

        expect(table.findByPrimaryKey({ id: 1 })).toEqual(john);
        expect(table.findByPrimaryKey({ id: 2 })).toEqual(amy);
        expect(table.find({ surname: 'Doe', name: 'John' })).toEqual(john);
        expect(table.find({ surname: 'Doe', name: 'Amy' })).toEqual(amy);
    });

    it('inserts items', async () => {
        // Arrange.
        const john = { id: 1, name: 'John', surname: 'Doe' };

        // Act.
        const table = await UsersTable.create(db);

        await table.insert(john);

        // Assert.
        expect(db.insertRecord).toHaveBeenCalledWith('users', john);

        expect(table.findByPrimaryKey({ id: 1 })).toEqual(john);
    });

    it('deletes items', async () => {
        // Arrange.
        const john = { id: 1, name: 'John', surname: 'Doe' };
        const amy = { id: 2, name: 'Amy', surname: 'Doe' };
        const jane = { id: 3, name: 'Jane', surname: 'Smith' };

        records.push(john);
        records.push(amy);
        records.push(jane);

        // Act.
        const table = await UsersTable.create(db);

        await table.delete({ surname: 'Doe' });

        // Assert.
        expect(db.deleteRecords).toHaveBeenCalledWith('users', { surname: 'Doe' });

        expect(table.findByPrimaryKey({ id: 1 })).toBeNull();
        expect(table.findByPrimaryKey({ id: 2 })).toBeNull();
        expect(table.findByPrimaryKey({ id: 3 })).toEqual(jane);
    });

    it('deletes items by primary key', async () => {
        // Arrange.
        const john = { id: 1, name: 'John', surname: 'Doe' };
        const amy = { id: 2, name: 'Amy', surname: 'Doe' };

        records.push(john);
        records.push(amy);

        // Act.
        const table = await UsersTable.create(db);

        await table.deleteByPrimaryKey({ id: 1 });

        // Assert.
        expect(db.deleteRecords).toHaveBeenCalledWith('users', { id: 1 });

        expect(table.findByPrimaryKey({ id: 1 })).toBeNull();
        expect(table.findByPrimaryKey({ id: 2 })).toEqual(amy);
    });

});
