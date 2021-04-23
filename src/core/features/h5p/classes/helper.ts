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

import { FileEntry } from '@ionic-native/file/ngx';

import { CoreFile, CoreFileProvider } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreUser } from '@features/user/services/user';
import { CoreH5P } from '../services/h5p';
import { CoreH5PCore, CoreH5PDisplayOptions } from './core';
import { Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';

/**
 * Equivalent to Moodle's H5P helper class.
 */
export class CoreH5PHelper {

    /**
     * Convert the number representation of display options into an object.
     *
     * @param displayOptions Number representing display options.
     * @return Object with display options.
     */
    static decodeDisplayOptions(displayOptions: number): CoreH5PDisplayOptions {
        const displayOptionsObject = CoreH5P.h5pCore.getDisplayOptionsAsObject(displayOptions);

        const config: CoreH5PDisplayOptions = {
            export: false, // Don't allow downloading in the app.
            embed: false, // Don't display the embed button in the app.
            copyright: CoreUtils.notNullOrUndefined(displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT]) ?
                displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] : false,
            icon: CoreUtils.notNullOrUndefined(displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_ABOUT]) ?
                displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_ABOUT] : false,
        };

        config.frame = config.copyright || config.export || config.embed;

        return config;
    }

    /**
     * Get the core H5P assets, including all core H5P JavaScript and CSS.
     *
     * @return Array core H5P assets.
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
            settings.core!.styles.push(libUrl + style);
            cssRequires.push(libUrl + style);
        });

        // Add core JavaScript.
        CoreH5PCore.getScripts().forEach((script) => {
            settings.core!.scripts.push(script);
            jsRequires.push(script);
        });

        return { settings, cssRequires, jsRequires };
    }

    /**
     * Get the settings needed by the H5P library.
     *
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the settings.
     */
    static async getCoreSettings(siteId?: string): Promise<CoreH5PCoreSettings> {

        const site = await CoreSites.getSite(siteId);

        const userId = site.getUserId();
        const user = await CoreUtils.ignoreErrors(CoreUser.getProfile(userId, undefined, false, siteId));

        if (!user || !user.email) {
            throw new CoreError(Translate.instant('core.h5p.errorgetemail'));
        }

        const basePath = CoreFile.getBasePathInstant();
        const ajaxPaths = {
            xAPIResult: '',
            contentUserData: '',
        };

        return {
            baseUrl: CoreFile.getWWWPath(),
            url: CoreFile.convertFileSrc(
                CoreTextUtils.concatenatePaths(
                    basePath,
                    CoreH5P.h5pCore.h5pFS.getExternalH5PFolderPath(site.getId()),
                ),
            ),
            urlLibraries: CoreFile.convertFileSrc(
                CoreTextUtils.concatenatePaths(
                    basePath,
                    CoreH5P.h5pCore.h5pFS.getLibrariesFolderPath(site.getId()),
                ),
            ),
            postUserStatistics: false,
            ajax: ajaxPaths,
            saveFreq: false,
            siteUrl: site.getURL(),
            l10n: {
                H5P: CoreH5P.h5pCore.getLocalization(), // eslint-disable-line @typescript-eslint/naming-convention
            },
            user: { name: site.getInfo()!.fullname, mail: user.email },
            hubIsEnabled: false,
            reportingIsEnabled: false,
            crossorigin: null,
            libraryConfig: null,
            pluginCacheBuster: '',
            libraryUrl: CoreTextUtils.concatenatePaths(CoreH5P.h5pCore.h5pFS.getCoreH5PPath(), 'js'),
        };
    }

    /**
     * Extract and store an H5P file.
     * This function won't validate most things because it should've been done by the server already.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @param onProgress Function to call on progress.
     * @return Promise resolved when done.
     */
    static async saveH5P(fileUrl: string, file: FileEntry, siteId?: string, onProgress?: CoreH5PSaveOnProgress): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Notify that the unzip is starting.
        onProgress && onProgress({ message: 'core.unzipping' });

        const queueId = siteId + ':saveH5P:' + fileUrl;

        await CoreH5P.queueRunner.run(queueId, () => CoreH5PHelper.performSave(fileUrl, file, siteId, onProgress));
    }

    /**
     * Extract and store an H5P file.
     *
     * @param fileUrl The file URL used to download the file.
     * @param file The file entry of the downloaded file.
     * @param siteId Site ID. If not defined, current site.
     * @param onProgress Function to call on progress.
     * @return Promise resolved when done.
     */
    protected static async performSave(
        fileUrl: string,
        file: FileEntry,
        siteId?: string,
        onProgress?: CoreH5PSaveOnProgress,
    ): Promise<void> {

        const folderName = CoreMimetypeUtils.removeExtension(file.name);
        const destFolder = CoreTextUtils.concatenatePaths(CoreFileProvider.TMPFOLDER, 'h5p/' + folderName);

        // Unzip the file.
        await CoreFile.unzipFile(file.toURL(), destFolder, onProgress);

        try {
            // Notify that the unzip is starting.
            onProgress && onProgress({ message: 'core.storingfiles' });

            // Read the contents of the unzipped dir, process them and store them.
            const contents = await CoreFile.getDirectoryContents(destFolder);

            const filesData = await CoreH5P.h5pValidator.processH5PFiles(destFolder, contents);

            const content = await CoreH5P.h5pStorage.savePackage(filesData, folderName, fileUrl, false, siteId);

            // Create the content player.
            const contentData = await CoreH5P.h5pCore.loadContent(content.id, undefined, siteId);

            const embedType = CoreH5PCore.determineEmbedType(contentData.embedType, contentData.library.embedTypes);

            await CoreH5P.h5pPlayer.createContentIndex(content.id!, fileUrl, contentData, embedType, siteId);
        } finally {
            // Remove tmp folder.
            try {
                await CoreFile.removeDir(destFolder);
            } catch (error) {
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
        xAPIResult: string;
        contentUserData: string;
    };
    saveFreq: boolean;
    siteUrl: string;
    l10n: {
        H5P: {[name: string]: string}; // eslint-disable-line @typescript-eslint/naming-convention
    };
    user: {
        name: string;
        mail: string;
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

export type CoreH5PSaveOnProgress = (event?: ProgressEvent | { message: string }) => void;
