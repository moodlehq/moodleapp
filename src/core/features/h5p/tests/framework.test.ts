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
import { CoreH5PFramework } from '../classes/framework';
import { CoreH5PLibraryCachedAssetsDBRecord } from '../services/database/h5p';

describe('CoreH5PFramework', () => {

    const LIBRARIES = {
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

    let framework: CoreH5PFramework;
    beforeEach(() => {
        framework = mock(new CoreH5PFramework(), {
            librariesCachedAssetsTables: {
                [SITE_ID]: {
                    getMany: (conditions) =>
                        Object.values(cachedAssetsRecords).filter((record) => record.libraryid === conditions.libraryid),
                    insert: (record) => {
                        cachedAssetsRecords[cachedAssetsLastId++] = record;
                    },
                    deleteWhere: (conditions) => {
                        Object.entries(cachedAssetsRecords).forEach(([primaryKey, record]) => {
                            if (!conditions.js(record)) {
                                return;
                            }

                            delete cachedAssetsRecords[primaryKey];
                        });
                    },
                },
            },
        });
    });

    it('correctly saves and deletes cached assets in DB', async () => {
        const saveCachedAssets = async (hash, folderName, librariesNames) => {
            const dependencies = {};
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
