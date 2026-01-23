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
import { CoreText, CoreTextFormat, DEFAULT_TEXT_FORMAT } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';

/**
 * Handler for online text submission plugin.
 */
@Injectable( { providedIn: 'root' })
export class AddonModAssignSubmissionOnlineTextHandlerService implements AddonModAssignSubmissionHandler {

    name = 'AddonModAssignSubmissionOnlineTextHandler';
    type = 'onlinetext';

    /**
     * @inheritdoc
     */
    async canContainFiltersWhenEditing(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isEmpty(assign: AddonModAssignAssign, plugin: AddonModAssignPlugin): boolean {
        const text = AddonModAssign.getSubmissionPluginText(plugin, true);

        // If the text is empty, we can ignore files because they won't be visible anyways.
        return text.trim().length === 0;
    }

    /**
     * @inheritdoc
     */
    isEmptyForEdit(
        assign: AddonModAssignAssign,
        plugin: AddonModAssignPlugin,
        inputData: AddonModAssignSubmissionOnlineTextData,
     ): boolean {
        const text = this.getTextToSubmit(plugin, inputData);

        if (CoreText.countWords(text) > 0) {
            return false;
        }

        // Check if the online text submission contains video, audio or image elements
        // that can be ignored and stripped by count_words().
        if (/<\s*((video|audio)[^>]*>(.*?)<\s*\/\s*(video|audio)>)|(img[^>]*>)/.test(text)) {
            return false;
        }

        return true;
     }

    /**
     * @inheritdoc
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
            format: DEFAULT_TEXT_FORMAT,
            itemid: itemId,
        };
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<AddonModAssignSubmissionPluginBaseComponent>> {
        const { AddonModAssignSubmissionOnlineTextComponent } = await import('../component/onlinetext');

        return AddonModAssignSubmissionOnlineTextComponent;
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
        const text = AddonModAssign.getSubmissionPluginText(plugin, true);
        const files = AddonModAssign.getSubmissionPluginAttachments(plugin);

        const filesSize = await CoreFileHelper.getTotalFilesSize(files);

        return text.length + filesSize;
    }

    /**
     * @inheritdoc
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

        return CoreFileHelper.restorePluginfileUrls(text, files || []);
    }

    /**
     * @inheritdoc
     */
    async hasDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        plugin: AddonModAssignPlugin,
        inputData: AddonModAssignSubmissionOnlineTextData,
    ): Promise<boolean> {

        // Get the original text from plugin or offline.
        const offlineData =
            await CorePromiseUtils.ignoreErrors(AddonModAssignOffline.getSubmission(assign.id, submission.userid));

        let initialText = '';
        if (offlineData?.plugindata?.onlinetext_editor) {
            initialText = (<AddonModAssignSubmissionOnlineTextPluginData>offlineData.plugindata).onlinetext_editor.text;
        } else {
            // No offline data found, get text from plugin.
            initialText = plugin.editorfields && plugin.editorfields[0] ? plugin.editorfields[0].text : '';
        }

        // Check if text has changed.
        return initialText != this.getTextToSubmit(plugin, inputData);
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
            const words = CoreText.countWords(text);
            const wordlimit = parseInt(configs.wordlimit, 10);
            if (words > wordlimit) {
                const params = { $a: { count: words, limit: wordlimit } };
                const message = Translate.instant('addon.mod_assign_submission_onlinetext.wordlimitexceeded', params);

                throw new CoreError(message);
            }
        }

        // Add some HTML to the text if needed.
        text = CoreText.formatHtmlLines(text);

        pluginData.onlinetext_editor = {
            text: text,
            format: DEFAULT_TEXT_FORMAT,
            itemid: 0, // Can't add new files yet, so we use a fake itemid.
        };
    }

    /**
     * @inheritdoc
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
        format: CoreTextFormat; // The format for this submission.
        itemid: number; // The draft area id for files attached to the submission.
    };
};
