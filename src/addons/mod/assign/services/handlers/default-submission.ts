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
import { CoreWSFile } from '@services/ws';
import { Translate } from '@singletons';
import { AddonModAssignPlugin } from '../assign';
import { AddonModAssignSubmissionHandler } from '../submission-delegate';

/**
 * Default handler used when a submission plugin doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignDefaultSubmissionHandler implements AddonModAssignSubmissionHandler {

    name = 'AddonModAssignBaseSubmissionHandler';
    type = 'base';

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @return Boolean or promise resolved with boolean: whether it can be edited in offline.
     */
    canEditOffline(): boolean | Promise<boolean> {
        return false;
    }

    /**
     * Check if a plugin has no data.
     *
     * @return Whether the plugin is empty.
     */
    isEmpty(): boolean {
        return true;
    }

    /**
     * Should clear temporary data for a cancelled submission.
     */
    clearTmpData(): void {
        // Nothing to do.
    }

    /**
     * This function will be called when the user wants to create a new submission based on the previous one.
     * It should add to pluginData the data to send to server based in the data in plugin (previous attempt).
     *
     * @return If the function is async, it should return a Promise resolved when done.
     */
    copySubmissionData(): void {
        // Nothing to do.
    }

    /**
     * Delete any stored data for the plugin and submission.
     *
     * @return If the function is async, it should return a Promise resolved when done.
     */
    deleteOfflineData(): void {
        // Nothing to do.
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @return The files (or promise resolved with the files).
     */
    getPluginFiles(): CoreWSFile[] {
        return [];
    }

    /**
     * Get a readable name to use for the plugin.
     *
     * @param plugin The plugin object.
     * @return The plugin name.
     */
    getPluginName(plugin: AddonModAssignPlugin): string {
        // Check if there's a translated string for the plugin.
        const translationId = 'addon.mod_assign_submission_' + plugin.type + '.pluginname';
        const translation = Translate.instant(translationId);

        if (translationId != translation) {
            // Translation found, use it.
            return translation;
        }

        // Fallback to WS string.
        if (plugin.name) {
            return plugin.name;
        }

        return '';
    }

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @return The size (or promise resolved with size).
     */
    getSizeForCopy(): number {
        return 0;
    }

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @return The size (or promise resolved with size).
     */
    getSizeForEdit(): number {
        return 0;
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
    hasDataChanged(): boolean {
        return false;
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
        return false;
    }

    /**
     * Prefetch any required data for the plugin.
     * This should NOT prefetch files. Files to be prefetched should be returned by the getPluginFiles function.
     *
     * @return Promise resolved when done.
     */
    async prefetch(): Promise<void> {
        return;
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
    prepareSubmissionData(): void {
        // Nothing to do.
    }

    /**
     * Prepare and add to pluginData the data to send to the server based on the offline data stored.
     * This will be used when performing a synchronization.
     *
     * @return If the function is async, it should return a Promise resolved when done.
     */
    prepareSyncData(): void {
        // Nothing to do.
    }

}
