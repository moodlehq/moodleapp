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

import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { AddonModAssign, AddonModAssignProvider } from '@addons/mod/assign/services/assign';
import { CoreTextUtils } from '@services/utils/text';
import {
    AddonModAssignFeedbackCommentsDraftData,
    AddonModAssignFeedbackCommentsHandler,
    AddonModAssignFeedbackCommentsPluginData,
} from '../services/handler';
import { AddonModAssignFeedbackDelegate } from '@addons/mod/assign/services/feedback-delegate';
import { AddonModAssignOffline } from '@addons/mod/assign/services/assign-offline';
import { CoreUtils } from '@services/utils/utils';
import { AddonModAssignFeedbackPluginBaseComponent } from '@addons/mod/assign/classes/base-feedback-plugin-component';
/**
 * Component to render a comments feedback plugin.
 */
@Component({
    selector: 'addon-mod-assign-feedback-comments',
    templateUrl: 'addon-mod-assign-feedback-comments.html',
})
export class AddonModAssignFeedbackCommentsComponent extends AddonModAssignFeedbackPluginBaseComponent implements OnInit {

    control?: FormControl;
    component = AddonModAssignProvider.COMPONENT;
    text = '';
    isSent = false;
    loaded = false;

    protected element: HTMLElement;

    constructor(
        element: ElementRef,
        protected fb: FormBuilder,
    ) {
        super();
        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        try {
            this.text = await this.getText();

            if (!this.canEdit && !this.edit) {
                // User cannot edit the comment. Show it full when clicked.
                this.element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (this.text) {
                        // Open a new state with the text.
                        CoreTextUtils.viewText(this.plugin.name, this.text, {
                            component: this.component,
                            componentId: this.assign.cmid,
                            filter: true,
                            contextLevel: 'module',
                            instanceId: this.assign.cmid,
                            courseId: this.assign.course,
                        });
                    }
                });
            } else if (this.edit) {
                this.control = this.fb.control(this.text);
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Edit the comment.
     */
    async editComment(): Promise<void> {
        try {
            const inputData = await this.editFeedback();
            const text = AddonModAssignFeedbackCommentsHandler.getTextFromInputData(this.plugin, inputData);

            // Update the text and save it as draft.
            this.isSent = false;
            this.text = this.replacePluginfileUrls(text || '');
            AddonModAssignFeedbackDelegate.saveFeedbackDraft(this.assign.id, this.userId, this.plugin, {
                text: text,
                format: 1,
            });
        } catch {
            // User cancelled, nothing to do.
        }
    }

    /**
     * Get the text for the plugin.
     *
     * @return Promise resolved with the text.
     */
    protected async getText(): Promise<string> {
        // Check if the user already modified the comment.
        const draft: AddonModAssignFeedbackCommentsDraftData | undefined =
            await AddonModAssignFeedbackDelegate.getPluginDraftData(this.assign.id, this.userId, this.plugin);

        if (draft) {
            this.isSent = false;

            return this.replacePluginfileUrls(draft.text);
        }

        // There is no draft saved. Check if we have anything offline.
        const offlineData = await CoreUtils.ignoreErrors(
            AddonModAssignOffline.getSubmissionGrade(this.assign.id, this.userId),
            undefined,
        );

        if (offlineData && offlineData.plugindata && offlineData.plugindata.assignfeedbackcomments_editor) {
            const pluginData = <AddonModAssignFeedbackCommentsPluginData>offlineData.plugindata;

            // Save offline as draft.
            this.isSent = false;
            AddonModAssignFeedbackDelegate.saveFeedbackDraft(
                this.assign.id,
                this.userId,
                this.plugin,
                pluginData.assignfeedbackcomments_editor,
            );

            return this.replacePluginfileUrls(pluginData.assignfeedbackcomments_editor.text);
        }

        // No offline data found, return online text.
        this.isSent = true;

        return AddonModAssign.getSubmissionPluginText(this.plugin);
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL of embedded files.
     *
     * @param Text to treat.
     * @return Treated text.
     */
    replacePluginfileUrls(text: string): string {
        const files = this.plugin.fileareas && this.plugin.fileareas[0] && this.plugin.fileareas[0].files;

        return CoreTextUtils.replacePluginfileUrls(text, files || []);
    }

}
