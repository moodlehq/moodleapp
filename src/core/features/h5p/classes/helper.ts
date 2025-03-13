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

import { FileEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreFile, CoreFileProvider } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreH5P } from '../services/h5p';
import { CoreH5PCore, CoreH5PDisplayOptions, CoreH5PLocalization } from './core';
import { CoreError } from '@classes/errors/error';
import { CorePath } from '@singletons/path';
import { CorePluginFileTreatDownloadedFileOptions } from '@services/plugin-file-delegate';
import { CoreH5PMissingDependenciesError } from './errors/missing-dependencies-error';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Equivalent to Moodle's H5P helper class.
 */
export class CoreH5PHelper {

    /**
     * Add the resizer script if it hasn't been added already.
     */
    static addResizerScript(): void {
        if (document.head.querySelector('#core-h5p-resizer-script') != null) {
            // Script already added, don't add it again.
            return;
        }

        const script = document.createElement('script');
        script.id = 'core-h5p-resizer-script';
        script.type = 'text/javascript';
        script.src = CoreH5P.h5pPlayer.getResizerScriptUrl();
        document.head.appendChild(script);
    }

    /**
     * Convert the number representation of display options into an object.
     *
     * @param displayOptions Number representing display options.
     * @returns Object with display options.
     */
    static decodeDisplayOptions(displayOptions: number): CoreH5PDisplayOptions {
        const displayOptionsObject = CoreH5P.h5pCore.getDisplayOptionsAsObject(displayOptions);

        const config: CoreH5PDisplayOptions = {
            export: false, // Don't allow downloading in the app.
            embed: false, // Don't display the embed button in the app.
            copyright: displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] ?? false,
            icon: displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_ABOUT] ?? false,
        };

        config.frame = config.copyright || config.export || config.embed;

        return config;
    }

    /**
     * Get the core H5P assets, including all core H5P JavaScript and CSS.
     *
     * @returns Array core H5P assets.
     */
    static async getCoreAssets(
        siteId?: string,
    ): Promise<{settings: CoreH5PCoreSettings; cssRequires: string[]; jsRequires: string[]}> {

        // Get core settings.
        const settings = await CoreH5PHelper.getCoreSettings(siteId);

        settings.core = {
            styles: [],
            scripts: [],
        };
        settings.loadedJs = [];
        settings.loadedCss = [];

        const libUrl = CoreH5P.h5pCore.h5pFS.getCoreH5PPath();
        const cssRequires: string[] = [];
        const jsRequires: string[] = [];

        // Add core stylesheets.
        CoreH5PCore.STYLES.forEach((style) => {
            settings.core?.styles.push(libUrl + style);
            cssRequires.push(libUrl + style);
        });

        // Add core JavaScript.
        CoreH5PCore.getScripts().forEach((script) => {
            settings.core?.scripts.push(script);
            jsRequires.push(script);
        });

        return { settings, cssRequires, jsRequires };
    }

    /**
     * Get the settings needed by the H5P library.
     *
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the settings.
     */
    static async getCoreSettings(siteId?: string): Promise<CoreH5PCoreSettings> {

        const site = await CoreSites.getSite(siteId);

        const info = site.getInfo();

        if (!info) {
            // Shouldn't happen for authenticated sites.
            throw new CoreError('Site info could not be fetched.');
        }

        // H5P doesn't currently support xAPI State. It implements a mechanism in contentUserDataAjax() in h5p.js to update user
        // data. However, in our case, we're overriding this method to call the xAPI State web services.
        const basePath = CoreFile.getBasePathInstant();
        const ajaxPaths = {
            contentUserData: '',
        };

        return {
            baseUrl: CoreFile.getWWWPath(),
            url: CoreFile.convertFileSrc(
                CorePath.concatenatePaths(
                    basePath,
                    CoreH5P.h5pCore.h5pFS.getExternalH5PFolderPath(site.getId()),
                ),
            ),
            urlLibraries: CoreFile.convertFileSrc(
                CorePath.concatenatePaths(
                    basePath,
                    CoreH5P.h5pCore.h5pFS.getLibrariesFolderPath(site.getId()),
                ),
            ),
            postUserStatistics: false,
            ajax: ajaxPaths,
            saveFreq: false, // saveFreq will be overridden in params.js.
            siteUrl: site.getURL(),
            l10n: {
                H5P: CoreH5P.h5pCore.getLocalization(), // eslint-disable-line @typescript-eslint/naming-convention
            },
            user: { name: info.username, id: info.userid },
            hubIsEnabled: false,
            reportingIsEnabled: false,
            crossorigin: null,
            libraryConfig: null,
            pluginCacheBuster: '',
            libraryUrl: CorePath.concatenatePaths(CoreH5P.h5pCore.h5pFS.getCoreH5PPath(), 'js'),
        };
    }

    /**
     * Extract and store an H5P file.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    static async saveH5P(
        fileUrl: string,
        file: FileEntry,
        options: CorePluginFileTreatDownloadedFileOptions<ProgressEvent | { message: string }> = {},
    ): Promise<void> {
        const siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Notify that the unzip is starting.
        options.onProgress && options.onProgress({ message: 'core.unzipping' });

        const queueId = `${siteId}:saveH5P:${fileUrl}`;

        await CoreH5P.queueRunner.run(queueId, () => CoreH5PHelper.performSave(fileUrl, file, { ...options, siteId }));
    }

    /**
     * Extract and store an H5P file.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    protected static async performSave(
        fileUrl: string,
        file: FileEntry,
        options: CorePluginFileTreatDownloadedFileOptions<ProgressEvent | { message: string }> = {},
    ): Promise<void> {

        const folderName = CoreMimetypeUtils.removeExtension(file.name);
        const destFolder = CorePath.concatenatePaths(CoreFileProvider.TMPFOLDER, `h5p/${folderName}`);

        // Unzip the file.
        await CoreFile.unzipFile(CoreFile.getFileEntryURL(file), destFolder, options.onProgress);

        try {
            // Notify that the unzip is starting.
            options.onProgress && options.onProgress({ message: 'core.storingfiles' });

            // Read the contents of the unzipped dir, process them and store them.
            const contents = await CoreFile.getDirectoryContents(destFolder);

            const filesData = await CoreH5P.h5pValidator.processH5PFiles(destFolder, contents, options.siteId);

            const content = await CoreH5P.h5pStorage.savePackage(filesData, folderName, fileUrl, false, options.siteId);

            // Create the content player.
            const contentData = await CoreH5P.h5pCore.loadContent(content.id, undefined, options.siteId);

            const embedType = CoreH5PCore.determineEmbedType(contentData.embedType, contentData.library.embedTypes);

            await CoreH5P.h5pPlayer.createContentIndex(content.id!, fileUrl, contentData, embedType, options.siteId);
        } catch (error) {
            if (error instanceof CoreH5PMissingDependenciesError) {
                // Store the missing dependencies to avoid re-downloading the file every time.
                await CorePromiseUtils.ignoreErrors(CoreH5P.h5pFramework.storeMissingDependencies(
                    fileUrl,
                    error.missingDependencies,
                    {
                        component: options.component,
                        componentId: options.componentId,
                        fileTimemodified: options.timemodified,
                        siteId: options.siteId,
                    },
                ));
            }

            throw error;
        } finally {
            // Remove tmp folder.
            try {
                await CoreFile.removeDir(destFolder);
            } catch {
                // Ignore errors, it will be deleted eventually.
            }
        }
    }

}

/**
 * Core settings for H5P.
 */
export type CoreH5PCoreSettings = {
    baseUrl: string;
    url: string;
    urlLibraries: string;
    postUserStatistics: boolean;
    ajax: {
        xAPIResult?: string;
        contentUserData: string;
    };
    saveFreq: boolean;
    siteUrl: string;
    l10n: {
        H5P: CoreH5PLocalization; // eslint-disable-line @typescript-eslint/naming-convention
    };
    user: {
        name: string;
        id?: number;
        mail?: string;
    };
    hubIsEnabled: boolean;
    reportingIsEnabled: boolean;
    crossorigin: null;
    libraryConfig: null;
    pluginCacheBuster: string;
    libraryUrl: string;
    core?: {
        styles: string[];
        scripts: string[];
    };
    loadedJs?: string[];
    loadedCss?: string[];
};
