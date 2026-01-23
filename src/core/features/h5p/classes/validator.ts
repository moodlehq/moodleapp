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

import { CoreH5PMissingDependenciesError } from './errors/missing-dependencies-error';
import { FileEntry, DirectoryEntry } from '@awesome-cordova-plugins/file/ngx';
import { CoreFile, CoreFileFormat } from '@services/file';
import { Translate } from '@singletons';
import { CorePath } from '@singletons/path';
import { CoreH5PSemantics } from './content-validator';
import { CoreH5PCore, CoreH5PLibraryBasicData, CoreH5PMissingLibrary } from './core';
import { CoreH5PFramework } from './framework';

/**
 * Equivalent to H5P's H5PValidator class.
 */
export class CoreH5PValidator {

    constructor(public h5pFramework: CoreH5PFramework) {
    }

    /**
     * Get all editor dependencies of the package.
     *
     * @param mainJsonData Contents of h5p.json file.
     * @param librariesJsonData JSON data about each library.
     * @returns Set with the editor dependencies names.
     */
    protected getAllEditorDependencies(
        mainJsonData: CoreH5PMainJSONData,
        librariesJsonData: CoreH5PLibrariesJsonData,
    ): Set<string> {
        const editorDependencies = new Set<string>();

        // Function to add or remove an editor dependency to the Set.
        const addOrRemoveEditorDependency = (library: CoreH5PLibraryBasicData, add = true) => {
            const libString = CoreH5PCore.libraryToString(library);
            if ((add && editorDependencies.has(libString)) || (!add && !editorDependencies.has(libString))) {
                // Already treated, ignore.
                return;
            }

            if (add) {
                editorDependencies.add(libString);
            } else {
                editorDependencies.delete(libString);
            }

            const libraryData = librariesJsonData[libString];
            (libraryData?.preloadedDependencies ?? []).concat(libraryData?.dynamicDependencies ?? []).forEach((dependency) => {
                if (!add) {
                    // Remove all dependencies too.
                    addOrRemoveEditorDependency(dependency, add);
                } else if (dependency.machineName.startsWith('H5PEditor.')) {
                    // Consider all dependencies that begin with H5PEditor as editor dependencies.
                    // It might be safe to consider all dependencies of an editor dependency as editor dependency too,
                    // but for now we decided to take a less aggressive approach.
                    addOrRemoveEditorDependency(dependency, add);
                }
            });
        };

        // First add all editor dependencies and some of their dependencies to the list.
        Object.values(librariesJsonData).forEach((libraryData) => {
            libraryData.editorDependencies?.forEach(library => {
                addOrRemoveEditorDependency(library, true);
            });
        });

        // Now remove from the Set all the libraries that are listed as a preloaded/dynamic dependency of a non-editor library.
        mainJsonData.preloadedDependencies?.forEach((dependency) => {
            addOrRemoveEditorDependency(dependency, false);
        });

        Object.keys(librariesJsonData).forEach((libString) => {
            if (editorDependencies.has(libString)) {
                return;
            }

            const libraryData = librariesJsonData[libString];
            (libraryData?.preloadedDependencies ?? []).concat(libraryData?.dynamicDependencies ?? []).forEach((dependency) => {
                addOrRemoveEditorDependency(dependency, false);
            });
        });

        return editorDependencies;
    }

    /**
     * Get library data.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param libDir Directory where the library files are.
     * @param libPath Path to the directory where the library files are.
     * @returns Promise resolved with library data.
     */
    protected async getLibraryData(libDir: DirectoryEntry, libPath: string): Promise<CoreH5PLibraryJsonData> {

        // Read the required files.
        const results = await Promise.all([
            this.readLibraryJsonFile(libPath),
            this.readLibrarySemanticsFile(libPath),
            this.readLibraryLanguageFiles(libPath),
            this.libraryHasIcon(libPath),
        ]);

        const libraryData: CoreH5PLibraryJsonData = results[0];
        libraryData.semantics = results[1];
        libraryData.language = results[2];
        libraryData.hasIcon = results[3];

        return libraryData;
    }

