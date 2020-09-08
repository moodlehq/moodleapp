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
import { CoreLogger } from '@providers/logger';
import { CoreSites, CoreSiteSchema } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreUrlUtils } from '@providers/utils/url';
import { CoreQueueRunner } from '@classes/queue-runner';

import { CoreH5PCore } from '../classes/core';
import { CoreH5PFramework } from '../classes/framework';
import { CoreH5PPlayer } from '../classes/player';
import { CoreH5PStorage } from '../classes/storage';
import { CoreH5PValidator } from '../classes/validator';

import { makeSingleton } from '@singletons/core.singletons';

/**
 * Service to provide H5P functionalities.
 */
@Injectable()
export class CoreH5PProvider {

    // DB table names.
    static CONTENT_TABLE = 'h5p_content'; // H5P content.
    static LIBRARIES_TABLE = 'h5p_libraries'; // Installed libraries.
    static LIBRARY_DEPENDENCIES_TABLE = 'h5p_library_dependencies'; // Library dependencies.
    static CONTENTS_LIBRARIES_TABLE = 'h5p_contents_libraries'; // Which library is used in which content.
    static LIBRARIES_CACHEDASSETS_TABLE = 'h5p_libraries_cachedassets'; // H5P cached library assets.

    h5pCore: CoreH5PCore;
    h5pFramework: CoreH5PFramework;
    h5pPlayer: CoreH5PPlayer;
    h5pStorage: CoreH5PStorage;
    h5pValidator: CoreH5PValidator;
    queueRunner: CoreQueueRunner;

    protected siteSchema: CoreSiteSchema = {
        name: 'CoreH5PProvider',
        version: 1,
        canBeCleared: [
            CoreH5PProvider.CONTENT_TABLE,
            CoreH5PProvider.LIBRARIES_TABLE,
            CoreH5PProvider.LIBRARY_DEPENDENCIES_TABLE,
            CoreH5PProvider.CONTENTS_LIBRARIES_TABLE,
            CoreH5PProvider.LIBRARIES_CACHEDASSETS_TABLE,
        ],
        tables: [
            {
                name: CoreH5PProvider.CONTENT_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'jsoncontent',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'mainlibraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'foldername',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'fileurl',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'filtered',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER',
                        notNull: true
                    }
                ]
            },
            {
                name: CoreH5PProvider.LIBRARIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'machinename',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'title',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'majorversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'minorversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'patchversion',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'runnable',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'fullscreen',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'embedtypes',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'preloadedjs',
                        type: 'TEXT'
                    },
                    {
                        name: 'preloadedcss',
                        type: 'TEXT'
                    },
                    {
                        name: 'droplibrarycss',
                        type: 'TEXT'
                    },
                    {
                        name: 'semantics',
                        type: 'TEXT'
                    },
                    {
                        name: 'addto',
                        type: 'TEXT'
                    }
                ]
            },
            {
                name: CoreH5PProvider.LIBRARY_DEPENDENCIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'libraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'requiredlibraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'dependencytype',
                        type: 'TEXT',
                        notNull: true
                    }
                ]
            },
            {
                name: CoreH5PProvider.CONTENTS_LIBRARIES_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'h5pid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'libraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'dependencytype',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'dropcss',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'weight',
                        type: 'INTEGER',
                        notNull: true
                    }
                ]
            },
            {
                name: CoreH5PProvider.LIBRARIES_CACHEDASSETS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                        autoIncrement: true
                    },
                    {
                        name: 'libraryid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'hash',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'foldername',
                        type: 'TEXT',
                        notNull: true
                    }
                ]
            }
        ]
    };

    protected ROOT_CACHE_KEY = 'CoreH5P:';
    protected logger;

    constructor() {

        this.logger = CoreLogger.instance.getInstance('CoreH5PProvider');
        this.queueRunner = new CoreQueueRunner(1);

        CoreSites.instance.registerSiteSchema(this.siteSchema);

        this.h5pValidator = new CoreH5PValidator();
        this.h5pFramework = new CoreH5PFramework();
        this.h5pCore = new CoreH5PCore(this.h5pFramework);
        this.h5pStorage = new CoreH5PStorage(this.h5pCore, this.h5pFramework);
        this.h5pPlayer = new CoreH5PPlayer(this.h5pCore, this.h5pStorage);
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    async canGetTrustedH5PFile(siteId?: string): Promise<boolean> {
        const site = await CoreSites.instance.getSite(siteId);

        return this.canGetTrustedH5PFileInSite(site);
    }

    /**
     * Returns whether or not WS to get trusted H5P file is available in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @return Promise resolved with true if ws is available, false otherwise.
     * @since 3.8
     */
    canGetTrustedH5PFileInSite(site?: CoreSite): boolean {
        site = site || CoreSites.instance.getCurrentSite();

        return site.wsAvailable('core_h5p_get_trusted_h5p_file');
    }

    /**
     * Get a trusted H5P file.
     *
     * @param url The file URL.
     * @param options Options.
     * @param ignoreCache Whether to ignore cache.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the file data.
     */
    async getTrustedH5PFile(url: string, options?: CoreH5PGetTrustedFileOptions, ignoreCache?: boolean, siteId?: string)
            : Promise<CoreWSExternalFile> {

        options = options || {};

        const site = await CoreSites.instance.getSite(siteId);

        const data = {
            url: this.treatH5PUrl(url, site.getURL()),
            frame: options.frame ? 1 : 0,
            export: options.export ? 1 : 0,
            embed: options.embed ? 1 : 0,
            copyright: options.copyright ? 1 : 0,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getTrustedH5PFileCacheKey(url),
            updateFrequency: CoreSite.FREQUENCY_RARELY
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

        throw 'File not found';
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
    async invalidateAllGetTrustedH5PFile(siteId?: string): Promise<void> {
        const site = await CoreSites.instance.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getTrustedH5PFilePrefixCacheKey());
    }

    /**
     * Invalidates get trusted H5P file WS call.
     *
     * @param url The URL of the file.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateGetTrustedH5PFile(url: string, siteId?: string): Promise<void> {
        const site = await CoreSites.instance.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getTrustedH5PFileCacheKey(url));
    }

    /**
     * Check whether H5P offline is disabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether is disabled.
     */
    async isOfflineDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.instance.getSite(siteId);

        return this.isOfflineDisabledInSite(site);
    }

    /**
     * Check whether H5P offline is disabled.
     *
     * @param site Site instance. If not defined, current site.
     * @return Whether is disabled.
     */
    isOfflineDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.instance.getCurrentSite();

        return site.isFeatureDisabled('NoDelegate_H5POffline');
    }

    /**
     * Treat an H5P url before sending it to WS.
     *
     * @param url H5P file URL.
     * @param siteUrl Site URL.
     * @return Treated url.
     */
    treatH5PUrl(url: string, siteUrl: string): string {
        if (url.indexOf(CoreTextUtils.instance.concatenatePaths(siteUrl, '/webservice/pluginfile.php')) === 0) {
            url = url.replace('/webservice/pluginfile', '/pluginfile');
        }

        return CoreUrlUtils.instance.removeUrlParams(url);
    }
}

export class CoreH5P extends makeSingleton(CoreH5PProvider) {}

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
