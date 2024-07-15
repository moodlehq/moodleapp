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
import { CoreError } from '@classes/errors/error';
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CorePlatform } from '@services/platform';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModScorm, AddonModScormScorm } from '../scorm';
import { AddonModScormSync } from '../scorm-sync';
import { ADDON_MOD_SCORM_COMPONENT } from '../../constants';

/**
 * Handler to prefetch SCORMs.
 */
@Injectable({ providedIn: 'root' })
export class AddonModScormPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModScorm';
    modName = 'scorm';
    component = ADDON_MOD_SCORM_COMPONENT;
    updatesNames = /^configuration$|^.*files$|^tracks$/;

    /**
     * @inheritdoc
     */
    download(
        module: CoreCourseAnyModuleData,
        courseId: number,
        dirPath?: string,
        onProgress?: AddonModScormProgressCallback,
    ): Promise<void> {
        return this.prefetchPackage(
            module,
            courseId,
            (siteId) => this.downloadOrPrefetchScorm(module, courseId, true, false, onProgress, siteId),
        );
    }

    /**
     * Download or prefetch a SCORM.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param prefetch True to prefetch, false to download right away.
     * @param onProgress Function to call on progress.
     * @param siteId Site ID.
     * @returns Promise resolved with the "extra" data to store: the hash of the file.
     */
    protected async downloadOrPrefetchScorm(
        module: CoreCourseAnyModuleData,
        courseId: number,
        single: boolean,
        prefetch: boolean,
        onProgress: AddonModScormProgressCallback | undefined,
        siteId: string,
    ): Promise<string> {

        const scorm = await this.getScorm(module, courseId, siteId);

        const files = this.getIntroFilesFromInstance(module, scorm);

        await Promise.all([
            // Download the SCORM file.
            this.downloadOrPrefetchMainFileIfNeeded(scorm, prefetch, onProgress, siteId),
            // Download WS data. If it fails we don't want to fail the whole download, so we'll ignore the error for now.
            // @todo Implement a warning system so the user knows which SCORMs have failed.
            CoreUtils.ignoreErrors(this.fetchWSData(scorm, siteId)),
            // Download intro files, ignoring errors.
            CoreUtils.ignoreErrors(CoreFilepool.downloadOrPrefetchFiles(siteId, files, prefetch, false, this.component, module.id)),
        ]);

        // Success, return the hash.
        return scorm.sha1hash ?? '';
    }

    /**
     * Downloads/Prefetches and unzips the SCORM package.
     *
     * @param scorm SCORM object.
     * @param prefetch True if prefetch, false otherwise.
     * @param onProgress Function to call on progress.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the file is downloaded and unzipped.
     */
    protected async downloadOrPrefetchMainFile(
        scorm: AddonModScormScorm,
        prefetch?: boolean,
        onProgress?: AddonModScormProgressCallback,
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const packageUrl = AddonModScorm.getPackageUrl(scorm);

        // Get the folder where the unzipped files will be.
        const dirPath = await AddonModScorm.getScormFolder(scorm.moduleurl ?? '');

        // Notify that the download is starting.
        onProgress && onProgress({ message: 'core.downloading' });

        // Download the ZIP file to the filepool.
        if (prefetch) {
            await CoreFilepool.addToQueueByUrl(
                siteId,
                packageUrl,
                this.component,
                scorm.coursemodule,
                undefined,
                undefined,
                (event: ProgressEvent<EventTarget>) => this.downloadProgress(true, onProgress, event),
            );
        } else {
            await CoreFilepool.downloadUrl(
                siteId,
                packageUrl,
                true,
                this.component,
                scorm.coursemodule,
                undefined,
                (event: ProgressEvent<EventTarget>) => this.downloadProgress(true, onProgress, event),
            );
        }

        // Get the ZIP file path.
        const zipPath = await CoreFilepool.getFilePathByUrl(siteId, packageUrl);

        // Notify that the unzip is starting.
        onProgress && onProgress({ message: 'core.unzipping' });

        // Unzip and delete the zip when finished.
        await CoreFile.unzipFile(
            zipPath,
            dirPath,
            (event: ProgressEvent<EventTarget>) => this.downloadProgress(false, onProgress, event),
        );

        await CoreUtils.ignoreErrors(CoreFilepool.removeFileByUrl(siteId, packageUrl));
    }

    /**
     * Downloads/Prefetches and unzips the SCORM package if it should be downloaded.
     *
     * @param scorm SCORM object.
     * @param prefetch True if prefetch, false otherwise.
     * @param onProgress Function to call on progress.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the file is downloaded and unzipped.
     */
    protected async downloadOrPrefetchMainFileIfNeeded(
        scorm: AddonModScormScorm,
        prefetch?: boolean,
        onProgress?: AddonModScormProgressCallback,
        siteId?: string,
    ): Promise<void> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        const result = AddonModScorm.isScormUnsupported(scorm);

        if (result) {
            throw new CoreError(Translate.instant(result));
        }

        // First verify that the file needs to be downloaded.
        // It needs to be checked manually because the ZIP file is deleted after unzipped, so the filepool will always download it.
        const download = await AddonModScorm.shouldDownloadMainFile(scorm, undefined, siteId);

        if (download) {
            await this.downloadOrPrefetchMainFile(scorm, prefetch, onProgress, siteId);
        }
    }

    /**
     * Function that converts a regular ProgressEvent into a AddonModScormProgressEvent.
     *
     * @param downloading True when downloading, false when unzipping.
     * @param onProgress Function to call on progress.
     * @param progress Event returned by the download function.
     */
    protected downloadProgress(downloading: boolean, onProgress?: AddonModScormProgressCallback, progress?: ProgressEvent): void {
        if (onProgress && progress && progress.loaded) {
            onProgress({ downloading, progress });
        }
    }

    /**
     * Get WS data for SCORM.
     *
     * @param scorm SCORM object.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is prefetched.
     */
    async fetchWSData(scorm: AddonModScormScorm, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const modOptions: CoreCourseCommonModWSOptions = {
            cmId: scorm.coursemodule,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        await Promise.all([
            // Prefetch number of attempts (including not completed).
            this.fetchAttempts(scorm, modOptions),
            // Prefetch SCOs.
            AddonModScorm.getScos(scorm.id, modOptions),
            // Prefetch access information.
            AddonModScorm.getAccessInformation(scorm.id, modOptions),
        ]);
    }

    /**
     * Fetch attempts WS data.
     *
     * @param scorm SCORM object.
     * @param modOptions Options.
     * @returns Promise resolved when done.
     */
    async fetchAttempts(scorm: AddonModScormScorm, modOptions: CoreCourseCommonModWSOptions): Promise<void> {
        // If it fails, assume we have no attempts.
        const numAttempts = await CoreUtils.ignoreErrors(AddonModScorm.getAttemptCountOnline(scorm.id, modOptions), 0);

        if (numAttempts <= 0) {
            // No attempts. We'll still try to get user data to be able to identify SCOs not visible and so.
            await AddonModScorm.getScormUserDataOnline(scorm.id, 0, modOptions);

            return;
        }

        // Get user data for each attempt.
        const promises: Promise<unknown>[] = [];

        for (let i = 1; i <= numAttempts; i++) {
            promises.push(AddonModScorm.getScormUserDataOnline(scorm.id, i, modOptions).catch((error) => {
                // Ignore failures of all the attempts that aren't the last one.
                if (i == numAttempts) {
                    throw error;
                }
            }));
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    async getDownloadSize(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreFileSizeSum> {
        const scorm = await this.getScorm(module, courseId);

        if (AddonModScorm.isScormUnsupported(scorm)) {
            return { size: -1, total: false };
        } else if (!scorm.packagesize) {
            // We don't have package size, try to calculate it.
            const size = await AddonModScorm.calculateScormSize(scorm);

            return { size: size, total: true };
        } else {
            return { size: scorm.packagesize, total: true };
        }
    }

    /**
     * @inheritdoc
     */
    async getDownloadedSize(module: CoreCourseAnyModuleData, courseId: number): Promise<number> {
        const scorm = await this.getScorm(module, courseId);

        // Get the folder where SCORM should be unzipped.
        const path = await AddonModScorm.getScormFolder(scorm.moduleurl ?? '');

        return CoreFile.getDirectorySize(path);
    }

    /**
     * @inheritdoc
     */
    async getFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        try {
            const scorm = await this.getScorm(module, courseId);

            return AddonModScorm.getScormFileList(scorm);
        } catch {
            // SCORM not found, return empty list.
            return [];
        }
    }

    /**
     * Get the SCORM instance from a module instance.
     *
     * @param module Module.
     * @param courseId Course ID.
     * @param siteId Site ID.
     * @returns Promise resolved with the SCORM.
     */
    protected async getScorm(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<AddonModScormScorm> {
        let moduleUrl = 'url' in module ? module.url : undefined;
        if (!moduleUrl) {
            module = await CoreCourse.getModule(module.id, module.course, undefined, true, false, siteId);

            moduleUrl = module.url;
        }

        return AddonModScorm.getScorm(courseId, module.id, { moduleUrl, siteId });
    }

    /**
     * @inheritdoc
     */
    invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModScorm.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        // Invalidate the calls required to check if a SCORM is downloadable.
        return AddonModScorm.invalidateScormData(courseId);
    }

    /**
     * @inheritdoc
     */
    async isDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        const scorm = await this.getScorm(module, courseId);

        if (scorm.warningMessage) {
            // SCORM closed or not opened yet.
            return false;
        }

        if (AddonModScorm.isScormUnsupported(scorm)) {
            return false;
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    prefetch(
        module: CoreCourseAnyModuleData,
        courseId: number,
        single?: boolean,
        dirPath?: string,
        onProgress?: AddonModScormProgressCallback,
    ): Promise<void> {
        return this.prefetchPackage(
            module,
            courseId,
            (siteId) => this.downloadOrPrefetchScorm(module, courseId, !!single, true, onProgress, siteId),
        );
    }

    /**
     * Remove module downloaded files. If not defined, we'll use getFiles to remove them (slow).
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when done.
     */
    async removeFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();

        const scorm = await this.getScorm(module, courseId, siteId);

        // Get the folder where SCORM should be unzipped.
        const path = await AddonModScorm.getScormFolder(scorm.moduleurl ?? '');

        const promises: Promise<unknown>[] = [];

        // Remove the unzipped folder.
        promises.push(CoreFile.removeDir(path).catch((error) => {
            if (error && (error.code == 1 || !CorePlatform.isMobile())) {
                // Not found, ignore error.
            } else {
                throw error;
            }
        }));

        // Delete other files.
        promises.push(CoreFilepool.removeFilesByComponent(siteId, this.component, module.id));

        await Promise.all(promises);
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async sync(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<unknown> {
        const scorm = await this.getScorm(module, courseId, siteId);

        return AddonModScormSync.syncScorm(scorm, siteId);
    }

}

export const AddonModScormPrefetchHandler = makeSingleton(AddonModScormPrefetchHandlerService);

/**
 * Progress event used when downloading a SCORM.
 */
export type AddonModScormProgressEvent = {
    downloading?: boolean; // Whether the event is due to the download of a chunk of data.
    progress?: ProgressEvent; // Progress event sent by the download.
    message?: string; // A message related to the progress, used to notify that a certain step of the download has started.
};

/**
 * Progress callback when downloading a SCORM.
 */
export type AddonModScormProgressCallback = (event: AddonModScormProgressEvent) => void;
