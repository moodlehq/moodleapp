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
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton } from '@singletons';
import { ContextLevel } from '@/core/constants';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';

const ROOT_CACHE_KEY = 'mmaFiles:';

/**
 * Service to handle my files and site files.
 */
@Injectable({ providedIn: 'root' })
export class AddonPrivateFilesProvider {

    // Keep old names for backwards compatibility.
    static readonly PRIVATE_FILES_COMPONENT = 'mmaFilesMy';
    static readonly SITE_FILES_COMPONENT = 'mmaFilesSite';

    /**
     * Check if user can view his private files.
     *
     * @returns Whether the user can view his private files.
     */
    canViewPrivateFiles(): boolean {
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        return currentSite.canAccessMyFiles() && !this.isPrivateFilesDisabledInSite();
    }

    /**
     * Check if user can view site files.
     *
     * @returns Whether the user can view site files.
     */
    canViewSiteFiles(): boolean {
        return !this.isSiteFilesDisabledInSite();
    }

    /**
     * Check if user can upload private files.
     *
     * @returns Whether the user can upload private files.
     */
    canUploadFiles(): boolean {
        const currentSite = CoreSites.getCurrentSite();
        if (!currentSite) {
            return false;
        }

        return currentSite.canAccessMyFiles() && currentSite.canUploadFiles() && !this.isUploadDisabledInSite();
    }

    /**
     * Get the list of files.
     *
     * @param params A list of parameters accepted by the Web service.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getFiles(params: AddonPrivateFilesGetFilesWSParams, siteId?: string): Promise<AddonPrivateFilesFile[]> {

        const site = await CoreSites.getSite(siteId);

        const preSets = {
            cacheKey: this.getFilesListCacheKey(params),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        const result: AddonPrivateFilesGetFilesWSResult = await site.read('core_files_get_files', params, preSets);

        if (!result.files) {
            return [];
        }

        return result.files.map((entry) => {
            entry.fileurl = entry.url;

            if (entry.isdir) {
                entry.imgPath = CoreMimetypeUtils.getFolderIcon();
            } else {
                entry.imgPath = CoreMimetypeUtils.getFileIcon(entry.filename);
            }

            return entry;
        });

    }

    /**
     * Get cache key for file list WS calls.
     *
     * @param params Params of the WS.
     * @returns Cache key.
     */
    protected getFilesListCacheKey(params: AddonPrivateFilesGetFilesWSParams): string {
        const root = !params.component ? 'site' : 'my';

        return ROOT_CACHE_KEY + 'list:' + root + ':' + params.contextid + ':' + params.filepath;
    }

    /**
     * Get the private files of the current user.
     *
     * @returns Promise resolved with the files.
     */
    getPrivateFiles(): Promise<AddonPrivateFilesFile[]> {
        return this.getFiles(this.getPrivateFilesRootParams());
    }

    /**
     * Get params to get root private files directory.
     *
     * @returns Params.
     */
    protected getPrivateFilesRootParams(): AddonPrivateFilesGetFilesWSParams {
        return {
            contextid: -1,
            component: 'user',
            filearea: 'private',
            contextlevel: ContextLevel.USER,
            instanceid: CoreSites.getCurrentSite()?.getUserId(),
            itemid: 0,
            filepath: '',
            filename: '',
        };
    }

