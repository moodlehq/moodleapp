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

import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignPlugin,
    AddonModAssign,
} from '@addons/mod/assign/services/assign';
import { AddonModAssignHelper } from '@addons/mod/assign/services/assign-helper';
import { AddonModAssignOffline, AddonModAssignSubmissionsDBRecordFormatted } from '@addons/mod/assign/services/assign-offline';
import { AddonModAssignSubmissionHandler } from '@addons/mod/assign/services/submission-delegate';
import { Injectable, Type } from '@angular/core';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreFileSession } from '@services/file-session';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import type { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
import { ADDON_MOD_ASSIGN_COMPONENT } from '@addons/mod/assign/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Handler for file submission plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignSubmissionFileHandlerService implements AddonModAssignSubmissionHandler {

    static readonly FOLDER_NAME = 'submission_file';

    name = 'AddonModAssignSubmissionFileHandler';
    type = 'file';

    /**
     * @inheritdoc
     */
    canEditOffline(): boolean {
        // This plugin doesn't use Moodle filters, it can be edited in offline.
        return true;
    }

    /**
     * @inheritdoc
     */
    isEmpty(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): boolean {
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);

        return files.length === 0;
    }

    /**
     * @inheritdoc
     */
    isEmptyForEdit(assign: AddonModAssignAssign): boolean {
        const currentFiles = CoreFileSession.getFiles(ADDON_MOD_ASSIGN_COMPONENT, assign.id);

        return currentFiles.length == 0;
     }

    /**
     * @inheritdoc
     */
    clearTmpData(assign: AddonModAssignAssign): void {
        const files = CoreFileSession.getFiles(ADDON_MOD_ASSIGN_COMPONENT, assign.id);

        // Clear the files in session for this assign.
        CoreFileSession.clearFiles(ADDON_MOD_ASSIGN_COMPONENT, assign.id);

        // Now delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(files);
    }

    /**
     * @inheritdoc
     */
    async copySubmissionData(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSubmissionFilePluginData,
    ): Promise<void> {
        // We need to re-upload all the existing files.
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);

        // Get the itemId.
        pluginData.files_filemanager = await AddonModAssignHelper.uploadFiles(assign.id, files);
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<AddonModAssignSubmissionPluginBaseComponent>> {
        const { AddonModAssignSubmissionFileComponent } = await import('../component/file');

        return AddonModAssignSubmissionFileComponent;
    }

    /**
     * @inheritdoc
     */
    async deleteOfflineData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        siteId?: string,
    ): Promise<void> {

        await CorePromiseUtils.ignoreErrors(
            AddonModAssignHelper.deleteStoredSubmissionFiles(
                assign.id,
                AddonModAssignSubmissionFileHandlerService.FOLDER_NAME,
                submission.userid,
                siteId,
            ),
        );
    }

    /**
     * @inheritdoc
     */
    getPluginFiles(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): CoreWSFile[] {
        return AddonModAssign.getSubmissionPluginAttachments(plugin);
    }

    /**
     * @inheritdoc
     */
    async getSizeForCopy(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): Promise<number> {
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);

        return CoreFileHelper.getTotalFilesSize(files);
    }

    /**
     * @inheritdoc
     */
    async getSizeForEdit(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): Promise<number> {
        // Check if there's any change.
        const hasChanged = await this.hasDataChanged(assign, submission, plugin);
        if (hasChanged) {
            const files = CoreFileSession.getFiles(ADDON_MOD_ASSIGN_COMPONENT, assign.id);

            return CoreFileHelper.getTotalFilesSize(files);
        } else {
            // Nothing has changed, we won't upload any file.
            return 0;
        }
    }

    /**
     * @inheritdoc
     */
    async hasDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): Promise<boolean> {
        const offlineData = await CorePromiseUtils.ignoreErrors(
            // Check if there's any offline data.
            AddonModAssignOffline.getSubmission(assign.id, submission.userid),
            undefined,
        );

        let numFiles: number;
        if (offlineData && offlineData.plugindata && offlineData.plugindata.files_filemanager) {
            const offlineDataFiles = <CoreFileUploaderStoreFilesResult>offlineData.plugindata.files_filemanager;
            // Has offline data, return the number of files.
            numFiles = offlineDataFiles.offline + offlineDataFiles.online.length;
        } else {
            // No offline data, return the number of online files.
            const pluginFiles = AddonModAssign.getSubmissionPluginAttachments(plugin);

            numFiles = pluginFiles && pluginFiles.length;
        }

        const currentFiles = CoreFileSession.getFiles(ADDON_MOD_ASSIGN_COMPONENT, assign.id);

        if (currentFiles.length != numFiles) {
            // Number of files has changed.
            return true;
        }

        const files = await this.getSubmissionFilesToSync(assign, submission, offlineData);

        // Check if there is any local file added and list has changed.
        return CoreFileUploader.areFileListDifferent(currentFiles, files);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isEnabledForEdit(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    async prepareSubmissionData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: AddonModAssignSubmissionFileData,
        pluginData: AddonModAssignSubmissionFilePluginData,
        offline = false,
        userId?: number,
        siteId?: string,
    ): Promise<void> {

        const changed = await this.hasDataChanged(assign, submission, plugin);
        if (!changed) {
            return;
        }

        // Data has changed, we need to upload new files and re-upload all the existing files.
        const currentFiles = CoreFileSession.getFiles(ADDON_MOD_ASSIGN_COMPONENT, assign.id);
        const error = CoreUtils.hasRepeatedFilenames(currentFiles);

        if (error) {
            throw error;
        }

        pluginData.files_filemanager = await AddonModAssignHelper.uploadOrStoreFiles(
            assign.id,
            AddonModAssignSubmissionFileHandlerService.FOLDER_NAME,
            currentFiles,
            offline,
            userId,
            siteId,
        );
    }

    /**
     * @inheritdoc
     */
    async prepareSyncData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        pluginData: AddonModAssignSubmissionFilePluginData,
        siteId?: string,
    ): Promise<void> {

        const files = await this.getSubmissionFilesToSync(assign, submission, offlineData, siteId);

        if (files.length == 0) {
            return;
        }

        pluginData.files_filemanager = await AddonModAssignHelper.uploadFiles(assign.id, files, siteId);
    }

    /**
     * Get the file list to be synced.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param offlineData Offline data stored.
     * @param siteId Site ID. If not defined, current site.
     * @returns File entries when is all resolved.
     */
    protected async getSubmissionFilesToSync(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        offlineData?: AddonModAssignSubmissionsDBRecordFormatted,
        siteId?: string,
    ): Promise<CoreFileEntry[]> {
        const filesData = <CoreFileUploaderStoreFilesResult>offlineData?.plugindata.files_filemanager;
        if (!filesData) {
            return [];
        }

        // Has some data to sync.
        let files: CoreFileEntry[] = filesData.online || [];

        if (filesData.offline) {
            // Has offline files, get them and add them to the list.
            const storedFiles = <FileEntry[]> await CorePromiseUtils.ignoreErrors(
                AddonModAssignHelper.getStoredSubmissionFiles(
                    assign.id,
                    AddonModAssignSubmissionFileHandlerService.FOLDER_NAME,
                    submission.userid,
                    siteId,
                ),
                [],
            );
            files = files.concat(storedFiles);
        }

        return files;
    }

}
export const AddonModAssignSubmissionFileHandler = makeSingleton(AddonModAssignSubmissionFileHandlerService);

// Define if ever used.
export type AddonModAssignSubmissionFileData = Record<string, unknown>;

export type AddonModAssignSubmissionFilePluginData = {
    // The id of a draft area containing files for this submission. Or the offline file results.
    files_filemanager: number | CoreFileUploaderStoreFilesResult; // eslint-disable-line @typescript-eslint/naming-convention
};
