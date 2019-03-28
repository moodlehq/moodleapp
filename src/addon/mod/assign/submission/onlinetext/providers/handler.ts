
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

import { Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreWSProvider } from '@providers/ws';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModAssignProvider } from '../../../providers/assign';
import { AddonModAssignOfflineProvider } from '../../../providers/assign-offline';
import { AddonModAssignHelperProvider } from '../../../providers/helper';
import { AddonModAssignSubmissionHandler } from '../../../providers/submission-delegate';
import { AddonModAssignSubmissionOnlineTextComponent } from '../component/onlinetext';

/**
 * Handler for online text submission plugin.
 */
@Injectable()
export class AddonModAssignSubmissionOnlineTextHandler implements AddonModAssignSubmissionHandler {
    name = 'AddonModAssignSubmissionOnlineTextHandler';
    type = 'onlinetext';

    constructor(private translate: TranslateService, private sitesProvider: CoreSitesProvider, private wsProvider: CoreWSProvider,
        private textUtils: CoreTextUtilsProvider, private assignProvider: AddonModAssignProvider,
        private assignOfflineProvider: AddonModAssignOfflineProvider, private assignHelper: AddonModAssignHelperProvider) { }

    /**
     * Whether the plugin can be edited in offline for existing submissions. In general, this should return false if the
     * plugin uses Moodle filters. The reason is that the app only prefetches filtered data, and the user should edit
     * unfiltered data.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @return {boolean|Promise<boolean>} Boolean or promise resolved with boolean: whether it can be edited in offline.
     */
    canEditOffline(assign: any, submission: any, plugin: any): boolean | Promise<boolean> {
        // This plugin uses Moodle filters, it cannot be edited in offline.
        return false;
    }

    /**
     * This function will be called when the user wants to create a new submission based on the previous one.
     * It should add to pluginData the data to send to server based in the data in plugin (previous attempt).
     *
     * @param {any} assign The assignment.
     * @param {any} plugin The plugin object.
     * @param {any} pluginData Object where to store the data to send.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} If the function is async, it should return a Promise resolved when done.
     */
    copySubmissionData(assign: any, plugin: any, pluginData: any, userId?: number, siteId?: string): void | Promise<any> {
        const text = this.assignProvider.getSubmissionPluginText(plugin, true),
            files = this.assignProvider.getSubmissionPluginAttachments(plugin);
        let promise;

        if (!files.length) {
            // No files to copy, no item ID.
            promise = Promise.resolve(0);
        } else {
            // Re-upload the files.
            promise = this.assignHelper.uploadFiles(assign.id, files, siteId);
        }

        return promise.then((itemId) => {
            pluginData.onlinetext_editor = {
                text: text,
                format: 1,
                itemid: itemId
            };
        });
    }

    /**
     * Return the Component to use to display the plugin data, either in read or in edit mode.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} plugin The plugin object.
     * @param {boolean} [edit] Whether the user is editing.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, plugin: any, edit?: boolean): any | Promise<any> {
        return AddonModAssignSubmissionOnlineTextComponent;
    }

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {any[]|Promise<any[]>} The files (or promise resolved with the files).
     */
    getPluginFiles(assign: any, submission: any, plugin: any, siteId?: string): any[] | Promise<any[]> {
        return this.assignProvider.getSubmissionPluginAttachments(plugin);
    }

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous submission.
     *
     * @param {any} assign The assignment.
     * @param {any} plugin The plugin object.
     * @return {number|Promise<number>} The size (or promise resolved with size).
     */
    getSizeForCopy(assign: any, plugin: any): number | Promise<number> {
        const text = this.assignProvider.getSubmissionPluginText(plugin, true),
            files = this.assignProvider.getSubmissionPluginAttachments(plugin),
            promises = [];
        let totalSize = text.length;

        if (!files.length) {
            return totalSize;
        }

        files.forEach((file) => {
            promises.push(this.wsProvider.getRemoteFileSize(file.fileurl).then((size) => {
                if (size == -1) {
                    // Couldn't determine the size, reject.
                    return Promise.reject(null);
                }

                totalSize += size;
            }));
        });

        return Promise.all(promises).then(() => {
            return totalSize;
        });
    }

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @return {number|Promise<number>} The size (or promise resolved with size).
     */
    getSizeForEdit(assign: any, submission: any, plugin: any, inputData: any): number | Promise<number> {
        const text = this.assignProvider.getSubmissionPluginText(plugin, true);

        return text.length;
    }

