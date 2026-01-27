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

import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { CoreH5P } from '../services/h5p';
import { CoreH5PCore, CoreH5PDisplayOptions, CoreH5PContentData, CoreH5PDependenciesFiles } from './core';
import { CoreH5PCoreSettings, CoreH5PHelper } from './helper';
import { CoreH5PStorage } from './storage';
import { CorePath } from '@singletons/path';
import { CoreXAPIIRI } from '@features/xapi/classes/iri';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Equivalent to Moodle's H5P player class.
 */
export class CoreH5PPlayer {

    constructor(
        protected h5pCore: CoreH5PCore,
        protected h5pStorage: CoreH5PStorage,
    ) { }

    /**
     * Calculate the URL to the site H5P player.
     *
     * @param siteUrl Site URL.
     * @param fileUrl File URL.
     * @param displayOptions Display options.
     * @param component Component to send xAPI events to.
     * @returns URL.
     */
    calculateOnlinePlayerUrl(siteUrl: string, fileUrl: string, displayOptions?: CoreH5PDisplayOptions, component?: string): string {
        fileUrl = CoreH5P.treatH5PUrl(fileUrl, siteUrl);

        const params = this.getUrlParamsFromDisplayOptions(displayOptions);
        params.url = encodeURIComponent(fileUrl);
        if (component) {
            params.component = component;
        }

        return CoreUrl.addParamsToUrl(CorePath.concatenatePaths(siteUrl, '/h5p/embed.php'), params);
    }

