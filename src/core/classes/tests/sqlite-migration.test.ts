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

import { CoreSQLiteMigration, CoreSQLiteMigrationJournal, CoreSQLiteMigrationStorage } from '@classes/sqlite-migration';

describe('CoreSQLiteMigration', () => {
    const name = 'MoodleMobile';
    const suffixes = ['', '-wal', '-shm', '-journal'];
    let files: Map<string, string>;
    let journal: unknown;
    let storage: CoreSQLiteMigrationStorage;

    beforeEach(() => {
        files = new Map(suffixes.map(suffix => [name + suffix, 'original' + suffix]));
        files.set('unrelated', 'untouched');
        journal = undefined;
        storage = {
            list: jest.fn(async () => [...files.keys()]),
            readJournal: jest.fn(async () => journal),
            writeJournal: jest.fn(async (_name, value) => {
                journal = { ...value, suffixes: [...value.suffixes] };
            }),
            renameNoReplace: jest.fn(async (source, destination) => {
                const contents = files.get(source);
                if (files.has(destination) || contents === undefined) {
                    throw new Error('Unsafe move');
                }
                files.set(destination, contents);
                files.delete(source);
            }),
        };
    });

    it('journals before renaming and preserves every byte and unrelated files', async () => {
        await new CoreSQLiteMigration(storage).rename(name);

        expect(storage.writeJournal).toHaveBeenNthCalledWith(1, name, {
            version: 1, name, suffixes, state: 'renaming',
        });
        suffixes.forEach(suffix => expect(files.get(name + 'SQLite.db' + suffix)).toBe('original' + suffix));
        expect(files.get('unrelated')).toBe('untouched');
        expect(journal).toEqual({ version: 1, name, suffixes, state: 'renamed' });
    });

    it.each([0, 1, 2, 3, 4, 5])('resumes after durable operation %i, including before its acknowledgement', async (stop) => {
        let operation = 0;
        const persist = storage.writeJournal;
        const move = storage.renameNoReplace;
        const interrupt = (): void => {
            if (operation++ === stop) {
                throw new Error('Process stopped');
            }
        };
        storage.writeJournal = jest.fn(async (...args) => {
            await persist(...args);
            interrupt();
        });
        storage.renameNoReplace = jest.fn(async (...args) => {
            await move(...args);
            interrupt();
        });

        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('Process stopped');
        storage.writeJournal = persist;
        storage.renameNoReplace = move;
        await new CoreSQLiteMigration(storage).rename(name);

        expect(journal).toEqual({ version: 1, name, suffixes, state: 'renamed' });
        suffixes.forEach(suffix => expect(files.get(name + 'SQLite.db' + suffix)).toBe('original' + suffix));
    });

    it('does not move anything if the initial journal cannot be persisted', async () => {
        storage.writeJournal = jest.fn().mockRejectedValue(new Error('Disk full'));
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('Disk full');
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it.each([0, 1, 2, 3])('resumes after a move rejects before changing file %i', async (stop) => {
        const move = storage.renameNoReplace;
        let operation = 0;
        storage.renameNoReplace = jest.fn(async (...args) => {
            if (operation++ === stop) {
                throw new Error('Move failed');
            }
            await move(...args);
        });
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('Move failed');
        storage.renameNoReplace = move;
        await new CoreSQLiteMigration(storage).rename(name);
        suffixes.forEach(suffix => expect(files.get(name + 'SQLite.db' + suffix)).toBe('original' + suffix));
    });

    it('rejects a missing source instead of creating a database', async () => {
        files.delete(name);
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow();
        expect(storage.writeJournal).not.toHaveBeenCalled();
    });

    it('rejects unknown source companions before recording or moving anything', async () => {
        files.set(name + '-mj123', 'super-journal');
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('unsupported companion');
        expect(storage.writeJournal).not.toHaveBeenCalled();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it('propagates unreadable storage instead of treating it as an absent journal', async () => {
        storage.readJournal = jest.fn().mockRejectedValue(new Error('Permission denied'));
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('Permission denied');
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it('preserves a destination that appears after preflight', async () => {
        const move = storage.renameNoReplace;
        storage.renameNoReplace = jest.fn(async (source, destination) => {
            files.set(destination, 'concurrent destination');
            await move(source, destination);
        });
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('Unsafe move');
        expect(files.get(name)).toBe('original');
        expect(files.get(name + 'SQLite.db')).toBe('concurrent destination');
    });

    it('does not record completion if a storage operation reports success without moving', async () => {
        storage.renameNoReplace = jest.fn(async () => undefined);
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('did not complete');
        expect(journal).toEqual({ version: 1, name, suffixes, state: 'renaming' });
    });

    it.each(['', '-wal', '-shm', '-journal'])('rejects an untracked destination collision (%s)', async (suffix) => {
        files.set(name + 'SQLite.db' + suffix, 'destination');
        const before = [...files];
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow();
        expect([...files]).toEqual(before);
        expect(storage.writeJournal).not.toHaveBeenCalled();
    });

    it.each(['missing', 'both', 'new-companion'])('refuses a changed recorded file set: %s', async (change) => {
        journal = { version: 1, name, suffixes, state: 'renaming' };
        if (change === 'missing') {
            files.delete(name + '-wal');
        } else if (change === 'both') {
            files.set(name + 'SQLite.db-wal', 'other');
        } else {
            files.set(name + '-unknown', 'other');
        }
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it.each([null, {}, { version: 2 }, {
        version: 1, name, suffixes: ['', '../../escape'], state: 'renaming',
    }, {
        version: 1, name, suffixes: ['', ''], state: 'renaming',
    }])('refuses invalid persisted state: %j', async (value) => {
        journal = value;
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow('Invalid SQLite migration');
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it('allows SQLite to consume companions after completion, but never recreates a missing main file', async () => {
        await new CoreSQLiteMigration(storage).rename(name);
        files.delete(name + 'SQLite.db-wal');
        files.delete(name + 'SQLite.db-journal');
        await new CoreSQLiteMigration(storage).rename(name);
        files.delete(name + 'SQLite.db');
        await expect(new CoreSQLiteMigration(storage).rename(name)).rejects.toThrow();
    });

    it('serialises concurrent callers and never repeats a move', async () => {
        const migration = new CoreSQLiteMigration(storage);
        await Promise.all([migration.rename(name), migration.rename(name)]);
        expect(storage.renameNoReplace).toHaveBeenCalledTimes(4);
    });

    it.each(['../MoodleMobile', 'Other', 'Site-../other', 'Site-', 'Site-a.db', 'Site-a\n', 'Site-a\r\n'])(
        'refuses unsafe names: %s',
        async (value) => {
            await expect(new CoreSQLiteMigration(storage).rename(value)).rejects.toThrow();
            expect(storage.readJournal).not.toHaveBeenCalled();
        },
    );

    it('supports a site database without companions', async () => {
        const site = 'Site-abc123';
        files = new Map([[site, 'site data']]);
        await new CoreSQLiteMigration(storage).rename(site);
        expect(files.get(site + 'SQLite.db')).toBe('site data');
        expect(journal).toEqual<CoreSQLiteMigrationJournal>({
            version: 1, name: site, suffixes: [''], state: 'renamed',
        });
    });
});
