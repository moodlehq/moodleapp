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
import { CoreText, CoreTextFormat, DEFAULT_TEXT_FORMAT } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreFileHelper } from '@services/file-helper';

/**
 * Handler for comments feedback plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignFeedbackCommentsHandlerService implements AddonModAssignFeedbackHandler {

    name = 'AddonModAssignFeedbackCommentsHandler';
    type = 'comments';

    /**
     * @inheritdoc
     */
    async canContainFiltersWhenEditing(): Promise<boolean> {
        return true;
    }

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

        return CoreFileHelper.restorePluginfileUrls(inputData.assignfeedbackcomments_editor, files || []);
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<IAddonModAssignFeedbackPluginComponent>> {
        const { AddonModAssignFeedbackCommentsComponent } = await import('../component/comments');

        return AddonModAssignFeedbackCommentsComponent;
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
    async hasDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: AddonModAssignFeedbackCommentsTextData,
        userId: number,
    ): Promise<boolean> {
        // Get it from plugin or offline.
        const offlineData = await CorePromiseUtils.ignoreErrors(
            AddonModAssignOffline.getSubmissionGrade(assign.id, userId),
            undefined,
        );

        // Get the initial text from the offline data, or from the plugin data if no offline data.
        const initialText = offlineData?.plugindata?.assignfeedbackcomments_editor ?
            (<AddonModAssignFeedbackCommentsPluginData> offlineData.plugindata).assignfeedbackcomments_editor.text :
            AddonModAssign.getSubmissionPluginText(plugin);

        const newText = AddonModAssignFeedbackCommentsHandler.getTextFromInputData(plugin, inputData);

        if (newText === undefined) {
            return false;
        }

        // Check if text has changed.
        return initialText !== newText;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        // In here we should check if comments is not disabled in site.
        // But due to this is not a common comments place and it can be disabled separately into Moodle (disabling the plugin).
        // We are leaving it always enabled. It's also a teacher's feature.
        return true;
    }

    /**
     * @inheritdoc
     */
    prepareFeedbackData(
        assignId: number,
        userId: number,
        plugin: AddonModAssignPlugin,
        pluginData: AddonModAssignSavePluginData,
        inputData: AddonModAssignFeedbackCommentsTextData,
    ): void {
        const text = AddonModAssignFeedbackCommentsHandler.getTextFromInputData(plugin, inputData);
        if (!text) {
            return;
        }

        const data: AddonModAssignFeedbackCommentsInputData = {
            text: CoreText.formatHtmlLines(text),
            format: DEFAULT_TEXT_FORMAT,
        };
        pluginData.assignfeedbackcomments_editor = data;
    }

}
export const AddonModAssignFeedbackCommentsHandler = makeSingleton(AddonModAssignFeedbackCommentsHandlerService);

export type AddonModAssignFeedbackCommentsTextData = {
    // The text for this submission.
    assignfeedbackcomments_editor: string; // eslint-disable-line @typescript-eslint/naming-convention
};

type AddonModAssignFeedbackCommentsInputData = {
    text: string; // The text for this feedback.
    format: CoreTextFormat; // The format for this feedback.
};

export type AddonModAssignFeedbackCommentsPluginData = {
    // Editor structure.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    assignfeedbackcomments_editor: AddonModAssignFeedbackCommentsInputData;
};