    /**
     * Create the index.html to render an H5P package.
     * Part of the code of this function is equivalent to Moodle's add_assets_to_page function.
     *
     * @param id Content ID.
     * @param h5pUrl The URL of the H5P file.
     * @param content Content data.
     * @param embedType Embed type. The app will always use 'iframe'.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the URL of the index file.
     */
    async createContentIndex(
        id: number,
        h5pUrl: string,
        content: CoreH5PContentData,
        embedType: string,
        siteId?: string,
    ): Promise<string> {

        const site = await CoreSites.getSite(siteId);

        const contentId = this.getContentId(id);
        const basePath = CoreFile.getBasePathInstant();
        const contentUrl = CoreFile.convertFileSrc(
            CorePath.concatenatePaths(
                basePath,
                this.h5pCore.h5pFS.getContentFolderPath(content.folderName, site.getId()),
            ),
        );

        // Create the settings needed for the content.
        const contentSettings = {
            library: CoreH5PCore.libraryToString(content.library),
            fullScreen: content.library.fullscreen,
            exportUrl: '', // We'll never display the download button, so we don't need the exportUrl.
            embedCode: this.getEmbedCode(site.getURL(), h5pUrl, true),
            resizeCode: this.getResizeCode(),
            title: content.slug,
            displayOptions: {},
            url: '', // It will be filled using dynamic params if needed.
            contentUrl: contentUrl,
            metadata: content.metadata,
            contentUserData: [
                {
                    state: '{}', // state will be overridden in params.js to use the latest state when the package is played.
                },
            ],
        };

        // Get the core H5P assets, needed by the H5P classes to render the H5P content.
        const result = await this.getAssets(id, content, embedType, site.getId());

        result.settings.contents[contentId] = Object.assign(result.settings.contents[contentId], contentSettings);

        const indexPath = this.h5pCore.h5pFS.getContentIndexPath(content.folderName, site.getId());
        let html = '<html><head><title>' + content.title + '</title>' +
                '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">';

        // Include the required CSS.
        result.cssRequires.forEach((cssUrl) => {
            html += '<link rel="stylesheet" type="text/css" href="' + cssUrl + '">';
        });

        // Add the settings.
        html += '<script type="text/javascript">var H5PIntegration = ' +
                JSON.stringify(result.settings).replace(/\//g, '\\/') + '</script>';

        // Add our own script to handle the params.
        html += '<script type="text/javascript" src="' + CorePath.concatenatePaths(
            this.h5pCore.h5pFS.getCoreH5PPath(),
            'moodle/js/params.js',
        ) + '"></script>';

        html += '</head><body>';

        // Include the required JS at the beginning of the body, like Moodle web does.
        // Load the embed.js to allow communication with the parent window.
        html += '<script type="text/javascript" src="' +
                CorePath.concatenatePaths(this.h5pCore.h5pFS.getCoreH5PPath(), 'moodle/js/embed.js') + '"></script>';

        result.jsRequires.forEach((jsUrl) => {
            html += '<script type="text/javascript" src="' + jsUrl + '"></script>';
        });

        html += `<div class="h5p-iframe-wrapper">
        <iframe id="h5p-iframe-${id}" class="h5p-iframe" data-content-id="${id}"
            style="height:1px; min-width: 100%" src="about:blank">
        </iframe></div></body>`;

        const fileEntry = await CoreFile.writeFile(indexPath, html);

        return CoreFile.getFileEntryURL(fileEntry);
    }

    /**
     * Delete all content indexes of all sites from filesystem.
     *
     * @returns Promise resolved when done.
     */
    async deleteAllContentIndexes(): Promise<void> {
        const siteIds = await CoreSites.getSitesIds();

        await Promise.all(siteIds.map((siteId) => this.deleteAllContentIndexesForSite(siteId)));
    }

    /**
     * Delete all content indexes for a certain site from filesystem.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteAllContentIndexesForSite(siteId?: string): Promise<void> {
        const siteIdentifier = siteId || CoreSites.getCurrentSiteId();

        if (!siteIdentifier) {
            return;
        }

        const records = await this.h5pCore.h5pFramework.getAllContentData(siteIdentifier);

        await Promise.all(records.map(async (record) => {
            await CorePromiseUtils.ignoreErrors(this.h5pCore.h5pFS.deleteContentIndex(record.foldername, siteIdentifier));
        }));
    }

    /**
     * Delete all package content data.
     *
     * @param fileUrl File URL.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteContentByUrl(fileUrl: string, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const data = await this.h5pCore.h5pFramework.getContentDataByUrl(fileUrl, siteId);

        await CorePromiseUtils.allPromises([
            this.h5pCore.h5pFramework.deleteContentData(data.id, siteId),

            this.h5pCore.h5pFS.deleteContentFolder(data.foldername, siteId),
        ]);
    }

    /**
     * Get the assets of a package.
     *
     * @param id Content id.
     * @param content Content data.
     * @param embedType Embed type.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the assets.
     */
    protected async getAssets(
        id: number,
        content: CoreH5PContentData,
        embedType: string,
        siteId?: string,
    ): Promise<{ settings: AssetsSettings; cssRequires: string[]; jsRequires: string[] }> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        // Get core assets.
        const coreAssets = await CoreH5PHelper.getCoreAssets(siteId);

        const contentId = this.getContentId(id);
        const settings = <AssetsSettings> coreAssets.settings;
        settings.contents = settings.contents || {};
        settings.contents[contentId] = settings.contents[contentId] || {};

        settings.moodleLibraryPaths = await this.h5pCore.getDependencyRoots(id);

        // The Moodle component is added dynamically using the params.js script instead of doing it here.

        /* The filterParameters function should be called before getting the dependency files because it rebuilds content
           dependency cache. */
        settings.contents[contentId].jsonContent = await this.h5pCore.filterParameters(content, siteId);

        const files = await this.getDependencyFiles(id, content.folderName, siteId);

        // H5P checks the embedType in here, but we'll always use iframe so there's no need to do it.
        // JavaScripts and stylesheets will be loaded through h5p.js.
        settings.contents[contentId].scripts = this.h5pCore.getAssetsUrls(files.scripts);
        settings.contents[contentId].styles = this.h5pCore.getAssetsUrls(files.styles);

        return {
            settings: settings,
            cssRequires: coreAssets.cssRequires,
            jsRequires: coreAssets.jsRequires,
        };
    }

    /**
     * Get the identifier for the H5P content. This identifier is different than the ID stored in the DB.
     *
     * @param id Package ID.
     * @returns Content identifier.
     */
    protected getContentId(id: number): string {
        return `cid-${id}`;
    }

    /**
     * Get the content index file.
     *
     * @param fileUrl URL of the H5P package.
     * @param displayOptions Display options.
     * @param component Component to send xAPI events to.
     * @param contextId Context ID where the H5P is. Required for tracking.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the file URL if exists, rejected otherwise.
     */
    async getContentIndexFileUrl(
        fileUrl: string,
        displayOptions?: CoreH5PDisplayOptions,
        component?: string,
        contextId?: number,
        siteId?: string,
        otherOptions: CoreH5PGetContentUrlOptions = {},
    ): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const path = await this.h5pCore.h5pFS.getContentIndexFileUrl(fileUrl, siteId);

        // Add display options and component to the URL.
        const data = await this.h5pCore.h5pFramework.getContentDataByUrl(fileUrl, siteId);

        displayOptions = this.h5pCore.fixDisplayOptions(displayOptions || {}, data.id);

        const params: Record<string, string | number> = {
            displayOptions: JSON.stringify(displayOptions),
            component: component || '',
        };

