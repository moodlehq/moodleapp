// (C) Copyright 2015 Martin Dougiamas
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
import { CoreSitesProvider } from '@providers/sites';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreSite } from '@classes/site';

/**
 * Service to handle my files and site files.
 */
@Injectable()
export class AddonFilesProvider {
    protected ROOT_CACHE_KEY = 'mmaFiles:';
    static PRIVATE_FILES_COMPONENT = 'mmaFilesMy';
    static SITE_FILES_COMPONENT = 'mmaFilesSite';

    constructor(private sitesProvider: CoreSitesProvider, private mimeUtils: CoreMimetypeUtilsProvider) { }

    /**
     * Check if core_user_get_private_files_info WS call is available.
     *
     * @return {boolean} Whether the WS is available, false otherwise.
     */
    canGetPrivateFilesInfo(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_user_get_private_files_info');
    }

    /**
     * Check if user can view his private files.
     *
     * @return {boolean} Whether the user can view his private files.
     */
    canViewPrivateFiles(): boolean {
        return this.sitesProvider.getCurrentSite().canAccessMyFiles() && !this.isPrivateFilesDisabledInSite();
    }

    /**
     * Check if user can view site files.
     *
     * @return {boolean} Whether the user can view site files.
     */
    canViewSiteFiles(): boolean {
        return !this.isSiteFilesDisabledInSite();
    }

    /**
     * Check if user can upload private files.
     *
     * @return {boolean} Whether the user can upload private files.
     */
    canUploadFiles(): boolean {
        const currentSite = this.sitesProvider.getCurrentSite();

        return currentSite.canAccessMyFiles() && currentSite.canUploadFiles() && !this.isUploadDisabledInSite();
    }

