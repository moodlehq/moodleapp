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

import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreH5PFramework } from '../classes/framework';
import {
    CoreH5PContentDBRecord,
    CoreH5PLibraryCachedAssetsDBRecord,
} from '../services/database/h5p';
import { CoreH5PContentDependencyData } from '../classes/core';

/**
 * Test-only extension exposing a controlled way to override cached assets table access.
 * librariesCachedAssetsTables is a protected property so it cannot be overridden in the mock function.
 */
class TestableCoreH5PFramework extends CoreH5PFramework {

    /**
     * Replace the cached assets table for a specific site.
     *
     * @param siteId Site ID.
     * @param table Cached assets table implementation for tests.
     */
    setCachedAssetsTable(
        siteId: string,
        table: Pick<CoreDatabaseTable<CoreH5PLibraryCachedAssetsDBRecord>, 'getMany' | 'insert' | 'deleteWhere'>,
    ): void {
        (this.librariesCachedAssetsTables as Record<string, unknown>)[siteId] = table;
    }

    /**
     * Replace the contents table for a specific site.
     *
     * @param siteId Site ID.
     * @param table Contents table implementation for tests.
     */
    setContentTable(
        siteId: string,
        table: Pick<CoreDatabaseTable<CoreH5PContentDBRecord>, 'updateWhere'>,
    ): void {
        (this.contentTables as Record<string, unknown>)[siteId] = table;
    }

}