    /**
     * Get the text to submit.
     *
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @return {string} Text to submit.
     */
    protected getTextToSubmit(plugin: any, inputData: any): string {
        const text = inputData.onlinetext_editor_text,
            files = plugin.fileareas && plugin.fileareas[0] ? plugin.fileareas[0].files : [];

        return this.textUtils.restorePluginfileUrls(text, files);
    }

    /**
     * Check if the submission data has changed for this plugin.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @return {boolean|Promise<boolean>} Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged(assign: any, submission: any, plugin: any, inputData: any): boolean | Promise<boolean> {
        // Get the original text from plugin or offline.
        return this.assignOfflineProvider.getSubmission(assign.id, submission.userid).catch(() => {
            // No offline data found.
        }).then((data) => {
            if (data && data.plugindata && data.plugindata.onlinetext_editor) {
                return data.plugindata.onlinetext_editor.text;
            }

            // No offline data found, get text from plugin.
            return plugin.editorfields && plugin.editorfields[0] ? plugin.editorfields[0].text : '';
        }).then((initialText) => {
            // Check if text has changed.
            return initialText != this.getTextToSubmit(plugin, inputData);
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for edit on a site level.
     *
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled for edit on a site level.
     */
    isEnabledForEdit(): boolean | Promise<boolean> {
        // There's a bug in Moodle 3.1.0 that doesn't allow submitting HTML, so we'll disable this plugin in that case.
        // Bug was fixed in 3.1.1 minor release and in 3.2.
        const currentSite = this.sitesProvider.getCurrentSite();

        return currentSite.isVersionGreaterEqualThan('3.1.1') || currentSite.checkIfAppUsesLocalMobile();
    }

    /**
     * Prepare and add to pluginData the data to send to the server based on the input data.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} inputData Data entered by the user for the submission.
     * @param {any} pluginData Object where to store the data to send.
     * @param {boolean} [offline] Whether the user is editing in offline.
     * @param {number} [userId] User ID. If not defined, site's current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} If the function is async, it should return a Promise resolved when done.
     */
    prepareSubmissionData(assign: any, submission: any, plugin: any, inputData: any, pluginData: any, offline?: boolean,
            userId?: number, siteId?: string): void | Promise<any> {

        let text = this.getTextToSubmit(plugin, inputData);

        // Check word limit.
        const configs = this.assignHelper.getPluginConfig(assign, 'assignsubmission', plugin.type);
        if (parseInt(configs.wordlimitenabled, 10)) {
            const words = this.textUtils.countWords(text);
            const wordlimit = parseInt(configs.wordlimit, 10);
            if (words > wordlimit) {
                const params = {$a: {count: words, limit: wordlimit}};
                const message = this.translate.instant('addon.mod_assign_submission_onlinetext.wordlimitexceeded', params);

                return Promise.reject(message);
            }
        }

        // Add some HTML to the text if needed.
        text = this.textUtils.formatHtmlLines(text);

        pluginData.onlinetext_editor = {
            text: text,
            format: 1,
            itemid: 0 // Can't add new files yet, so we use a fake itemid.
        };
    }

    /**
     * Prepare and add to pluginData the data to send to the server based on the offline data stored.
     * This will be used when performing a synchronization.
     *
     * @param {any} assign The assignment.
     * @param {any} submission The submission.
     * @param {any} plugin The plugin object.
     * @param {any} offlineData Offline data stored.
     * @param {any} pluginData Object where to store the data to send.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} If the function is async, it should return a Promise resolved when done.
     */
    prepareSyncData(assign: any, submission: any, plugin: any, offlineData: any, pluginData: any, siteId?: string)
            : void | Promise<any> {

        const textData = offlineData && offlineData.plugindata && offlineData.plugindata.onlinetext_editor;
        if (textData) {
            // Has some data to sync.
            pluginData.onlinetext_editor = textData;
        }
    }
}
