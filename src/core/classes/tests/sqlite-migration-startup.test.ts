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

import { CoreSQLiteMigrationStartup, CoreSQLiteMigrationStartupStorage } from '@classes/sqlite-migration-startup';
import { CoreSQLiteMigrationJournal } from '@classes/sqlite-migration';

describe('CoreSQLiteMigrationStartup', () => {
    let files: Set<string>;
    let journals: Map<string, unknown>;
    let storage: CoreSQLiteMigrationStartupStorage;

    beforeEach(() => {
        files = new Set(['MoodleMobile', 'Site-alpha', 'Site-alpha-wal', 'Site-beta', 'unrelated.db']);
        journals = new Map();
        storage = {
            list: jest.fn(async () => [...files]),
            listJournalNames: jest.fn(async () => [...journals.keys()]),
            readJournal: jest.fn(async name => journals.get(name)),
            writeJournal: jest.fn(async (name, journal) => {
                journals.set(name, { ...journal, suffixes: [...journal.suffixes] });
            }),
            renameNoReplace: jest.fn(async (source, destination) => {
                if (!files.has(source) || files.has(destination)) {
                    throw new Error('Unsafe rename');
                }
                files.delete(source);
                files.add(destination);
            }),
        };
    });

    it('adopts the global database and every site, independent of the active site', async () => {
        const names = await new CoreSQLiteMigrationStartup(storage).ready();

        expect(names).toEqual(['MoodleMobile', 'Site-alpha', 'Site-beta']);
        expect(Object.isFrozen(names)).toBe(true);
        expect(files).toEqual(new Set([
            'MoodleMobileSQLite.db', 'Site-alphaSQLite.db', 'Site-alphaSQLite.db-wal',
            'Site-betaSQLite.db', 'unrelated.db',
        ]));
        expect([...journals.values()]).toEqual(names.map(name => expect.objectContaining({ name, state: 'renamed' })));
    });

    it('preflights all databases before the first metadata write or move', async () => {
        files.add('Site-betaSQLite.db');

        await expect(new CoreSQLiteMigrationStartup(storage).ready()).rejects.toThrow();
        expect(storage.writeJournal).not.toHaveBeenCalled();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it.each(['Site-beta-mj123.dat', 'Site-beta-wal2', 'MoodleMobile.unknown', 'Site-bad\n'])(
        'rejects unknown or ambiguous owned entries before moving anything: %s',
        async file => {
            files.add(file);

            await expect(new CoreSQLiteMigrationStartup(storage).ready()).rejects.toThrow();
            expect(storage.renameNoReplace).not.toHaveBeenCalled();
        },
    );

    it('shares exactly one barrier among simultaneous and later consumers', async () => {
        const startup = new CoreSQLiteMigrationStartup(storage);
        const first = startup.ready();

        expect(startup.ready()).toBe(first);
        await first;
        expect(startup.ready()).toBe(first);
        expect(storage.listJournalNames).toHaveBeenCalledTimes(1);
        expect(storage.renameNoReplace).toHaveBeenCalledTimes(4);
    });

    it('accepts a fresh installation without inventing legacy databases', async () => {
        files.clear();

        await expect(new CoreSQLiteMigrationStartup(storage).ready()).resolves.toEqual([]);
        expect(storage.writeJournal).not.toHaveBeenCalled();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it.each(['MoodleMobile', 'Site-inactive'])('detects missing principals using metadata alone: %s', async name => {
        journals.set(name, { version: 1, name, suffixes: [''], state: 'renamed' });
        files.delete(name);

        await expect(new CoreSQLiteMigrationStartup(storage).ready()).rejects.toThrow();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it('does not allow orphaned site databases to become a fresh global database', async () => {
        files.delete('MoodleMobile');

        await expect(new CoreSQLiteMigrationStartup(storage).ready()).rejects.toThrow('global database is missing');
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it.each(['Site-orphan-wal', 'Site-orphanSQLite.db-journal', 'Site-untrackedSQLite.db'])(
        'does not treat an orphan or untracked destination as a fresh database: %s',
        async file => {
            files.add(file);

            await expect(new CoreSQLiteMigrationStartup(storage).ready()).rejects.toThrow();
            expect(storage.renameNoReplace).not.toHaveBeenCalled();
        },
    );

    it('resumes a partially renamed site and tolerates consumed companions of completed databases', async () => {
        files.delete('Site-alpha');
        files.add('Site-alphaSQLite.db');
        journals.set('Site-alpha', {
            version: 1, name: 'Site-alpha', suffixes: ['', '-wal'], state: 'renaming',
        });
        files.delete('MoodleMobile');
        files.add('MoodleMobileSQLite.db');
        journals.set('MoodleMobile', {
            version: 1, name: 'MoodleMobile', suffixes: ['', '-journal'], state: 'renamed',
        });

        await new CoreSQLiteMigrationStartup(storage).ready();

        expect(storage.renameNoReplace).toHaveBeenCalledTimes(2);
        expect(files.has('Site-alphaSQLite.db-wal')).toBe(true);
    });

    it.each(['list', 'listJournalNames', 'readJournal'] as const)('propagates %s errors without moving files', async method => {
        const error = new Error('Cannot inventory databases');
        jest.mocked(storage[method]).mockRejectedValue(error);
        const startup = new CoreSQLiteMigrationStartup(storage);

        await expect(startup.ready()).rejects.toBe(error);
        await expect(startup.ready()).rejects.toBe(error);
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it('rejects corrupt metadata before moving any database', async () => {
        journals.set('Site-beta', { state: 'unknown' });

        await expect(new CoreSQLiteMigrationStartup(storage).ready()).rejects.toThrow('Invalid SQLite migration journal');
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it('latches failures after moves and resumes only with a new startup instance', async () => {
        const move = storage.renameNoReplace;
        const error = new Error('Interrupted after durable rename');
        storage.renameNoReplace = jest.fn(async (...args) => {
            await move(...args);
            throw error;
        });
        const startup = new CoreSQLiteMigrationStartup(storage);

        await expect(startup.ready()).rejects.toBe(error);
        await expect(startup.ready()).rejects.toBe(error);
        expect(storage.renameNoReplace).toHaveBeenCalledTimes(1);
        storage.renameNoReplace = move;
        await new CoreSQLiteMigrationStartup(storage).ready();
        expect(journals.get('MoodleMobile')).toEqual<CoreSQLiteMigrationJournal>({
            version: 1, name: 'MoodleMobile', suffixes: [''], state: 'renamed',
        });
    });
});