describe('CoreH5PFramework', () => {

    const LIBRARIES: Record<string, CoreH5PContentDependencyData> = {
        'H5P.DragQuestion': {
            libraryId: 1,
            dependencyType: 'preloaded',
            machineName: 'H5P.DragQuestion',
            majorVersion: 1,
            minorVersion: 2,
            patchVersion: 3,
        },
        'H5P.Image': {
            libraryId: 2,
            dependencyType: 'preloaded',
            machineName: 'H5P.Image',
            majorVersion: 1,
            minorVersion: 2,
            patchVersion: 3,
        },
        'H5P.QuestionSet': {
            libraryId: 3,
            dependencyType: 'preloaded',
            machineName: 'H5P.QuestionSet',
            majorVersion: 1,
            minorVersion: 2,
            patchVersion: 3,
        },
        'H5P.MultiChoice': {
            libraryId: 4,
            dependencyType: 'preloaded',
            machineName: 'H5P.MultiChoice',
            majorVersion: 1,
            minorVersion: 2,
            patchVersion: 3,
        },
    };
    const SITE_ID = 'Site-12345';

    let cachedAssetsLastId = 0;
    const cachedAssetsRecords: Record<number, CoreH5PLibraryCachedAssetsDBRecord> = {};
    const contentRecords: Record<number, CoreH5PContentDBRecord> = {};
    const contentLibraryDependencies: Array<{ h5pid: number; libraryid: number }> = [];

    let framework: TestableCoreH5PFramework;
    beforeEach(() => {
        // Reset environment before each test.
        cachedAssetsLastId = 0;
        Object.keys(cachedAssetsRecords).forEach((key) => {
            delete cachedAssetsRecords[Number(key)];
        });
        Object.keys(contentRecords).forEach((key) => {
            delete contentRecords[Number(key)];
        });
        contentLibraryDependencies.length = 0;

        framework = new TestableCoreH5PFramework();

        framework.setCachedAssetsTable(SITE_ID, {
            getMany: async (conditions) =>
                Object.values(cachedAssetsRecords).filter((record) => record.libraryid === conditions?.libraryid),
            insert: async (record) => {
                const id = cachedAssetsLastId++;
                cachedAssetsRecords[id] = {
                    id: record.id ?? id,
                    ...record,
                };

                return id;
            },
            deleteWhere: async (conditions) => {
                const sqlParams = conditions.sqlParams;
                if (!sqlParams?.length) {
                    return;
                }

                Object.entries(cachedAssetsRecords).forEach(([primaryKey, record]) => {
                    if (sqlParams.includes(record.hash)) {
                        delete cachedAssetsRecords[Number(primaryKey)];
                    }
                });
            },
        });

        framework.setContentTable(SITE_ID, {
            updateWhere: async (fields, conditions) => {
                const sqlParams = conditions.sqlParams ?? [];
                const hasDependencySubquery = conditions.sql.includes(' OR id IN (SELECT h5pid ');
                const mainLibraryIds = hasDependencySubquery ? sqlParams.slice(0, sqlParams.length / 2) : sqlParams;
                const dependencyLibraryIds = hasDependencySubquery ? sqlParams.slice(sqlParams.length / 2) : [];

                const dependentContentIds = hasDependencySubquery
                    ? contentLibraryDependencies
                        .filter((dependency) => dependencyLibraryIds.includes(dependency.libraryid))
                        .map((dependency) => dependency.h5pid)
                    : [];

                Object.values(contentRecords).forEach((record) => {
                    const matchesMainLibrary = mainLibraryIds.includes(record.mainlibraryid);
                    const matchesDependencyLibrary = dependentContentIds.includes(record.id);

                    if (matchesMainLibrary || matchesDependencyLibrary) {
                        Object.assign(record, fields);
                    }
                });
            },
        });
    });

    it('clearFilteredParameters stops early when no library ids are provided', async () => {
        contentRecords[100] = {
            id: 100,
            jsoncontent: '{}',
            mainlibraryid: 2,
            foldername: 'folder-name',
            fileurl: 'https://example.com/file.h5p',
            filtered: 'already-filtered',
            timemodified: 1,
            timecreated: 1,
        };

        await framework.clearFilteredParameters([], SITE_ID);

        expect(contentRecords[100].filtered).toEqual('already-filtered');
    });

    it('clears filtered parameters for main and dependent libraries', async () => {
        contentRecords[1] = {
            id: 1,
            jsoncontent: '{}',
            mainlibraryid: 2,
            foldername: 'main-library-content',
            fileurl: 'https://example.com/main-library-content.h5p',
            filtered: 'main-library-filtered',
            timemodified: 1,
            timecreated: 1,
        };
        contentRecords[2] = {
            id: 2,
            jsoncontent: '{}',
            mainlibraryid: 99,
            foldername: 'dependent-library-content',
            fileurl: 'https://example.com/dependent-library-content.h5p',
            filtered: 'dependent-library-filtered',
            timemodified: 1,
            timecreated: 1,
        };
        contentRecords[3] = {
            id: 3,
            jsoncontent: '{}',
            mainlibraryid: 77,
            foldername: 'unrelated-content',
            fileurl: 'https://example.com/unrelated-content.h5p',
            filtered: 'unrelated-filtered',
            timemodified: 1,
            timecreated: 1,
        };

        // Content 2 depends on library 7, so it should also have filtered params cleared.
        contentLibraryDependencies.push(
            { h5pid: 2, libraryid: 7 },
            { h5pid: 3, libraryid: 45 },
        );

        const libraryIds = [2, 7];

        await framework.clearFilteredParameters(libraryIds, SITE_ID);

        expect(contentRecords[1].filtered).toBeNull();
        expect(contentRecords[2].filtered).toBeNull();
        expect(contentRecords[3].filtered).toEqual('unrelated-filtered');
    });

    it('correctly saves and deletes cached assets in DB', async () => {
        const saveCachedAssets = async (hash: string, folderName: string, librariesNames: string[]) => {
            const dependencies: Record<string, CoreH5PContentDependencyData> = {};
            librariesNames.forEach((libraryName) => {
                dependencies[libraryName] = LIBRARIES[libraryName];
            });

            await framework.saveCachedAssets(hash, dependencies, folderName, SITE_ID);
        };

        const firstContentHash = 'abcdef123456';
        const firstContentFolderName = 'question-set-1-1_abcde';
        const firstContentDependencies = ['H5P.DragQuestion', 'H5P.Image', 'H5P.QuestionSet'];
        const secondContentHash = 'ghijkl789012';
        const secondContentFolderName = 'question-set-2-2_qwerty';
        const secondContentDependencies = ['H5P.QuestionSet'];
        const thirdContentHash = 'mnopqr345678';
        const thirdContentFolderName = 'multichoice-1-yuiop';
        const thirdContentDependencies = ['H5P.MultiChoice'];

        // Check adding cached assets works fine.
        await saveCachedAssets(firstContentHash, firstContentFolderName, firstContentDependencies);

        let entries = Object.values(cachedAssetsRecords);
        expect(entries.length).toEqual(3);
        firstContentDependencies.forEach(machineName => {
            const dependency = LIBRARIES[machineName];
            const entry = entries.find((entry) => dependency.libraryId === entry.libraryid);
            expect(entry).not.toBeUndefined();
            expect(entry?.foldername).toEqual(firstContentFolderName);
            expect(entry?.hash).toEqual(firstContentHash);
        });

        // Save different cached assets.
        await saveCachedAssets(secondContentHash, secondContentFolderName, secondContentDependencies);
        await saveCachedAssets(thirdContentHash, thirdContentFolderName, thirdContentDependencies);

        entries = Object.values(cachedAssetsRecords);
        expect(entries.length).toEqual(5);

        // Check that deleting cached assets for a library also deletes them for all libraries sharing any of the cached assets.
        // Only the MultiChoice library should remain because it doesn't share any cached assets with QuestionSet.
        await framework.deleteCachedAssets(LIBRARIES['H5P.QuestionSet'].libraryId, SITE_ID);

        entries = Object.values(cachedAssetsRecords);
        expect(entries.length).toEqual(1);
        expect(entries[0].libraryid).toEqual(LIBRARIES['H5P.MultiChoice'].libraryId);
    });

});
