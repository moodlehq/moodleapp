
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
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import {
    AddonModAssignProvider, AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin
} from '../../../providers/assign';
import { AddonModAssignOfflineProvider } from '../../../providers/assign-offline';
import { AddonModAssignFeedbackHandler } from '../../../providers/feedback-delegate';
import { AddonModAssignFeedbackCommentsComponent } from '../component/comments';

/**
 * Handler for comments feedback plugin.
 */
@Injectable()
export class AddonModAssignFeedbackCommentsHandler implements AddonModAssignFeedbackHandler {
    name = 'AddonModAssignFeedbackCommentsHandler';
    type = 'comments';

    protected drafts = {}; // Store the data in this service so it isn't lost if the user performs a PTR in the page.

    constructor(private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider,
            private assignProvider: AddonModAssignProvider, private assignOfflineProvider: AddonModAssignOfflineProvider) { }

    /**
     * Discard the draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    discardDraft(assignId: number, userId: number, siteId?: string): void | Promise<any> {
        const id = this.getDraftId(assignId, userId, siteId);
        if (typeof this.drafts[id] != 'undefined') {
            delete this.drafts[id];
        }
    }

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param plugin The plugin object.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, plugin: AddonModAssignPlugin): any | Promise<any> {
        return AddonModAssignFeedbackCommentsComponent;
    }

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Data (or promise resolved with the data).
     */
    getDraft(assignId: number, userId: number, siteId?: string): any | Promise<any> {
        const id = this.getDraftId(assignId, userId, siteId);

        if (typeof this.drafts[id] != 'undefined') {
            return this.drafts[id];
        }
    }

    /**
     * Get a draft ID.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Draft ID.
     */
    protected getDraftId(assignId: number, userId: number, siteId?: string): string {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return siteId + '#' + assignId + '#' + userId;
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
     * Get the text to submit.
     *
     * @param textUtils Text utils instance.
     * @param plugin Plugin.
     * @param inputData Data entered in the feedback edit form.
     * @return Text to submit.
     */
    static getTextFromInputData(textUtils: CoreTextUtilsProvider, plugin: any, inputData: any): string {
        const files = plugin.fileareas && plugin.fileareas[0] ? plugin.fileareas[0].files : [];
        let text = inputData.assignfeedbackcomments_editor;

        // The input data can have a string or an object with text and format. Get the text.
        if (text && text.text) {
            text = text.text;
        }

        return textUtils.restorePluginfileUrls(text, files);
    }

    /**
     * Check if the feedback data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the feedback.
     * @param userId User ID of the submission.
     * @return Boolean (or promise resolved with boolean): whether the data has changed.
     */
    hasDataChanged(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            plugin: AddonModAssignPlugin, inputData: any, userId: number): boolean | Promise<boolean> {

        // Get it from plugin or offline.
        return this.assignOfflineProvider.getSubmissionGrade(assign.id, userId).catch(() => {
            // No offline data found.
        }).then((data) => {
            if (data && data.plugindata && data.plugindata.assignfeedbackcomments_editor) {
                return data.plugindata.assignfeedbackcomments_editor.text;
            }

            // No offline data found, get text from plugin.
            return this.assignProvider.getSubmissionPluginText(plugin);
        }).then((initialText) => {
            const newText = AddonModAssignFeedbackCommentsHandler.getTextFromInputData(this.textUtils, plugin, inputData);

            if (typeof newText == 'undefined') {
                return false;
            }

            // Check if text has changed.
            return initialText != newText;
        });
    }

    /**
     * Check whether the plugin has draft data stored.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Boolean or promise resolved with boolean: whether the plugin has draft data.
     */
    hasDraftData(assignId: number, userId: number, siteId?: string): boolean | Promise<boolean> {
        const draft = this.getDraft(assignId, userId, siteId);

        return !!draft;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        // In here we should check if comments is not disabled in site.
        // But due to this is not a common comments place and it can be disabled separately into Moodle (disabling the plugin).
        // We are leaving it always enabled. It's also a teacher's feature.
        return true;
    }

    /**
     * Prepare and add to pluginData the data to send to the server based on the draft data saved.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param pluginData Object where to store the data to send.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    prepareFeedbackData(assignId: number, userId: number, plugin: AddonModAssignPlugin, pluginData: any,
            siteId?: string): void | Promise<any> {

        const draft = this.getDraft(assignId, userId, siteId);

        if (draft) {
            // Add some HTML to the text if needed.
            draft.text = this.textUtils.formatHtmlLines(draft.text);

            pluginData.assignfeedbackcomments_editor = draft;
        }
    }

    /**
     * Save draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param plugin The plugin object.
     * @param data The data to save.
     * @param siteId Site ID. If not defined, current site.
     * @return If the function is async, it should return a Promise resolved when done.
     */
    saveDraft(assignId: number, userId: number, plugin: AddonModAssignPlugin, data: any, siteId?: string)
            : void | Promise<any> {

        if (data) {
            this.drafts[this.getDraftId(assignId, userId, siteId)] = data;
        }
    }
}
