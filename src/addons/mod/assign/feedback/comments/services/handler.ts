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

import type { IAddonModAssignFeedbackPluginComponent } from '@addons/mod/assign/classes/base-feedback-plugin-component';
import {
    AddonModAssignPlugin,
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssign,
    AddonModAssignSavePluginData,
} from '@addons/mod/assign/services/assign';
import { AddonModAssignOffline } from '@addons/mod/assign/services/assign-offline';
import { AddonModAssignFeedbackHandler } from '@addons/mod/assign/services/feedback-delegate';
import { Injectable, Type } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModAssignFeedbackCommentsComponent } from '../component/comments';

/**
 * Handler for comments feedback plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignFeedbackCommentsHandlerService implements AddonModAssignFeedbackHandler {

    name = 'AddonModAssignFeedbackCommentsHandler';
    type = 'comments';

    // Store the data in this service so it isn't lost if the user performs a PTR in the page.
    protected drafts: { [draftId: string]: AddonModAssignFeedbackCommentsDraftData } = {};

    /**
     * Get the text to submit.
     *
     * @param plugin Plugin.
     * @param inputData Data entered in the feedback edit form.
     * @returns Text to submit.
     */
    getTextFromInputData(plugin: AddonModAssignPlugin, inputData: AddonModAssignFeedbackCommentsTextData): string | undefined {
        if (inputData.assignfeedbackcomments_editor === undefined) {
            return undefined;
        }

        const files = plugin.fileareas && plugin.fileareas[0] ? plugin.fileareas[0].files : [];

        return CoreTextUtils.restorePluginfileUrls(inputData.assignfeedbackcomments_editor, files || []);
    }

    /**
     * Discard the draft data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     */
    discardDraft(assignId: number, userId: number, siteId?: string): void {
        const id = this.getDraftId(assignId, userId, siteId);
        if (this.drafts[id] !== undefined) {
            delete this.drafts[id];
        }
    }

    /**
     * Return the Component to use to display the plugin data.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<IAddonModAssignFeedbackPluginComponent> {
        return AddonModAssignFeedbackCommentsComponent;
    }

    /**
     * Return the draft saved data of the feedback plugin.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Data (or promise resolved with the data).
     */
    getDraft(assignId: number, userId: number, siteId?: string): AddonModAssignFeedbackCommentsDraftData | undefined {
        const id = this.getDraftId(assignId, userId, siteId);

        if (this.drafts[id] !== undefined) {
            return this.drafts[id];
        }
    }

    /**
     * Get a draft ID.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Draft ID.
     */
    protected getDraftId(assignId: number, userId: number, siteId?: string): string {
        siteId = siteId || CoreSites.getCurrentSiteId();

        return siteId + '#' + assignId + '#' + userId;
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
     * Check if the feedback data has changed for this plugin.
     *
     * @param assign The assignment.
     * @param submission The submission.
     * @param plugin The plugin object.
     * @param inputData Data entered by the user for the feedback.
     * @param userId User ID of the submission.
     * @returns Boolean (or promise resolved with boolean): whether the data has changed.
     */
    async hasDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: AddonModAssignFeedbackCommentsTextData,
        userId: number,
    ): Promise<boolean> {
        // Get it from plugin or offline.
        const offlineData = await CoreUtils.ignoreErrors(
            AddonModAssignOffline.getSubmissionGrade(assign.id, userId),
            undefined,
        );

        if (offlineData?.plugindata?.assignfeedbackcomments_editor) {
            const pluginData = <AddonModAssignFeedbackCommentsPluginData>offlineData.plugindata;

            return !!pluginData.assignfeedbackcomments_editor.text;
        }

        // No offline data found, get text from plugin.
        const initialText = AddonModAssign.getSubmissionPluginText(plugin);
        const newText = AddonModAssignFeedbackCommentsHandler.getTextFromInputData(plugin, inputData);

        if (newText === undefined) {
            return false;
        }

        // Check if text has changed.
        return initialText != newText;
    }

    /**
     * Check whether the plugin has draft data stored.
     *
     * @param assignId The assignment ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Boolean or promise resolved with boolean: whether the plugin has draft data.
     */
    hasDraftData(assignId: number, userId: number, siteId?: string): boolean | Promise<boolean> {
        const draft = this.getDraft(assignId, userId, siteId);

        return !!draft;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
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
     */
    prepareFeedbackData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        siteId?: string,
    ): void {

        const draft = this.getDraft(assignId, userId, siteId);

        if (draft) {
            // Add some HTML to the text if needed.
            draft.text = CoreTextUtils.formatHtmlLines(draft.text);

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
     */
    saveDraft(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        data: AddonModAssignFeedbackCommentsDraftData,
        siteId?: string,
    ): void {

        if (data) {
            this.drafts[this.getDraftId(assignId, userId, siteId)] = data;
        }
    }

}
export const AddonModAssignFeedbackCommentsHandler = makeSingleton(AddonModAssignFeedbackCommentsHandlerService);

export type AddonModAssignFeedbackCommentsTextData = {
    // The text for this submission.
    assignfeedbackcomments_editor: string; // eslint-disable-line @typescript-eslint/naming-convention
};

export type AddonModAssignFeedbackCommentsDraftData = {
    text: string; // The text for this feedback.
    format: number; // The format for this feedback.
};

export type AddonModAssignFeedbackCommentsPluginData = {
    // Editor structure.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    assignfeedbackcomments_editor: AddonModAssignFeedbackCommentsDraftData;
};