        if (contextId) {
            params.trackingUrl = await CoreXAPIIRI.generate(contextId, 'activity', siteId);
        }
        if (otherOptions.saveFreq !== undefined) {
            params.saveFreq = otherOptions.saveFreq;
        }
        if (otherOptions.state !== undefined) {
            params.state = otherOptions.state;
        }

        const customCssUrl = await CorePromiseUtils.ignoreErrors(CoreH5P.getCustomCssSrc(siteId));
        if (customCssUrl) {
            params.customCssUrl = customCssUrl;
        }

        return CoreUrl.addParamsToUrl(path, params);
    }

    /**
     * Finds library dependencies files of a certain package.
     *
     * @param id Content id.
     * @param folderName Name of the folder of the content.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    protected async getDependencyFiles(id: number, folderName: string, siteId?: string): Promise<CoreH5PDependenciesFiles> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const preloadedDeps = await CoreH5P.h5pCore.loadContentDependencies(id, 'preloaded', siteId);

        return this.h5pCore.getDependenciesFiles(
            preloadedDeps,
            folderName,
            this.h5pCore.h5pFS.getExternalH5PFolderPath(siteId),
            siteId,
        );
    }

    /**
     * Get display options from a URL params.
     *
     * @param params URL params.
     * @returns Display options as object.
     */
    getDisplayOptionsFromUrlParams(params?: { [name: string]: string }): CoreH5PDisplayOptions {
        const displayOptions: CoreH5PDisplayOptions = {};

        if (!params) {
            return displayOptions;
        }

        displayOptions[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] = false; // Never allow downloading in the app.
        displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED] = false; // Never show the embed option in the app.
        displayOptions[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] =
                CoreUtils.isTrueOrOne(params[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT]);
        displayOptions[CoreH5PCore.DISPLAY_OPTION_FRAME] = displayOptions[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] ||
                displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED] || displayOptions[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT];
        displayOptions[CoreH5PCore.DISPLAY_OPTION_ABOUT] =
                !!this.h5pCore.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_ABOUT, true);

        return displayOptions;
    }

    /**
     * Embed code for settings.
     *
     * @param siteUrl The site URL.
     * @param h5pUrl The URL of the .h5p file.
     * @param embedEnabled Whether the option to embed the H5P content is enabled.
     * @returns The HTML code to reuse this H5P content in a different place.
     */
    protected getEmbedCode(siteUrl: string, h5pUrl: string, embedEnabled?: boolean): string {
        if (!embedEnabled) {
            return '';
        }

        return `<iframe src="${this.getEmbedUrl(siteUrl, h5pUrl)}" allowfullscreen="allowfullscreen"></iframe>`;
    }

    /**
     * Get the encoded URL for embedding an H5P content.
     *
     * @param siteUrl The site URL.
     * @param h5pUrl The URL of the .h5p file.
     * @returns The embed URL.
     */
    protected getEmbedUrl(siteUrl: string, h5pUrl: string): string {
        return `${CorePath.concatenatePaths(siteUrl, '/h5p/embed.php')}?url=${h5pUrl}`;
    }

    /**
     * Resizing script for settings.
     *
     * @returns The HTML code with the resize script.
     */
    protected getResizeCode(): string {
        return `<script src="${this.getResizerScriptUrl()}"></script>`;
    }

    /**
     * Get the URL to the resizer script.
     *
     * @returns URL.
     */
    getResizerScriptUrl(): string {
        return CorePath.concatenatePaths(this.h5pCore.h5pFS.getCoreH5PPath(), 'js/h5p-resizer.js');
    }

    /**
     * Get online player URL params from display options.
     *
     * @param options Display options.
     * @returns Object with URL params.
     */
    getUrlParamsFromDisplayOptions(options?: CoreH5PDisplayOptions): { [name: string]: string } {
        const params: { [name: string]: string } = {};

        if (!options) {
            return params;
        }

        params[CoreH5PCore.DISPLAY_OPTION_FRAME] = options[CoreH5PCore.DISPLAY_OPTION_FRAME] ? '1' : '0';
        params[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] = options[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] ? '1' : '0';
        params[CoreH5PCore.DISPLAY_OPTION_EMBED] = options[CoreH5PCore.DISPLAY_OPTION_EMBED] ? '1' : '0';
        params[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] = options[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] ? '1' : '0';

        return params;
    }

}

type AssetsSettings = CoreH5PCoreSettings & {
    contents: {
        [contentId: string]: {
            jsonContent: string | null;
            scripts: string[];
            styles: string[];
        };
    };
    moodleLibraryPaths: {
        [libString: string]: string;
    };
};

export type CoreH5PGetContentUrlOptions = {
    saveFreq?: number; // State save frequency (if enabled).
    state?: string; // Current state.
};
