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
import { CoreSites } from '@providers/sites';
import { CoreMimetypeUtils } from '@providers/utils/mimetype';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreUtils } from '@providers/utils/utils';
import { CoreUser } from '@core/user/providers/user';
import { CoreH5P } from '../providers/h5p';
import { CoreH5PCore, CoreH5PDisplayOptions } from './core';
import { FileEntry } from '@ionic-native/file';
import { Translate } from '@singletons/core.singletons';

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
        const config: any = {};
        const displayOptionsObject = CoreH5P.instance.h5pCore.getDisplayOptionsAsObject(displayOptions);

        config.export = false; // Don't allow downloading in the app.
        config.embed = CoreUtils.instance.notNullOrUndefined(displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_EMBED]) ?
                displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_EMBED] : false;
        config.copyright = CoreUtils.instance.notNullOrUndefined(displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT]) ?
                displayOptionsObject[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] : false;

        return config;
    }

    /**
     * Get the core H5P assets, including all core H5P JavaScript and CSS.
     *
     * @return Array core H5P assets.
     */
    static async getCoreAssets(siteId?: string): Promise<{settings: any, cssRequires: string[], jsRequires: string[]}> {

        // Get core settings.
        const settings = await CoreH5PHelper.getCoreSettings(siteId);

        settings.core = {
            styles: [],
            scripts: []
        };
        settings.loadedJs = [];
        settings.loadedCss = [];

        const libUrl = CoreH5P.instance.h5pCore.h5pFS.getCoreH5PPath();
        const cssRequires: string[] = [];
        const jsRequires: string[] = [];

        // Add core stylesheets.
        CoreH5PCore.STYLES.forEach((style) => {
            settings.core.styles.push(libUrl + style);
            cssRequires.push(libUrl + style);
        });

        // Add core JavaScript.
        CoreH5PCore.getScripts().forEach((script) => {
            settings.core.scripts.push(script);
            jsRequires.push(script);
        });

        return {settings: settings, cssRequires: cssRequires, jsRequires: jsRequires};
    }

    /**
     * Get the settings needed by the H5P library.
     *
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the settings.
     */
    static async getCoreSettings(siteId?: string): Promise<any> {

        const site = await CoreSites.instance.getSite(siteId);
        let user;

        try {
            user = await CoreUser.instance.getProfile(site.getUserId(), undefined, false, siteId);
        } catch (error) {
            // Ignore errors.
        }

        if (!user || !user.email) {
            throw Translate.instance.instant('core.h5p.errorgetemail');
        }

        const basePath = CoreFile.instance.getBasePathInstant();
        const ajaxPaths = {
            xAPIResult: '',
            contentUserData: '',
        };

        return {
            baseUrl: CoreFile.instance.getWWWPath(),
            url: CoreFile.instance.convertFileSrc(CoreTextUtils.instance.concatenatePaths(
                    basePath, CoreH5P.instance.h5pCore.h5pFS.getExternalH5PFolderPath(site.getId()))),
            urlLibraries: CoreFile.instance.convertFileSrc(CoreTextUtils.instance.concatenatePaths(
                    basePath, CoreH5P.instance.h5pCore.h5pFS.getLibrariesFolderPath(site.getId()))),
            postUserStatistics: false,
            ajax: ajaxPaths,
            saveFreq: false,
            siteUrl: site.getURL(),
            l10n: {
                H5P: CoreH5P.instance.h5pCore.getLocalization(),
            },
            user: {name: site.getInfo().fullname, mail: user.email},
            hubIsEnabled: false,
            reportingIsEnabled: false,
            crossorigin: null,
            libraryConfig: null,
            pluginCacheBuster: '',
            libraryUrl: CoreTextUtils.instance.concatenatePaths(CoreH5P.instance.h5pCore.h5pFS.getCoreH5PPath(), 'js'),
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
    static async saveH5P(fileUrl: string, file: FileEntry, siteId?: string, onProgress?: (event: any) => any): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        // Notify that the unzip is starting.
        onProgress && onProgress({message: 'core.unzipping'});

        const queueId = siteId + ':saveH5P:' + fileUrl;

        await CoreH5P.instance.queueRunner.run(queueId, () => CoreH5PHelper.performSave(fileUrl, file, siteId, onProgress));
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
    protected static async performSave(fileUrl: string, file: FileEntry, siteId?: string, onProgress?: (event: any) => any)
            : Promise<void> {

        const folderName = CoreMimetypeUtils.instance.removeExtension(file.name);
        const destFolder = CoreTextUtils.instance.concatenatePaths(CoreFileProvider.TMPFOLDER, 'h5p/' + folderName);

        // Unzip the file.
        await CoreFile.instance.unzipFile(file.toURL(), destFolder, onProgress);

        try {
            // Notify that the unzip is starting.
            onProgress && onProgress({message: 'core.storingfiles'});

            // Read the contents of the unzipped dir, process them and store them.
            const contents = await CoreFile.instance.getDirectoryContents(destFolder);

            const filesData = await CoreH5P.instance.h5pValidator.processH5PFiles(destFolder, contents);

            const content = await CoreH5P.instance.h5pStorage.savePackage(filesData, folderName, fileUrl, false, siteId);

            // Create the content player.
            const contentData = await CoreH5P.instance.h5pCore.loadContent(content.id, undefined, siteId);

            const embedType = CoreH5PCore.determineEmbedType(contentData.embedType, contentData.library.embedTypes);

            await CoreH5P.instance.h5pPlayer.createContentIndex(content.id, fileUrl, contentData, embedType, siteId);
        } finally {
            // Remove tmp folder.
            try {
                await CoreFile.instance.removeDir(destFolder);
            } catch (error) {
                // Ignore errors, it will be deleted eventually.
            }
        }
    }
}