    /**
     * Get the list of files.
     *
     * @param {any} params A list of parameters accepted by the Web service.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the files.
     */
    getFiles(params: any, siteId?: string): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                cacheKey: this.getFilesListCacheKey(params),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            return site.read('core_files_get_files', params, preSets);
        }).then((result) => {
            const entries = [];

            if (result.files) {
                result.files.forEach((entry) => {
                    if (entry.isdir) {
                        // Create a "link" to load the folder.
                        entry.link = {
                            contextid: entry.contextid || '',
                            component: entry.component || '',
                            filearea: entry.filearea || '',
                            itemid: entry.itemid || 0,
                            filepath: entry.filepath || '',
                            filename: entry.filename || ''
                        };

                        if (entry.component) {
                            // Delete unused elements that may break the request.
                            entry.link.filename = '';
                        }
                    }

                    if (entry.isdir) {
                        entry.imgPath = this.mimeUtils.getFolderIcon();
                    } else {
                        entry.imgPath = this.mimeUtils.getFileIcon(entry.filename);
                    }

                    entries.push(entry);
                });
            }

            return entries;
        });
    }

    /**
     * Get cache key for file list WS calls.
     *
     * @param {any} params Params of the WS.
     * @return {string} Cache key.
     */
    protected getFilesListCacheKey(params: any): string {
        const root = !params.component ? 'site' : 'my';

        return this.ROOT_CACHE_KEY + 'list:' + root + ':' + params.contextid + ':' + params.filepath;
    }

    /**
     * Get the private files of the current user.
     *
     * @return {Promise<any[]>} Promise resolved with the files.
     */
    getPrivateFiles(): Promise<any[]> {
        return this.getFiles(this.getPrivateFilesRootParams());
    }

    /**
     * Get params to get root private files directory.
     *
     * @return {any} Params.
     */
    protected getPrivateFilesRootParams(): any {
        return {
            contextid: -1,
            component: 'user',
            filearea: 'private',
            contextlevel: 'user',
            instanceid: this.sitesProvider.getCurrentSite().getUserId(),
            itemid: 0,
            filepath: '',
            filename: ''
        };
    }

    /**
     * Get private files info.
     *
     * @param {number} [userId] User ID. If not defined, current user in the site.
     * @param {string} [siteId] Site ID. If not defined, use current site.
     * @return {Promise<any>} Promise resolved with the info.
     */
    getPrivateFilesInfo(userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                userid: userId
            },
                preSets = {
                    cacheKey: this.getPrivateFilesInfoCacheKey(userId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            return site.read('core_user_get_private_files_info', params, preSets);
        });
    }

    /**
     * Get the cache key for private files info WS calls.
     *
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getPrivateFilesInfoCacheKey(userId: number): string {
        return this.getPrivateFilesInfoCommonCacheKey() + ':' + userId;
    }

    /**
     * Get the common part of the cache keys for private files info WS calls.
     *
     * @return {string} Cache key.
     */
    protected getPrivateFilesInfoCommonCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'privateInfo';
    }

    /**
     * Get the site files.
     *
     * @return {Promise<any[]>} Promise resolved with the files.
     */
    getSiteFiles(): Promise<any[]> {
        return this.getFiles(this.getSiteFilesRootParams());
    }

    /**
     * Get params to get root site files directory.
     *
     * @return {any} Params.
     */
    protected getSiteFilesRootParams(): any {
        return {
            contextid: 0,
            component: '',
            filearea: '',
            itemid: 0,
            filepath: '',
            filename: ''
        };
    }

    /**
     * Invalidates list of files in a certain directory.
     *
     * @param {string} root Root of the directory ('my' for private files, 'site' for site files).
     * @param {string} path Path to the directory.
     * @param {string} [siteId] Site ID. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateDirectory(root: string, path: string, siteId?: string): Promise<any> {
        let params;
        if (!path) {
            if (root === 'site') {
                params = this.getSiteFilesRootParams();
            } else if (root === 'my') {
                params = this.getPrivateFilesRootParams();
            }
        } else {
            params = path;
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getFilesListCacheKey(params));
        });
    }

    /**
     * Invalidates private files info for all users.
     *
     * @param {string} [siteId] Site ID. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidatePrivateFilesInfo(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getPrivateFilesInfoCommonCacheKey());
        });
    }

    /**
     * Invalidates private files info for a certain user.
     *
     * @param {number} [userId] User ID. If not defined, current user in the site.
     * @param {string} [siteId] Site ID. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidatePrivateFilesInfoForUser(userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getPrivateFilesInfoCacheKey(userId));
        });
    }

    /**
     * Check if Files is disabled in a certain site.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isDisabledInSite(site);
        });
    }

    /**
     * Check if Files is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isDisabledInSite(site: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_AddonFiles');
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @return {boolean} True if enabled, false otherwise.
     */
    isPluginEnabled(): boolean {
        return this.canViewPrivateFiles() || this.canViewSiteFiles() || this.canUploadFiles();
    }

    /**
     * Check if private files is disabled in a certain site.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isPrivateFilesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isPrivateFilesDisabledInSite(site);
        });
    }

    /**
     * Check if private files is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isPrivateFilesDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('AddonFilesPrivateFiles');
    }

    /**
     * Check if site files is disabled in a certain site.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isSiteFilesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isSiteFilesDisabledInSite(site);
        });
    }

    /**
     * Check if site files is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isSiteFilesDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('AddonFilesSiteFiles');
    }

    /**
     * Check if upload files is disabled in a certain site.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isUploadDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isUploadDisabledInSite(site);
        });
    }

    /**
     * Check if upload files is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isUploadDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('AddonFilesUpload');
    }

    /**
     * Move a file from draft area to private files.
     *
     * @param {number} draftId The draft area ID of the file.
     * @param {string} [siteid] ID of the site. If not defined, use current site.
     * @return {Promise<any>} Promise resolved in success, rejected otherwise.
     */
    moveFromDraftToPrivate(draftId: number, siteId?: string): Promise<any> {
        const params = {
                draftid: draftId
            },
            preSets = {
                responseExpected: false
            };

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.write('core_user_add_user_private_files', params, preSets);
        });
    }

    /**
     * Check the Moodle version in order to check if upload files is working.
     *
     * @param {string} [siteId] Site ID. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if WS is working, false otherwise.
     */
    versionCanUploadFiles(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Upload private files doesn't work for Moodle 3.1.0 due to a bug.
            return site.isVersionGreaterEqualThan('3.1.1');
        });
    }
}
