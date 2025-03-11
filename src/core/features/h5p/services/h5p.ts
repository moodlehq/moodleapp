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

import { Injectable } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreWSExternalWarning, CoreWSExternalFile, CoreWSFile } from '@services/ws';
import { CoreUrl, CoreUrlPartNames } from '@singletons/url';
import { CoreQueueRunner } from '@classes/queue-runner';
import { CoreSite } from '@classes/sites/site';

import { CoreH5PCore } from '../classes/core';
import { CoreH5PFramework } from '../classes/framework';
import { CoreH5PPlayer } from '../classes/player';
import { CoreH5PStorage } from '../classes/storage';
import { CoreH5PValidator } from '../classes/validator';

import { makeSingleton } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CorePath } from '@singletons/path';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreFilepool } from '@services/filepool';
import { CoreCacheUpdateFrequency, DownloadStatus } from '@/core/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Service to provide H5P functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreH5PProvider {

    h5pCore: CoreH5PCore;
    h5pFramework: CoreH5PFramework;
    h5pPlayer: CoreH5PPlayer;
    h5pStorage: CoreH5PStorage;
    h5pValidator: CoreH5PValidator;
    queueRunner: CoreQueueRunner;

    protected static readonly ROOT_CACHE_KEY = 'CoreH5P:';
    protected static readonly CUSTOM_CSS_COMPONENT = 'CoreH5PCustomCSS';

    constructor() {
        this.queueRunner = new CoreQueueRunner(1);

        this.h5pFramework = new CoreH5PFramework();
        this.h5pValidator = new CoreH5PValidator(this.h5pFramework);
        this.h5pCore = new CoreH5PCore(this.h5pFramework);
        this.h5pStorage = new CoreH5PStorage(this.h5pCore, this.h5pFramework);
        this.h5pPlayer = new CoreH5PPlayer(this.h5pCore, this.h5pStorage);
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    async canGetTrustedH5PFile(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.canGetTrustedH5PFileInSite(site);
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @returns Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    canGetTrustedH5PFileInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!(site?.wsAvailable('core_h5p_get_trusted_h5p_file'));
    }

    /**
     * Get the src URL to load custom CSS styles for H5P.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Src URL, undefined if no custom CSS.
     */
    async getCustomCssSrc(siteId?: string): Promise<string | undefined> {
        const site = await CoreSites.getSite(siteId);

        const customCssUrl = await site.getStoredConfig('h5pcustomcssurl');
        if (!customCssUrl) {
            return;
        }

        const state = await CoreFilepool.getFileStateByUrl(site.getId(), customCssUrl);
        if (state === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
            // File not downloaded, URL has changed or first time. Delete previously downloaded file.
            await CorePromiseUtils.ignoreErrors(
                CoreFilepool.removeFilesByComponent(site.getId(), CoreH5PProvider.CUSTOM_CSS_COMPONENT, 1),
            );
        }

        if (state !== DownloadStatus.DOWNLOADED) {
            // Download CSS styles first.
            await CoreFilepool.downloadUrl(site.getId(), customCssUrl, false, CoreH5PProvider.CUSTOM_CSS_COMPONENT, 1);
        }

        return await CoreFilepool.getInternalSrcByUrl(site.getId(), customCssUrl);
    }

    /**
     * Get a trusted H5P file.
     *
     * @param url The file URL.
     * @param options Options.
     * @param ignoreCache Whether to ignore cache.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the file data.
     */
    async getTrustedH5PFile(
        url: string,
        options?: CoreH5PGetTrustedFileOptions,
        ignoreCache?: boolean,
        siteId?: string,
    ): Promise<CoreWSFile> {

        options = options || {};

        const site = await CoreSites.getSite(siteId);

        const data: CoreH5pGetTrustedH5pFileWSParams = {
            url: this.treatH5PUrl(url, site.getURL()),
            frame: options.frame ? 1 : 0,
            export: options.export ? 1 : 0,
            embed: options.embed ? 1 : 0,
            copyright: options.copyright ? 1 : 0,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getTrustedH5PFileCacheKey(url),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const result: CoreH5PGetTrustedH5PFileResult = await site.read('core_h5p_get_trusted_h5p_file', data, preSets);

        if (result.warnings && result.warnings.length) {
            throw result.warnings[0];
        }

        if (result.files && result.files.length) {
            return result.files[0];
        }

        throw new CoreError('File not found');
    }

    /**
     * Get cache key for trusted H5P file WS calls.
     *
     * @param url The file URL.
     * @returns Cache key.
     */
    protected getTrustedH5PFileCacheKey(url: string): string {
        return this.getTrustedH5PFilePrefixCacheKey() + url;
    }

    /**
     * Get prefixed cache key for trusted H5P file WS calls.
     *
     * @returns Cache key.
     */
    protected getTrustedH5PFilePrefixCacheKey(): string {
        return CoreH5PProvider.ROOT_CACHE_KEY + 'trustedH5PFile:';
    }

    /**
     * Invalidates all trusted H5P file WS calls.
     *
     * @param siteId Site ID (empty for current site).
     */
    async invalidateAllGetTrustedH5PFile(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getTrustedH5PFilePrefixCacheKey());
    }

    /**
     * Invalidates get trusted H5P file WS call.
     *
     * @param url The URL of the file.
     * @param siteId Site ID (empty for current site).
     */
    async invalidateGetTrustedH5PFile(url: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getTrustedH5PFileCacheKey(url));
    }

    /**
     * Check whether H5P offline is disabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether is disabled.
     */
    async isOfflineDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isOfflineDisabledInSite(site);
    }

    /**
     * Check whether H5P offline is disabled.
     *
     * @param site Site instance. If not defined, current site.
     * @returns Whether is disabled.
     */
    isOfflineDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!(site?.isOfflineDisabled() || site?.isFeatureDisabled('NoDelegate_H5POffline'));
    }

    /**
     * Given an H5P URL, check if it's a trusted URL.
     *
     * @param fileUrl File URL to check.
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether it's a trusted URL.
     */
    async isTrustedUrl(fileUrl: string, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.containsUrl(fileUrl) && !!fileUrl.match(/pluginfile\.php\/([^/]+\/)?[^/]+\/core_h5p\/export\//i);
    }

    /**
     * Treat an H5P url before sending it to WS.
     *
     * @param url H5P file URL.
     * @param siteUrl Site URL.
     * @returns Treated url.
     */
    treatH5PUrl(url: string, siteUrl: string): string {
        if (url.indexOf(CorePath.concatenatePaths(siteUrl, '/webservice/pluginfile.php')) === 0) {
            url = url.replace('/webservice/pluginfile', '/pluginfile');
        }

        return CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment]);
    }

}

export const CoreH5P = makeSingleton(CoreH5PProvider);

/**
 * Params of core_h5p_get_trusted_h5p_file WS.
 */
export type CoreH5pGetTrustedH5pFileWSParams = {
    url: string; // H5P file url.
    frame?: number; // The frame allow to show the bar options below the content.
    export?: number; // The export allow to download the package.
    embed?: number; // The embed allow to copy the code to your site.
    copyright?: number; // The copyright option.
};

/**
 * Options for core_h5p_get_trusted_h5p_file.
 */
export type CoreH5PGetTrustedFileOptions = {
    frame?: boolean; // Whether to show the bar options below the content.
    export?: boolean; // Whether to allow to download the package.
    embed?: boolean; // Whether to allow to copy the code to your site.
    copyright?: boolean; // The copyright option.
};

/**
 * Result of core_h5p_get_trusted_h5p_file.
 */
export type CoreH5PGetTrustedH5PFileResult = {
    files: CoreWSExternalFile[]; // Files.
    warnings: CoreWSExternalWarning[]; // List of warnings.
};
