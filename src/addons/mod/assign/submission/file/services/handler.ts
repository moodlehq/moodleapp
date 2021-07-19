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
    AddonModAssignProvider,
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
import { AddonModAssignSubmissionFileComponent } from '../component/file';
import { FileEntry } from '@ionic-native/file/ngx';

/**
 * Handler for file submission plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignSubmissionFileHandlerService implements AddonModAssignSubmissionHandler {

    static readonly FOLDER_NAME = 'submission_file';

    name = 'AddonModAssignSubmissionFileHandler';
    type = 'file';

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @return Boolean or promise resolved with boolean: whether it can be edited in offline.
     */
    canEditOffline(): boolean {
        // This plugin doesn't use Moodle filters, it can be edited in offline.
        return true;
    }

    /**
     * Check if a plugin has no data.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @return Whether the plugin is empty.
     */
    isEmpty(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): boolean {
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);

        return files.length === 0;
    }

    /**
     * Should clear temporary data for a cancelled submission.
     *
     * @param assign The assignment.
     */
    clearTmpData(assign: AddonModAssignAssign): void {
        const files = CoreFileSession.getFiles(AddonModAssignProvider.COMPONENT, assign.id);

        // Clear the files in session for this assign.
        CoreFileSession.clearFiles(AddonModAssignProvider.COMPONENT, assign.id);

        // Now delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(files);
    }

    /**
     * This function will be called when the user wants to create a new submission based on the previous one.
     * It should add to pluginData the data to send to server based in the data in plugin (previous attempt).
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @return If the function is async, it should return a Promise resolved when done.
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
     * Return the Component to use to display the plugin data, either in read or in edit mode.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> {
        return AddonModAssignSubmissionFileComponent;
    }

    /**
     * Delete any stored data for the plugin and submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param offlineData Offline data stored.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    async deleteOfflineData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        siteId?: string,
    ): Promise<void> {

        await CoreUtils.ignoreErrors(
            AddonModAssignHelper.deleteStoredSubmissionFiles(
                assign.id,
                AddonModAssignSubmissionFileHandlerService.FOLDER_NAME,
                submission.userid,
                siteId,
            ),
        );
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param siteId Site ID. If not defined, current site.
     * @return The files (or promise resolved with the files).
     */
    getPluginFiles(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): CoreWSFile[] {
        return AddonModAssign.getSubmissionPluginAttachments(plugin);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @return The size (or promise resolved with size).
     */
    async getSizeForCopy(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): Promise<number> {
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);

        return CoreFileHelper.getTotalFilesSize(files);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @return The size (or promise resolved with size).
     */
    async getSizeForEdit(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): Promise<number> {
        // Check if there's any change.
        if (this.hasDataChanged(assign, submission, plugin)) {
            const files = CoreFileSession.getFiles(AddonModAssignProvider.COMPONENT, assign.id);

            return CoreFileHelper.getTotalFilesSize(files);
        } else {
            // Nothing has changed, we won't upload any file.
            return 0;
        }
    }

    /**
     * Check if the submission data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @return Boolean (or promise resolved with boolean): whether the data has changed.
     */
    async hasDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): Promise<boolean> {
        const offlineData = await CoreUtils.ignoreErrors(
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

        const currentFiles = CoreFileSession.getFiles(AddonModAssignProvider.COMPONENT, assign.id);

        if (currentFiles.length != numFiles) {
            // Number of files has changed.
            return true;
        }

        const files = await this.getSubmissionFilesToSync(assign, submission, offlineData);

        // Check if there is any local file added and list has changed.
        return CoreFileUploader.areFileListDifferent(currentFiles, files);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for edit on a site level.
     *
     * @return Whether or not the handler is enabled for edit on a site level.
     */
    isEnabledForEdit(): boolean {
        return true;
    }

    /**
     * Prepare and add to pluginData the data to send to the server based on the input data.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @param pluginData Object where to store the data to send.
     * @param offline Whether the user is editing in offline.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
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
        const currentFiles = CoreFileSession.getFiles(AddonModAssignProvider.COMPONENT, assign.id);
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
     * Prepare and add to pluginData the data to send to the server based on the offline data stored.
     * This will be used when performing a synchronization.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param offlineData Offline data stored.
     * @param pluginData Object where to store the data to send.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
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
     * @return File entries when is all resolved.
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
            const storedFiles = <FileEntry[]> await CoreUtils.ignoreErrors(
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