    /**
     * Use the dependency declarations to find any missing libraries.
     *
     * @param libraries Libraries to check.
     * @returns Promise resolved with the missing dependencies.
     */
    protected getMissingLibraries(libraries: CoreH5PLibrariesJsonData): Record<string, CoreH5PMissingLibrary> {
        const missing: Record<string, CoreH5PMissingLibrary> = {};

        Object.values(libraries).forEach((library) => {
            if (library.preloadedDependencies !== undefined) {
                Object.assign(missing, this.getMissingDependencies(library.preloadedDependencies, library, libraries));
            }
            if (library.dynamicDependencies !== undefined) {
                Object.assign(missing, this.getMissingDependencies(library.dynamicDependencies, library, libraries));
            }
            // No need to check editorDependencies, they are not used in the app.
        });

        return missing;
    }

    /**
     * Helper function for getMissingLibraries, searches for dependency required libraries in the provided list of libraries.
     *
     * @param dependencies Dependencies to check.
     * @param library Library that has these dependencies.
     * @param libraries Libraries.
     * @returns Promise resolved with missing dependencies.
     */
    protected getMissingDependencies(
        dependencies: CoreH5PLibraryBasicData[],
        library: CoreH5PLibraryJsonData,
        libraries: CoreH5PLibrariesJsonData,
    ): Record<string, CoreH5PLibraryBasicData> {
        const missing: Record<string, CoreH5PMissingLibrary> = {};

        dependencies.forEach((dependency) => {
            const libString  = CoreH5PCore.libraryToString(dependency);
            if (!libraries[libString]) {
                missing[libString] = Object.assign(dependency, {
                    libString: CoreH5PCore.libraryToString(library),
                });
            }
        });

        return missing;
    }

