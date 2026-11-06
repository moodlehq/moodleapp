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

import { registerPlugin } from '@capacitor/core';

const NativeSQLiteMigration = registerPlugin<NativeSQLiteMigrationPlugin>('MoodleAppSQLiteMigration');

/**
 * File primitives for the SQLite driver migration, not general-purpose filesystem access.
 * The caller must keep all SQLite connections closed until its rename protocol completes.
 */
export class SQLiteMigration {

    /**
     * List owned database files, rejecting unexpected non-regular entries.
     *
     * @returns Filenames in the fixed native database directory.
     */
    async list(): Promise<string[]> {
        const { files } = await NativeSQLiteMigration.list();

        return files;
    }

    /**
     * List persisted or interrupted metadata names independently of surviving database files.
     *
     * @returns Logical names, including completed migration records.
     */
    async listJournalNames(): Promise<string[]> {
        const { names } = await NativeSQLiteMigration.listJournalNames();

        return names;
    }

    /**
     * Read migration metadata without confusing I/O errors with missing state.
     *
     * @param name Logical database name.
     * @returns Untrusted JSON for validation by the migration protocol, or undefined if absent.
     */
    async readJournal(name: string): Promise<unknown> {
        const { journal } = await NativeSQLiteMigration.readJournal({ name });

        return journal === undefined ? undefined : JSON.parse(journal);
    }

    /**
     * Atomically persist metadata outside the database file set before moving any files.
     *
     * @param name Logical database name.
     * @param journal Migration metadata, never database contents.
     */
    async writeJournal(name: string, journal: unknown): Promise<void> {
        const serialized = JSON.stringify(journal);
        if (serialized === undefined) {
            throw new Error('SQLite migration journal must be JSON serialisable.');
        }

        await NativeSQLiteMigration.writeJournal({ name, journal: serialized });
    }

    /**
     * Rename one principal or companion without ever replacing an existing destination.
     * A rejected call may have moved the file before persistence failed: inspect both paths on retry.
     *
     * @param source Legacy filename.
     * @param destination Expected plugin filename in the same directory.
     */
    async renameNoReplace(source: string, destination: string): Promise<void> {
        await NativeSQLiteMigration.renameNoReplace({ source, destination });
    }

}

type NativeSQLiteMigrationPlugin = {
    list(): Promise<{ files: string[] }>;
    listJournalNames(): Promise<{ names: string[] }>;
    readJournal(options: { name: string }): Promise<{ journal?: string }>;
    writeJournal(options: { name: string; journal: string }): Promise<void>;
    renameNoReplace(options: { source: string; destination: string }): Promise<void>;
};
