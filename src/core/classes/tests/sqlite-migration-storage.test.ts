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

import type { registerPlugin } from '@capacitor/core';
import type { CoreSQLiteMigrationStartupStorage } from '@classes/sqlite-migration-startup';
import type { SQLiteMigration } from '../../../../capacitor-plugin-moodleapp/src/plugins/SQLiteMigration';

jest.mock('@capacitor/core', () => ({
    registerPlugin: jest.fn(() => ({
        list: jest.fn(),
        listJournalNames: jest.fn(),
        readJournal: jest.fn(),
        writeJournal: jest.fn(),
        renameNoReplace: jest.fn(),
        removeDatabaseFiles: jest.fn(),
    })),
}));

describe('SQLiteMigration bridge', () => {
    let native: {
        list: jest.Mock;
        listJournalNames: jest.Mock;
        readJournal: jest.Mock;
        writeJournal: jest.Mock;
        renameNoReplace: jest.Mock;
        removeDatabaseFiles: jest.Mock;
    };
    let nativeRegister: jest.MockedFunction<typeof registerPlugin>;
    let wrapper: SQLiteMigration;
    let storage: CoreSQLiteMigrationStartupStorage;
    const name = 'MoodleMobile';

    beforeAll(async () => {
        await jest.isolateModulesAsync(async () => {
            const core = await import('@capacitor/core');
            const plugin = await import('../../../../capacitor-plugin-moodleapp/src/plugins/SQLiteMigration');
            nativeRegister = jest.mocked(core.registerPlugin);
            native = nativeRegister.mock.results[0].value;
            wrapper = new plugin.SQLiteMigration();
            storage = wrapper;
        });
    });

    beforeEach(() => {
        Object.values(native).forEach(method => method.mockReset());
    });

    it('registers the native migration bridge and returns its inventory', async () => {
        expect(nativeRegister).toHaveBeenCalledWith('MoodleAppSQLiteMigration');
        native.list.mockResolvedValue({ files: [name, name + '-wal'] });

        await expect(storage.list()).resolves.toEqual([name, name + '-wal']);
    });

    it('distinguishes missing journals from corrupt JSON', async () => {
        native.readJournal.mockResolvedValueOnce({});
        await expect(storage.readJournal(name)).resolves.toBeUndefined();
        native.readJournal.mockResolvedValueOnce({ journal: '{"state":' });
        await expect(storage.readJournal(name)).rejects.toThrow(SyntaxError);
    });

    it('lists migration records independently of surviving database files', async () => {
        native.listJournalNames.mockResolvedValue({ names: [name, 'Site-inactive'] });

        await expect(storage.listJournalNames()).resolves.toEqual([name, 'Site-inactive']);
    });

    it('returns untrusted JSON for validation by the protocol', async () => {
        native.readJournal.mockResolvedValue({ journal: '{"state":"invalid"}' });

        await expect(storage.readJournal(name)).resolves.toEqual({ state: 'invalid' });
        expect(native.readJournal).toHaveBeenCalledWith({ name });
    });

    it('serialises metadata and passes exclusive rename arguments unchanged', async () => {
        const journal = { version: 1, name, suffixes: [''], state: 'renaming' } as const;
        await wrapper.writeJournal(name, journal);
        await storage.renameNoReplace(name, name + 'SQLite.db');

        expect(native.writeJournal).toHaveBeenCalledWith({ name, journal: JSON.stringify(journal) });
        expect(native.renameNoReplace).toHaveBeenCalledWith({ source: name, destination: name + 'SQLite.db' });
    });

    it('rejects unserialisable metadata without a native write', async () => {
        await expect(wrapper.writeJournal(name, undefined)).rejects.toThrow('JSON serialisable');
        await expect(wrapper.writeJournal(name, BigInt(1))).rejects.toThrow(TypeError);
        expect(native.writeJournal).not.toHaveBeenCalled();
    });

    it('passes durable file removal through the native intent guard', async () => {
        await wrapper.removeDatabaseFiles(name);
        expect(native.removeDatabaseFiles).toHaveBeenCalledWith({ name });
    });

    it.each(['list', 'listJournalNames', 'readJournal', 'writeJournal', 'renameNoReplace', 'removeDatabaseFiles'] as const)(
        'propagates native %s failures rather than returning missing state or success',
        async (method) => {
            const error = new Error('Native filesystem failure');
            native[method].mockRejectedValue(error);
            const calls = {
                list: () => storage.list(),
                listJournalNames: () => storage.listJournalNames(),
                readJournal: () => storage.readJournal(name),
                writeJournal: () => storage.writeJournal(name, { version: 1, name, suffixes: [''], state: 'renaming' }),
                renameNoReplace: () => storage.renameNoReplace(name, name + 'SQLite.db'),
                removeDatabaseFiles: () => wrapper.removeDatabaseFiles(name),
            };

            await expect(calls[method]()).rejects.toBe(error);
        },
    );
});