    /**
     * Get library data for all libraries in an H5P package.
     *
     * @param packagePath The path to the package folder.
     * @param entries List of files and directories in the root of the package folder.
     * @returns Promise resolved with the libraries data.
     */
    protected async getPackageLibrariesData(
        packagePath: string,
        entries: (DirectoryEntry | FileEntry)[],
    ): Promise<CoreH5PLibrariesJsonData> {

        const libraries: CoreH5PLibrariesJsonData = {};

        await Promise.all(entries.map(async (entry) => {
            if (entry.name[0] == '.' || entry.name[0] == '_' || entry.name == 'content' || entry.isFile) {
                // Skip files, the content folder and any folder starting with a . or _.
                return;
            }

            const libDirPath = CorePath.concatenatePaths(packagePath, entry.name);

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
     * @returns Promise resolved with boolean: whether the library has an icon file.
     */
    protected async libraryHasIcon(libPath: string): Promise<boolean> {
        const path = CorePath.concatenatePaths(libPath, 'icon.svg');

        try {
            // Check if the file exists.
            await CoreFile.getFile(path);

            return true;
        } catch {
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
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async processH5PFiles(
        packagePath: string,
        entries: (DirectoryEntry | FileEntry)[],
        siteId?: string,
    ): Promise<CoreH5PMainJSONFilesData> {

        // Read the needed files.
        const [mainJsonData, contentJsonData, librariesJsonData] = await Promise.all([
            this.readH5PJsonFile(packagePath),
            this.readH5PContentJsonFile(packagePath),
            this.getPackageLibrariesData(packagePath, entries),
        ]);

        // Remove editor dependencies from the list of libraries to install.
        const editorDependencies = this.getAllEditorDependencies(mainJsonData, librariesJsonData);
        editorDependencies.forEach((libString) => {
            delete librariesJsonData[libString];
        });

        // Check if there are missing libraries.
        const missingLibraries = this.getMissingLibraries(librariesJsonData);

        // Check if the missing libraries are already installed in the app.
        await Promise.all(Object.keys(missingLibraries).map(async (libString) => {
            const dependency = missingLibraries[libString];
            const dependencyId = await this.h5pFramework.getLibraryIdByData(dependency, siteId);

            if (dependencyId) {
                // Lib is installed.
                delete missingLibraries[libString];
            }
        }));

        if (Object.keys(missingLibraries).length > 0) {
            // Missing library, throw error.
            const libString = Object.keys(missingLibraries)[0];
            const missingLibrary = missingLibraries[libString];

            throw new CoreH5PMissingDependenciesError(Translate.instant('core.h5p.missingdependency', { $a: {
                lib: missingLibrary.libString,
                dep: libString,
            } }), Object.values(missingLibraries));
        }

        return { librariesJsonData, mainJsonData, contentJsonData };

    }

    /**
     * Read content.json file and return its parsed contents.
     *
     * @param packagePath The path to the package folder.
     * @returns Promise resolved with the parsed file contents.
     */
    protected readH5PContentJsonFile(packagePath: string): Promise<unknown> {
        const path = CorePath.concatenatePaths(packagePath, 'content/content.json');

        return CoreFile.readFile(path, CoreFileFormat.FORMATJSON);
    }

    /**
     * Read h5p.json file and return its parsed contents.
     *
     * @param packagePath The path to the package folder.
     * @returns Promise resolved with the parsed file contents.
     */
    protected readH5PJsonFile(packagePath: string): Promise<CoreH5PMainJSONData> {
        const path = CorePath.concatenatePaths(packagePath, 'h5p.json');

        return CoreFile.readFile(path, CoreFileFormat.FORMATJSON);
    }

    /**
     * Read library.json file and return its parsed contents.
     *
     * @param libPath Path to the directory where the library files are.
     * @returns Promise resolved with the parsed file contents.
     */
    protected readLibraryJsonFile(libPath: string): Promise<CoreH5PLibraryMainJsonData> {
        const path = CorePath.concatenatePaths(libPath, 'library.json');

        return CoreFile.readFile<CoreH5PLibraryMainJsonData>(path, CoreFileFormat.FORMATJSON);
    }

    /**
     * Read all language files and return their contents indexed by language code.
     *
     * @param libPath Path to the directory where the library files are.
     * @returns Promise resolved with the language data.
     */
    protected async readLibraryLanguageFiles(libPath: string): Promise<CoreH5PLibraryLangsJsonData | undefined> {
        try {
            const path = CorePath.concatenatePaths(libPath, 'language');
            const langIndex: CoreH5PLibraryLangsJsonData = {};

            // Read all the files in the language directory.
            const entries = await CoreFile.getDirectoryContents(path);

            await Promise.all(entries.map(async (entry) => {
                const langFilePath = CorePath.concatenatePaths(path, entry.name);

                try {
                    const langFileData = await CoreFile.readFile<CoreH5PLibraryLangJsonData>(
                        langFilePath,
                        CoreFileFormat.FORMATJSON,
                    );

                    const parts = entry.name.split('.'); // The language code is in parts[0].
                    langIndex[parts[0]] = langFileData;
                } catch {
                    // Ignore this language.
                }
            }));

            return langIndex;

        } catch {
            // Probably doesn't exist, ignore.
        }
    }

    /**
     * Read semantics.json file and return its parsed contents.
     *
     * @param libPath Path to the directory where the library files are.
     * @returns Promise resolved with the parsed file contents.
     */
    protected async readLibrarySemanticsFile(libPath: string): Promise<CoreH5PSemantics[] | undefined> {
        try {
            const path = CorePath.concatenatePaths(libPath, 'semantics.json');

            return await CoreFile.readFile<CoreH5PSemantics[]>(path, CoreFileFormat.FORMATJSON);
        } catch {
            // Probably doesn't exist, ignore.
        }
    }

}

/**
 * Data of the main JSON H5P files.
 */
export type CoreH5PMainJSONFilesData = {
    contentJsonData: unknown; // Contents of content.json file.
    librariesJsonData: CoreH5PLibrariesJsonData; // JSON data about each library.
    mainJsonData: CoreH5PMainJSONData; // Contents of h5p.json file.
};

/**
 * Data stored in h5p.json file of a content. More info in https://h5p.org/documentation/developers/json-file-definitions
 */
export type CoreH5PMainJSONData = {
    title: string; // Title of the content.
    mainLibrary: string; // The main H5P library for this content.
    language: string; // Language code.
    preloadedDependencies?: CoreH5PLibraryBasicData[]; // Dependencies.
    embedTypes?: ('div' | 'iframe')[]; // List of possible ways to embed the package in the page.
    authors?: { // The name and role of the content authors
        name: string;
        role: string;
    }[];
    source?: string; // The source (a URL) of the licensed material.
    license?: string; // A code for the content license.
    licenseVersion?: string; // The version of the license above as a string.
    licenseExtras?: string; // Any additional information about the license.
    yearFrom?: string; // If a license is valid for a certain period of time, this represents the start year (as a string).
    yearTo?: string; // If a license is valid for a certain period of time, this represents the end year (as a string).
    changes?: { // The changelog.
        date: string;
        author: string;
        log: string;
    }[];
    authorComments?: string; // Comments for the editor of the content.
};

/**
 * All JSON data for libraries of a package.
 */
export type CoreH5PLibrariesJsonData = { [libString: string]: CoreH5PLibraryJsonData };

/**
 * All JSON data for a library, including semantics and language.
 */
export type CoreH5PLibraryJsonData = CoreH5PLibraryMainJsonData & {
    semantics?: CoreH5PSemantics[]; // Data in semantics.json.
    language?: CoreH5PLibraryLangsJsonData; // Language JSON data.
    hasIcon?: boolean; // Whether the library has an icon.
    uploadDirectory?: string; // Path where the lib is stored.
};

/**
 * Data stored in library.json file of a library. More info in https://h5p.org/library-definition
 */
export type CoreH5PLibraryMainJsonData = {
    title: string; // The human readable name of this library.
    machineName: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
    patchVersion: number; // Patch version.
    runnable: number; // Whether or not this library is runnable.
    coreApi?: { // Required version of H5P Core API.
        majorVersion: number;
        minorVersion: number;
    };
    author?: string; // The name of the library author.
    license?: string; // A code for the content license.
    description?: string; // Textual description of the library.
    preloadedDependencies?: CoreH5PLibraryBasicData[]; // Dependencies.
    dynamicDependencies?: CoreH5PLibraryBasicData[]; // Dependencies.
    editorDependencies?: CoreH5PLibraryBasicData[]; // Dependencies.
    preloadedJs?: { path: string }[]; // List of path to the javascript files required for the library.
    preloadedCss?: { path: string }[]; // List of path to the CSS files to be loaded with the library.
    embedTypes?: ('div' | 'iframe')[]; // List of possible ways to embed the package in the page.
    fullscreen?: number; // Enables the integrated full-screen button.
    metadataSettings?: CoreH5PLibraryMetadataSettings; // Metadata settings.
    addTo?: CoreH5PLibraryAddTo;
};

/**
 * Library metadata settings.
 */
export type CoreH5PLibraryMetadataSettings = {
    disable?: boolean | number;
    disableExtraTitleField?: boolean | number;
};

/**
 * Library plugin configuration data.
 */
export type CoreH5PLibraryAddTo = {
    content?: {
        types?: {
            text?: {
                regex?: string;
            };
        }[];
    };
};

/**
 * Data stored in all languages JSON file of a library.
 */
export type CoreH5PLibraryLangsJsonData = { [code: string]: CoreH5PLibraryLangJsonData };

/**
 * Data stored in each language JSON file of a library.
 */
export type CoreH5PLibraryLangJsonData = {
    semantics?: CoreH5PSemantics[];
};
