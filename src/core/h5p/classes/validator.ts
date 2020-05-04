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

import { CoreFile, CoreFileProvider } from '@providers/file';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreH5PCore } from './core';

/**
 * Equivalent to H5P's H5PValidator class.
 */
export class CoreH5PValidator {

    /**
     * Get library data.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param libDir Directory where the library files are.
     * @param libPath Path to the directory where the library files are.
     * @return Promise resolved with library data.
     */
    protected async getLibraryData(libDir: DirectoryEntry, libPath: string): Promise<any> {

        // Read the required files.
        const results = await Promise.all([
            this.readLibraryJsonFile(libPath),
            this.readLibrarySemanticsFile(libPath),
            this.readLibraryLanguageFiles(libPath),
            this.libraryHasIcon(libPath),
        ]);

        const libraryData = results[0];
        libraryData.semantics = results[1];
        libraryData.language = results[2];
        libraryData.hasIcon = results[3];

        return libraryData;
    }

    /**
     * Get library data for all libraries in an H5P package.
     *
     * @param packagePath The path to the package folder.
     * @param entries List of files and directories in the root of the package folder.
     * @retun Promise resolved with the libraries data.
     */
    protected async getPackageLibrariesData(packagePath: string, entries: (DirectoryEntry | FileEntry)[])
            : Promise<{[libString: string]: any}> {

        const libraries: {[libString: string]: any} = {};

        await Promise.all(entries.map(async (entry) => {
            if (entry.name[0] == '.' || entry.name[0] == '_' || entry.name == 'content' || entry.isFile) {
                // Skip files, the content folder and any folder starting with a . or _.
                return;
            }

            const libDirPath = CoreTextUtils.instance.concatenatePaths(packagePath, entry.name);

            const libraryData = await this.getLibraryData(<DirectoryEntry> entry, libDirPath);

            libraryData.uploadDirectory = libDirPath;
            libraries[CoreH5PCore.libraryToString(libraryData)] = libraryData;
        }));

        return libraries;
    }

    /**
     * Check if the library has an icon file.
     *
     * @param libPath Path to the directory where the library files are.
     * @return Promise resolved with boolean: whether the library has an icon file.
     */
    protected async libraryHasIcon(libPath: string): Promise<boolean> {
        const path = CoreTextUtils.instance.concatenatePaths(libPath, 'icon.svg');

        try {
            // Check if the file exists.
            await CoreFile.instance.getFile(path);

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Process libraries from an H5P library, getting the required data to save them.
     * This code is inspired on the isValidPackage function in Moodle's H5PValidator.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param packagePath The path to the package folder.
     * @param entries List of files and directories in the root of the package folder.
     * @return Promise resolved when done.
     */
    async processH5PFiles(packagePath: string, entries: (DirectoryEntry | FileEntry)[]): Promise<CoreH5PMainJSONFilesData> {

        // Read the needed files.
        const results = await Promise.all([
            this.readH5PJsonFile(packagePath),
            this.readH5PContentJsonFile(packagePath),
            this.getPackageLibrariesData(packagePath, entries),
        ]);

        return {
            librariesJsonData: results[2],
            mainJsonData: results[0],
            contentJsonData: results[1],
        };

    }

    /**
     * Read content.json file and return its parsed contents.
     *
     * @param packagePath The path to the package folder.
     * @return Promise resolved with the parsed file contents.
     */
    protected readH5PContentJsonFile(packagePath: string): Promise<any> {
        const path = CoreTextUtils.instance.concatenatePaths(packagePath, 'content/content.json');

        return CoreFile.instance.readFile(path, CoreFileProvider.FORMATJSON);
    }

    /**
     * Read h5p.json file and return its parsed contents.
     *
     * @param packagePath The path to the package folder.
     * @return Promise resolved with the parsed file contents.
     */
    protected readH5PJsonFile(packagePath: string): Promise<any> {
        const path = CoreTextUtils.instance.concatenatePaths(packagePath, 'h5p.json');

        return CoreFile.instance.readFile(path, CoreFileProvider.FORMATJSON);
    }

    /**
     * Read library.json file and return its parsed contents.
     *
     * @param libPath Path to the directory where the library files are.
     * @return Promise resolved with the parsed file contents.
     */
    protected readLibraryJsonFile(libPath: string): Promise<any> {
        const path = CoreTextUtils.instance.concatenatePaths(libPath, 'library.json');

        return CoreFile.instance.readFile(path, CoreFileProvider.FORMATJSON);
    }

    /**
     * Read all language files and return their contents indexed by language code.
     *
     * @param libPath Path to the directory where the library files are.
     * @return Promise resolved with the language data.
     */
    protected async readLibraryLanguageFiles(libPath: string): Promise<{[code: string]: any}> {
        try {
            const path = CoreTextUtils.instance.concatenatePaths(libPath, 'language');
            const langIndex: {[code: string]: any} = {};

            // Read all the files in the language directory.
            const entries = await CoreFile.instance.getDirectoryContents(path);

            await Promise.all(entries.map(async (entry) => {
                const langFilePath = CoreTextUtils.instance.concatenatePaths(path, entry.name);

                try {
                    const langFileData = await CoreFile.instance.readFile(langFilePath, CoreFileProvider.FORMATJSON);

                    const parts = entry.name.split('.'); // The language code is in parts[0].
                    langIndex[parts[0]] = langFileData;
                } catch (error) {
                    // Ignore this language.
                }
            }));

            return langIndex;

        } catch (error) {
            // Probably doesn't exist, ignore.
        }
    }

    /**
     * Read semantics.json file and return its parsed contents.
     *
     * @param libPath Path to the directory where the library files are.
     * @return Promise resolved with the parsed file contents.
     */
    protected async readLibrarySemanticsFile(libPath: string): Promise<any> {
        try {
            const path = CoreTextUtils.instance.concatenatePaths(libPath, 'semantics.json');

            const result = await CoreFile.instance.readFile(path, CoreFileProvider.FORMATJSON);

            return result;
        } catch (error) {
            // Probably doesn't exist, ignore.
        }
    }
}

/**
 * Data of the main JSON H5P files.
 */
export type CoreH5PMainJSONFilesData = {
    contentJsonData: any; // Contents of content.json file.
    librariesJsonData: {[libString: string]: any}; // Some data about each library.
    mainJsonData: any; // Contents of h5p.json file.
};
