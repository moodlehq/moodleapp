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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';

/**
 * Service to provide H5P functionalities.
 */
@Injectable()
export class CoreH5PProvider {

    protected ROOT_CACHE_KEY = 'mmH5P:';

    protected logger;

    constructor(logger: CoreLoggerProvider,
            private sitesProvider: CoreSitesProvider) {

        this.logger = logger.getInstance('CoreFilterProvider');
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    canGetTrustedH5PFile(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canGetTrustedH5PFileInSite(site);
        });
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.4
     */
    canGetTrustedH5PFileInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_h5p_get_trusted_h5p_file');
    }

    /**
     * Get a trusted H5P file.
     *
     * @param url The file URL.
     * @param options Options.
     * @param ignoreCache Whether to ignore cache..
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file data.
     */
    getTrustedH5PFile(url: string, options: CoreH5PGetTrustedFileOptions, ignoreCache?: boolean, siteId?: string)
            : Promise<CoreWSExternalFile> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            const data = {
                    url: url,
                    frame: options.frame ? 1 : 0,
                    export: options.export ? 1 : 0,
                    embed: options.embed ? 1 : 0,
                    copyright: options.copyright ? 1 : 0,
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getTrustedH5PFileCacheKey(url),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_h5p_get_trusted_h5p_file', data, preSets).then((result: CoreH5PGetTrustedH5PFileResult): any => {
                if (result.warnings && result.warnings.length) {
                    return Promise.reject(result.warnings[0]);
                }

                if (result.files && result.files.length) {
                    return result.files[0];
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for trusted H5P file WS calls.
     *
     * @param url The file URL.
     * @return Cache key.
     */
    protected getTrustedH5PFileCacheKey(url: string): string {
        return this.getTrustedH5PFilePrefixCacheKey() + url;
    }

    /**
     * Get prefixed cache key for trusted H5P file WS calls.
     *
     * @return Cache key.
     */
    protected getTrustedH5PFilePrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'trustedH5PFile:';
    }

    /**
     * Invalidates all trusted H5P file WS calls.
     *
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllGetTrustedH5PFile(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getTrustedH5PFilePrefixCacheKey());
        });
    }

    /**
     * Invalidates get trusted H5P file WS call.
     *
     * @param url The URL of the file.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAvailableInContexts(url: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getTrustedH5PFileCacheKey(url));
        });
    }
}

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
