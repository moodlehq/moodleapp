
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

import { Injectable, Injector } from '@angular/core';
import { CoreFileSessionProvider } from '@providers/file-session';
import { CoreFileHelperProvider } from '@providers/file-helper';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import {
    AddonModAssignProvider, AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin
} from '../../../providers/assign';
import { AddonModAssignOfflineProvider } from '../../../providers/assign-offline';
import { AddonModAssignHelperProvider } from '../../../providers/helper';
import { AddonModAssignSubmissionHandler } from '../../../providers/submission-delegate';
import { AddonModAssignSubmissionFileComponent } from '../component/file';

/**
 * Handler for file submission plugin.
 */
@Injectable()
export class AddonModAssignSubmissionFileHandler implements AddonModAssignSubmissionHandler {
    static FOLDER_NAME = 'submission_file';

    name = 'AddonModAssignSubmissionFileHandler';
    type = 'file';

    constructor(private assignProvider: AddonModAssignProvider, private assignOfflineProvider: AddonModAssignOfflineProvider,
        private assignHelper: AddonModAssignHelperProvider, private fileSessionProvider: CoreFileSessionProvider,
        private fileUploaderProvider: CoreFileUploaderProvider, private fileHelper: CoreFileHelperProvider,
        private utils: CoreUtilsProvider) { }

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @return Boolean or promise resolved with boolean: whether it can be edited in offline.
     */
    canEditOffline(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin): boolean | Promise<boolean> {
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
        const files = this.assignProvider.getSubmissionPluginAttachments(plugin);

        return files.length === 0;
    }

    /**
     * Should clear temporary data for a cancelled submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     */
    clearTmpData(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any): void {
        const files = this.fileSessionProvider.getFiles(AddonModAssignProvider.COMPONENT, assign.id);

        // Clear the files in session for this assign.
        this.fileSessionProvider.clearFiles(AddonModAssignProvider.COMPONENT, assign.id);

        // Now delete the local files from the tmp folder.
        this.fileUploaderProvider.clearTmpFiles(files);
    }

    /**
     * This function will be called when the user wants to create a new submission based on the previous one.
     * It should add to pluginData the data to send to server based in the data in plugin (previous attempt).
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    copySubmissionData(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin, pluginData: any,
            userId?: number, siteId?: string): void | Promise<any> {

        // We need to re-upload all the existing files.
        const files = this.assignProvider.getSubmissionPluginAttachments(plugin);

        return this.assignHelper.uploadFiles(assign.id, files).then((itemId) => {
            pluginData.files_filemanager = itemId;
        });
    }

    /**
     * Return the Component to use to display the plugin data, either in read or in edit mode.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param plugin The plugin object.
     * @param edit Whether the user is editing.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, plugin: AddonModAssignPlugin, edit?: boolean): any | Promise<any> {
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
    deleteOfflineData(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, offlineData: any, siteId?: string): void | Promise<any> {

        return this.assignHelper.deleteStoredSubmissionFiles(assign.id, AddonModAssignSubmissionFileHandler.FOLDER_NAME,
                submission.userid, siteId).catch(() => {
            // Ignore errors, maybe the folder doesn't exist.
        });
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
    getPluginFiles(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, siteId?: string): any[] | Promise<any[]> {
        return this.assignProvider.getSubmissionPluginAttachments(plugin);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @return The size (or promise resolved with size).
     */
    getSizeForCopy(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): number | Promise<number> {
        const files = this.assignProvider.getSubmissionPluginAttachments(plugin);

        return this.fileHelper.getTotalFilesSize(files);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @return The size (or promise resolved with size).
     */
    getSizeForEdit(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any): number | Promise<number> {
        // Check if there's any change.
        if (this.hasDataChanged(assign, submission, plugin, inputData)) {
            const files = this.fileSessionProvider.getFiles(AddonModAssignProvider.COMPONENT, assign.id);

            return this.fileHelper.getTotalFilesSize(files);
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
     * @param inputData Data entered by the user for the submission.
     * @return Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any): boolean | Promise<boolean> {

        // Check if there's any offline data.
        return this.assignOfflineProvider.getSubmission(assign.id, submission.userid).catch(() => {
            // No offline data found.
        }).then((offlineData) => {
            if (offlineData && offlineData.plugindata && offlineData.plugindata.files_filemanager) {
                // Has offline data, return the number of files.
                return offlineData.plugindata.files_filemanager.offline + offlineData.plugindata.files_filemanager.online.length;
            }

            // No offline data, return the number of online files.
            const pluginFiles = this.assignProvider.getSubmissionPluginAttachments(plugin);

            return pluginFiles && pluginFiles.length;
        }).then((numFiles) => {
            const currentFiles = this.fileSessionProvider.getFiles(AddonModAssignProvider.COMPONENT, assign.id);

            if (currentFiles.length != numFiles) {
                // Number of files has changed.
                return true;
            }

            // Search if there is any local file added.
            for (let i = 0; i < currentFiles.length; i++) {
                const file = currentFiles[i];
                if (!file.filename && typeof file.name != 'undefined' && !file.offline) {
                    // There's a local file added, list has changed.
                    return true;
                }
            }

            // No local files and list length is the same, this means the list hasn't changed.
            return false;
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for edit on a site level.
     *
     * @return Whether or not the handler is enabled for edit on a site level.
     */
    isEnabledForEdit(): boolean | Promise<boolean> {
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
    prepareSubmissionData(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any, pluginData: any, offline?: boolean,
            userId?: number, siteId?: string): void | Promise<any> {

        if (this.hasDataChanged(assign, submission, plugin, inputData)) {
            // Data has changed, we need to upload new files and re-upload all the existing files.
            const currentFiles = this.fileSessionProvider.getFiles(AddonModAssignProvider.COMPONENT, assign.id),
                error = this.utils.hasRepeatedFilenames(currentFiles);

            if (error) {
                return Promise.reject(error);
            }

            return this.assignHelper.uploadOrStoreFiles(assign.id, AddonModAssignSubmissionFileHandler.FOLDER_NAME,
                    currentFiles, offline, userId, siteId).then((result) => {
                pluginData.files_filemanager = result;
            });
        }
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
    prepareSyncData(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, offlineData: any, pluginData: any, siteId?: string): void | Promise<any> {

        const filesData = offlineData && offlineData.plugindata && offlineData.plugindata.files_filemanager;
        if (filesData) {
            // Has some data to sync.
            let files = filesData.online || [],
                promise;

            if (filesData.offline) {
                // Has offline files, get them and add them to the list.
                promise = this.assignHelper.getStoredSubmissionFiles(assign.id, AddonModAssignSubmissionFileHandler.FOLDER_NAME,
                        submission.userid, siteId).then((result) => {
                    files = files.concat(result);
                }).catch(() => {
                    // Folder not found, no files to add.
                });
            } else {
                promise = Promise.resolve();
            }

            return promise.then(() => {
                return this.assignHelper.uploadFiles(assign.id, files, siteId).then((itemId) => {
                    pluginData.files_filemanager = itemId;
                });
            });
        }
    }
}
