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
import { CoreSitesProvider } from '@providers/sites';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning } from '@providers/ws';

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
     * @return Whether the WS is available, false otherwise.
     */
    canGetPrivateFilesInfo(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_user_get_private_files_info');
    }

    /**
     * Check if user can view his private files.
     *
     * @return Whether the user can view his private files.
     */
    canViewPrivateFiles(): boolean {
        return this.sitesProvider.getCurrentSite().canAccessMyFiles() && !this.isPrivateFilesDisabledInSite();
    }

    /**
     * Check if user can view site files.
     *
     * @return Whether the user can view site files.
     */
    canViewSiteFiles(): boolean {
        return !this.isSiteFilesDisabledInSite();
    }

    /**
     * Check if user can upload private files.
     *
     * @return Whether the user can upload private files.
     */
    canUploadFiles(): boolean {
        const currentSite = this.sitesProvider.getCurrentSite();

        return currentSite.canAccessMyFiles() && currentSite.canUploadFiles() && !this.isUploadDisabledInSite();
    }

    /**
     * Get the list of files.
     *
     * @param params A list of parameters accepted by the Web service.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    getFiles(params: any, siteId?: string): Promise<AddonFilesFile[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                cacheKey: this.getFilesListCacheKey(params),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            return site.read('core_files_get_files', params, preSets);
        }).then((result: AddonFilesGetFilesResult) => {
            const entries: AddonFilesFile[] = [];

            if (result.files) {
                result.files.forEach((entry) => {
                    if (entry.isdir) {
                        // Create a "link" to load the folder.
                        entry.link = {
                            contextid: entry.contextid || null,
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
     * @param params Params of the WS.
     * @return Cache key.
     */
    protected getFilesListCacheKey(params: any): string {
        const root = !params.component ? 'site' : 'my';

        return this.ROOT_CACHE_KEY + 'list:' + root + ':' + params.contextid + ':' + params.filepath;
    }

    /**
     * Get the private files of the current user.
     *
     * @return Promise resolved with the files.
     */
    getPrivateFiles(): Promise<AddonFilesFile[]> {
        return this.getFiles(this.getPrivateFilesRootParams());
    }

    /**
     * Get params to get root private files directory.
     *
     * @return Params.
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
     * @param userId User ID. If not defined, current user in the site.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the info.
     */
    getPrivateFilesInfo(userId?: number, siteId?: string): Promise<AddonFilesGetUserPrivateFilesInfoResult> {
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
     * @param userId User ID.
     * @return Cache key.
     */
    protected getPrivateFilesInfoCacheKey(userId: number): string {
        return this.getPrivateFilesInfoCommonCacheKey() + ':' + userId;
    }

    /**
     * Get the common part of the cache keys for private files info WS calls.
     *
     * @return Cache key.
     */
    protected getPrivateFilesInfoCommonCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'privateInfo';
    }

    /**
     * Get the site files.
     *
     * @return Promise resolved with the files.
     */
    getSiteFiles(): Promise<AddonFilesFile[]> {
        return this.getFiles(this.getSiteFilesRootParams());
    }

    /**
     * Get params to get root site files directory.
     *
     * @return Params.
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
     * @param root Root of the directory ('my' for private files, 'site' for site files).
     * @param path Path to the directory.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidatePrivateFilesInfo(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getPrivateFilesInfoCommonCacheKey());
        });
    }

    /**
     * Invalidates private files info for a certain user.
     *
     * @param userId User ID. If not defined, current user in the site.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
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
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isDisabledInSite(site);
        });
    }

    /**
     * Check if Files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isDisabledInSite(site: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_AddonFiles');
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @return True if enabled, false otherwise.
     */
    isPluginEnabled(): boolean {
        return this.canViewPrivateFiles() || this.canViewSiteFiles() || this.canUploadFiles();
    }

    /**
     * Check if private files is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isPrivateFilesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isPrivateFilesDisabledInSite(site);
        });
    }

    /**
     * Check if private files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isPrivateFilesDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('AddonFilesPrivateFiles');
    }

    /**
     * Check if site files is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isSiteFilesDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isSiteFilesDisabledInSite(site);
        });
    }

    /**
     * Check if site files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isSiteFilesDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('AddonFilesSiteFiles');
    }

    /**
     * Check if upload files is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isUploadDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isUploadDisabledInSite(site);
        });
    }

    /**
     * Check if upload files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isUploadDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('AddonFilesUpload');
    }

    /**
     * Move a file from draft area to private files.
     *
     * @param draftId The draft area ID of the file.
     * @param siteid ID of the site. If not defined, use current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    moveFromDraftToPrivate(draftId: number, siteId?: string): Promise<null> {
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
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with true if WS is working, false otherwise.
     */
    versionCanUploadFiles(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Upload private files doesn't work for Moodle 3.1.0 due to a bug.
            return site.isVersionGreaterEqualThan('3.1.1');
        });
    }
}

/**
 * File data returned by core_files_get_files.
 */
export type AddonFilesFile = {
    contextid: number;
    component: string;
    filearea: string;
    itemid: number;
    filepath: string;
    filename: string;
    isdir: boolean;
    url: string;
    timemodified: number;
    timecreated?: number; // Time created.
    filesize?: number; // File size.
    author?: string; // File owner.
    license?: string; // File license.
} & AddonFilesFileCalculatedData;

/**
 * Result of WS core_files_get_files.
 */
export type AddonFilesGetFilesResult = {
    parents: {
        contextid: number;
        component: string;
        filearea: string;
        itemid: number;
        filepath: string;
        filename: string;
    }[];
    files: AddonFilesFile[];
};

/**
 * Result of WS core_user_get_private_files_info.
 */
export type AddonFilesGetUserPrivateFilesInfoResult = {
    filecount: number; // Number of files in the area.
    foldercount: number; // Number of folders in the area.
    filesize: number; // Total size of the files in the area.
    filesizewithoutreferences: number; // Total size of the area excluding file references.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Calculated data for AddonFilesFile.
 */
export type AddonFilesFileCalculatedData = {
    link?: { // Calculated in the app. A link to open the folder.
        contextid?: number; // Folder's contextid.
        component?: string; // Folder's component.
        filearea?: string; // Folder's filearea.
        itemid?: number; // Folder's itemid.
        filepath?: string; // Folder's filepath.
        filename?: string; // Folder's filename.
    };
    imgPath?: string; // Path to file icon's image.
};