    /**
     * Get private files info.
     *
     * @param userId User ID. If not defined, current user in the site.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the info.
     */
    async getPrivateFilesInfo(userId?: number, siteId?: string): Promise<AddonPrivateFilesGetUserInfoWSResult> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const params: AddonPrivateFilesGetUserInfoWSParams = {
            userid: userId,
        };
        const preSets = {
            cacheKey: this.getPrivateFilesInfoCacheKey(userId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        return site.read('core_user_get_private_files_info', params, preSets);
    }

    /**
     * Get the cache key for private files info WS calls.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getPrivateFilesInfoCacheKey(userId: number): string {
        return this.getPrivateFilesInfoCommonCacheKey() + ':' + userId;
    }

    /**
     * Get the common part of the cache keys for private files info WS calls.
     *
     * @returns Cache key.
     */
    protected getPrivateFilesInfoCommonCacheKey(): string {
        return ROOT_CACHE_KEY + 'privateInfo';
    }

    /**
     * Get the site files.
     *
     * @returns Promise resolved with the files.
     */
    getSiteFiles(): Promise<AddonPrivateFilesFile[]> {
        return this.getFiles(this.getSiteFilesRootParams());
    }

    /**
     * Get params to get root site files directory.
     *
     * @returns Params.
     */
    protected getSiteFilesRootParams(): AddonPrivateFilesGetFilesWSParams {
        return {
            contextid: 0,
            component: '',
            filearea: '',
            itemid: 0,
            filepath: '',
            filename: '',
        };
    }

    /**
     * Invalidates list of files in a certain directory.
     *
     * @param root Root of the directory ('my' for private files, 'site' for site files).
     * @param params Params to the directory.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateDirectory(root?: 'my' | 'site', params?: AddonPrivateFilesGetFilesWSParams, siteId?: string): Promise<void> {
        if (!root) {
            return;
        }

        if (!params) {
            if (root === 'site') {
                params = this.getSiteFilesRootParams();
            } else {
                params = this.getPrivateFilesRootParams();
            }
        }

        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getFilesListCacheKey(params));
    }

    /**
     * Invalidates private files info for all users.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidatePrivateFilesInfo(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getPrivateFilesInfoCommonCacheKey());
    }

    /**
     * Invalidates private files info for a certain user.
     *
     * @param userId User ID. If not defined, current user in the site.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidatePrivateFilesInfoForUser(userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getPrivateFilesInfoCacheKey(userId || site.getUserId()));
    }

    /**
     * Check if Files is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDisabledInSite(site);
    }

    /**
     * Check if Files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isDisabledInSite(site: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_AddonPrivateFiles');
    }

    /**
     * Return whether or not the plugin is enabled.
     *
     * @returns True if enabled, false otherwise.
     */
    isPluginEnabled(): boolean {
        return this.canViewPrivateFiles() || this.canViewSiteFiles() || this.canUploadFiles();
    }

    /**
     * Check if private files is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isPrivateFilesDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isPrivateFilesDisabledInSite(site);
    }

    /**
     * Check if private files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isPrivateFilesDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.isFeatureDisabled('AddonPrivateFilesPrivateFiles');
    }

    /**
     * Check if site files is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isSiteFilesDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isSiteFilesDisabledInSite(site);
    }

    /**
     * Check if site files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isSiteFilesDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.isFeatureDisabled('AddonPrivateFilesSiteFiles');
    }

    /**
     * Check if upload files is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isUploadDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isUploadDisabledInSite(site);
    }

    /**
     * Check if upload files is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isUploadDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.isFeatureDisabled('AddonPrivateFilesUpload');
    }

    /**
     * Move a file from draft area to private files.
     *
     * @param draftId The draft area ID of the file.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    async moveFromDraftToPrivate(draftId: number, siteId?: string): Promise<null> {
        const params: AddonPrivateFilesAddUserPrivateFilesWSParams = {
            draftid: draftId,
        };
        const preSets = {
            responseExpected: false,
        };

        const site = await CoreSites.getSite(siteId);

        return site.write('core_user_add_user_private_files', params, preSets);
    }

    /**
     * Delete a private file.
     *
     * @param files Private files to remove.
     * @param siteId Site ID.
     */
    async deleteFiles(files: AddonPrivateFilesFile[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const { draftitemid } = await site.write<AddonPrivateFilesPreparePrivateFilesForEditionWSResponse>(
            'core_user_prepare_private_files_for_edition',
            {},
        );

        await CoreFileUploader.deleteDraftFiles(draftitemid, files.map(file => ({
            filename: file.filename,
            filepath: file.filepath,
        })));

        await site.write('core_user_update_private_files', { draftitemid });
    }

    /**
     * Can delete private files in site.
     *
     * @param siteId Site ID
     *
     * @returns true or false.
     */
    async canDeletePrivateFiles(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('core_user_update_private_files') && site.canUseAdvancedFeature('privatefiles');
    }

}

export const AddonPrivateFiles = makeSingleton(AddonPrivateFilesProvider);

/**
 * File data returned by core_files_get_files.
 */
export type AddonPrivateFilesFile = {
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
} & AddonPrivateFilesFileCalculatedData;

/**
 * Calculated data for AddonPrivateFilesFile.
 */
export type AddonPrivateFilesFileCalculatedData = {
    fileurl: string; // File URL, using same name as CoreWSExternalFile.
    imgPath?: string; // Path to file icon's image.
    selected?: boolean;
};
/**
 * Params of WS core_files_get_files.
 */
export type AddonPrivateFilesGetFilesWSParams = {
    contextid: number; // Context id Set to -1 to use contextlevel and instanceid.
    component: string; // Component.
    filearea: string; // File area.
    itemid: number; // Associated id.
    filepath: string; // File path.
    filename: string; // File name.
    modified?: number; // Timestamp to return files changed after this time.
    contextlevel?: ContextLevel; // The context level for the file location.
    instanceid?: number; // The instance id for where the file is located.
};

/**
 * Result of WS core_files_get_files.
 */
export type AddonPrivateFilesGetFilesWSResult = {
    parents: {
        contextid: number;
        component: string;
        filearea: string;
        itemid: number;
        filepath: string;
        filename: string;
    }[];
    files: AddonPrivateFilesFile[];
};

/**
 * Params of core_user_get_private_files_info WS.
 */
type AddonPrivateFilesGetUserInfoWSParams = {
    userid?: number; // Id of the user, default to current user.
};

/**
 * Data returned by core_user_get_private_files_info WS.
 */
export type AddonPrivateFilesGetUserInfoWSResult = {
    filecount: number; // Number of files in the area.
    foldercount: number; // Number of folders in the area.
    filesize: number; // Total size of the files in the area.
    filesizewithoutreferences: number; // Total size of the area excluding file references.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_user_add_user_private_files WS.
 */
type AddonPrivateFilesAddUserPrivateFilesWSParams = {
    draftid: number; // Draft area id.
};

/**
 * Body of core_user_prepare_private_files_for_edition WS response.
 */
type AddonPrivateFilesPreparePrivateFilesForEditionWSResponse = {
    areaoptions: { name: string; value: string | number }[];
    draftitemid: number;
    warnings?: CoreWSExternalWarning[];
};
