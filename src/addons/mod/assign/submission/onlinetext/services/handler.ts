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

import type { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
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
import { CoreError } from '@classes/errors/error';
import { CoreFileHelper } from '@services/file-helper';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModAssignSubmissionOnlineTextComponent } from '../component/onlinetext';

/**
 * Handler for online text submission plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignSubmissionOnlineTextHandlerService implements AddonModAssignSubmissionHandler {

    name = 'AddonModAssignSubmissionOnlineTextHandler';
    type = 'onlinetext';

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @returns Boolean or promise resolved with boolean: whether it can be edited in offline.
     */
    canEditOffline(): boolean {
        // This plugin uses Moodle filters, it cannot be edited in offline.
        return false;
    }

    /**
     * Check if a plugin has no data.
     *
     * @param assign The assignment.
     * @param plugin The plugin object.
     * @returns Whether the plugin is empty.
     */
    isEmpty(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): boolean {
        const text = AddonModAssign.getSubmissionPluginText(plugin, true);

        // If the text is empty, we can ignore files because they won't be visible anyways.
        return text.trim().length === 0;
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
     * @returns If the function is async, it should return a Promise resolved when done.
     */
    async copySubmissionData(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSubmissionOnlineTextPluginData,
        userId?: number,
        siteId?: string,
    ): Promise<void> {

        const text = AddonModAssign.getSubmissionPluginText(plugin, true);
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);
        let itemId = 0;

        if (files.length) {
            // Re-upload the files.
            itemId = await AddonModAssignHelper.uploadFiles(assign.id, files, siteId);
        }

        pluginData.onlinetext_editor = {
            text: text,
            format: 1,
            itemid: itemId,
        };
    }

    /**
     * Return the Component to use to display the plugin data, either in read or in edit mode.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<AddonModAssignSubmissionPluginBaseComponent> {
        return AddonModAssignSubmissionOnlineTextComponent;
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @returns The files (or promise resolved with the files).
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
     * @returns The size (or promise resolved with size).
     */
    async getSizeForCopy(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): Promise<number> {
        const text = AddonModAssign.getSubmissionPluginText(plugin, true);
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);

        const filesSize = await CoreFileHelper.getTotalFilesSize(files);

        return text.length + filesSize;
    }

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @returns The size (or promise resolved with size).
     */
    getSizeForEdit(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
    ): number {
        const text = AddonModAssign.getSubmissionPluginText(plugin, true);

        return text.length;
    }

    /**
     * Get the text to submit.
     *
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @returns Text to submit.
     */
    protected getTextToSubmit(plugin: AddonModAssignPlugin, inputData: AddonModAssignSubmissionOnlineTextData): string {
        const text = inputData.onlinetext_editor_text;
        const files = plugin.fileareas && plugin.fileareas[0] && plugin.fileareas[0].files || [];

        return CoreTextUtils.restorePluginfileUrls(text, files || []);
    }

    /**
     * Check if the submission data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the submission.
     * @returns Boolean (or promise resolved with boolean): whether the data has changed.
     */
    async hasDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: AddonModAssignSubmissionOnlineTextData,
    ): Promise<boolean> {

        // Get the original text from plugin or offline.
        const offlineData =
            await CoreUtils.ignoreErrors(AddonModAssignOffline.getSubmission(assign.id, submission.userid));

        let initialText = '';
        if (offlineData && offlineData.plugindata && offlineData.plugindata.onlinetext_editor) {
            initialText = (<AddonModAssignSubmissionOnlineTextPluginData>offlineData.plugindata).onlinetext_editor.text;
        } else {
            // No offline data found, get text from plugin.
            initialText = plugin.editorfields && plugin.editorfields[0] ? plugin.editorfields[0].text : '';
        }

        // Check if text has changed.
        return initialText != this.getTextToSubmit(plugin, inputData);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for edit on a site level.
     *
     * @returns Whether or not the handler is enabled for edit on a site level.
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
     */
    prepareSubmissionData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: AddonModAssignSubmissionOnlineTextData,
        pluginData: AddonModAssignSubmissionOnlineTextPluginData,
    ): void {

        let text = this.getTextToSubmit(plugin, inputData);

        // Check word limit.
        const configs = AddonModAssignHelper.getPluginConfig(assign, 'assignsubmission', plugin.type);
        if (parseInt(configs.wordlimitenabled, 10)) {
            const words = CoreTextUtils.countWords(text);
            const wordlimit = parseInt(configs.wordlimit, 10);
            if (words > wordlimit) {
                const params = { $a: { count: words, limit: wordlimit } };
                const message = Translate.instant('addon.mod_assign_submission_onlinetext.wordlimitexceeded', params);

                throw new CoreError(message);
            }
        }

        // Add some HTML to the text if needed.
        text = CoreTextUtils.formatHtmlLines(text);

        pluginData.onlinetext_editor = {
            text: text,
            format: 1,
            itemid: 0, // Can't add new files yet, so we use a fake itemid.
        };
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
     */
    prepareSyncData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        offlineData: AddonModAssignSubmissionsDBRecordFormatted,
        pluginData: AddonModAssignSubmissionOnlineTextPluginData,
    ): void {

        const offlinePluginData = <AddonModAssignSubmissionOnlineTextPluginData>(offlineData && offlineData.plugindata);
        const textData = offlinePluginData.onlinetext_editor;
        if (textData) {
            // Has some data to sync.
            pluginData.onlinetext_editor = textData;
        }
    }

}
export const AddonModAssignSubmissionOnlineTextHandler = makeSingleton(AddonModAssignSubmissionOnlineTextHandlerService);

export type AddonModAssignSubmissionOnlineTextData = {
    // The text for this submission.
    onlinetext_editor_text: string; // eslint-disable-line @typescript-eslint/naming-convention
};

export type AddonModAssignSubmissionOnlineTextPluginData = {
    // Editor structure.
    onlinetext_editor: { // eslint-disable-line @typescript-eslint/naming-convention
        text: string; // The text for this submission.
        format: number; // The format for this submission.
        itemid: number; // The draft area id for files attached to the submission.
    };
};
