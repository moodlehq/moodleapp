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

import { CoreError } from '@classes/errors/error';
import { CoreQueueRunner } from '@classes/queue-runner';

const suffixes = ['', '-wal', '-shm', '-journal'] as const;

/**
 * Resumable file renaming only. Callers must keep every SQLite connection closed until completion.
 * Opening, SQLite recovery and schema validation are separate steps after this protocol succeeds.
 */
export class CoreSQLiteMigration {

    protected queue = new CoreQueueRunner();

    constructor(protected storage: CoreSQLiteMigrationStorage) {}

    /**
     * Validate one inventoried database without writing metadata or moving files.
     *
     * @param name Logical database name.
     * @param files Complete closed-database inventory.
     */
    async validate(name: string, files: string[]): Promise<void> {
        this.checkName(name);
        const stored = await this.storage.readJournal(name);
        if (stored === undefined) {
            this.checkSource(files, name);

            return;
        }

        const journal = this.validateJournal(stored, name);
        if (journal.state === 'renamed') {
            this.checkCompleted(files, name);
        } else {
            this.checkInventory(files, journal);
        }
    }

    /**
     * Rename an existing owned database, or resume its recorded rename without replacing files.
     *
     * @param name Logical database name.
     */
    async rename(name: string): Promise<void> {
        this.checkName(name);

        await this.queue.run(() => this.performRename(name));
    }

    /**
     * Reject unsafe names before reading or writing native metadata.
     *
     * @param name Logical database name.
     */
    protected checkName(name: string): void {
        if (name !== 'MoodleMobile' && /^Site-[a-zA-Z0-9_-]+$/.exec(name)?.[0] !== name) {
            throw new CoreError('Invalid SQLite migration database name.');
        }
    }

    /**
     * Persist the complete inventory before any move and infer interrupted moves from both paths.
     *
     * @param name Logical database name.
     */
    protected async performRename(name: string): Promise<void> {
        const stored = await this.storage.readJournal(name);
        const files = await this.storage.list();
        let journal: CoreSQLiteMigrationJournal;

        if (stored === undefined) {
            this.checkSource(files, name);
            journal = {
                version: 1,
                name,
                suffixes: suffixes.filter(suffix => files.includes(name + suffix)),
                state: 'renaming',
            };
            await this.storage.writeJournal(name, journal);
        } else {
            journal = this.validateJournal(stored, name);
        }

        if (journal.state === 'renamed') {
            this.checkCompleted(files, name);

            return;
        }

        this.checkInventory(files, journal);

        for (const suffix of journal.suffixes) {
            const source = name + suffix;
            const destination = name + 'SQLite.db' + suffix;

            if (files.includes(source)) {
                await this.storage.renameNoReplace(source, destination);
            }
        }

        const renamedFiles = await this.storage.list();
        this.checkInventory(renamedFiles, journal);
        if (journal.suffixes.some(suffix => renamedFiles.includes(name + suffix))) {
            throw new CoreError('SQLite migration rename did not complete.');
        }

        await this.storage.writeJournal(name, { ...journal, state: 'renamed' });
    }

    /**
     * Check completed records after SQLite may have consumed their recovery files.
     *
     * @param files Directory inventory.
     * @param name Logical database name.
     */
    protected checkCompleted(files: string[], name: string): void {
        if (!files.includes(name + 'SQLite.db') || suffixes.some(suffix => files.includes(name + suffix))) {
            throw new CoreError('SQLite migration completed files are missing or conflicting.');
        }
    }

    /**
     * Refuse missing sources, unknown companions and untracked destinations before journalling.
     *
     * @param files Directory inventory.
     * @param name Logical database name.
     */
    protected checkSource(files: string[], name: string): void {
        if (!files.includes(name) || files.some(file => file === name + 'SQLite.db' || file.startsWith(name + 'SQLite.db-'))) {
            throw new CoreError('SQLite migration source is missing or destination already exists.');
        }

        if (files.some(file => file.startsWith(name + '-') && !suffixes.some(suffix => file === name + suffix))) {
            throw new CoreError('SQLite migration has an unsupported companion file.');
        }
    }

    /**
     * Require exactly one path for every recorded file, without accepting new recovery files.
     *
     * @param files Directory inventory.
     * @param journal Persisted rename plan.
     */
    protected checkInventory(files: string[], journal: CoreSQLiteMigrationJournal): void {
        const { name } = journal;
        const expected = journal.suffixes.flatMap(suffix => [name + suffix, name + 'SQLite.db' + suffix]);
        const unexpected = files.some(file =>
            (file === name || file.startsWith(name + '-') || file === name + 'SQLite.db' ||
                file.startsWith(name + 'SQLite.db-')) && !expected.includes(file));
        const conflicting = journal.suffixes.some(suffix =>
            files.includes(name + suffix) === files.includes(name + 'SQLite.db' + suffix));

        if (unexpected || conflicting) {
            throw new CoreError('SQLite migration file set is missing, conflicting or changed.');
        }
    }

    /**
     * Validate persisted state before it can authorise any filesystem changes.
     *
     * @param value Untrusted journal content.
     * @param name Expected logical database name.
     * @returns Validated journal.
     */
    protected validateJournal(value: unknown, name: string): CoreSQLiteMigrationJournal {
        if (typeof value !== 'object' || value === null ||
                !('version' in value) || value.version !== 1 ||
                !('name' in value) || value.name !== name ||
                !('state' in value) || (value.state !== 'renaming' && value.state !== 'renamed') ||
                !('suffixes' in value) || !Array.isArray(value.suffixes)) {
            throw new CoreError('Invalid SQLite migration journal.');
        }

        const recorded = value.suffixes;
        if (recorded.length === 0 || recorded[0] !== '' ||
                !recorded.every((suffix): suffix is CoreSQLiteMigrationSuffix => suffixes.some(allowed => allowed === suffix)) ||
                new Set(recorded).size !== recorded.length) {
            throw new CoreError('Invalid SQLite migration journal file set.');
        }

        return { version: 1, name, state: value.state, suffixes: recorded };
    }

}

type CoreSQLiteMigrationSuffix = typeof suffixes[number];

export type CoreSQLiteMigrationJournal = {
    version: 1;
    name: string;
    suffixes: CoreSQLiteMigrationSuffix[];
    state: 'renaming' | 'renamed';
};

/**
 * Native implementation must operate in the owned database directory with no active connections.
 * All methods must reject I/O errors; absence alone returns undefined from readJournal.
 */
export type CoreSQLiteMigrationStorage = {
    // List regular filenames; reject unexpected non-regular entries for owned database paths.
    list(): Promise<string[]>;
    readJournal(name: string): Promise<unknown>;
    // Atomically and durably replace a journal outside the database file set.
    writeJournal(name: string, journal: CoreSQLiteMigrationJournal): Promise<void>;
    // Same-directory atomic move, rejecting existing destinations. Persist it before resolving.
    renameNoReplace(source: string, destination: string): Promise<void>;
};
