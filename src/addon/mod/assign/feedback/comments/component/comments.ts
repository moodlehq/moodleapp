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

import { Component, OnInit, ElementRef } from '@angular/core';
import { ModalController } from 'ionic-angular';
import { FormBuilder, FormControl } from '@angular/forms';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModAssignProvider } from '../../../providers/assign';
import { AddonModAssignOfflineProvider } from '../../../providers/assign-offline';
import { AddonModAssignFeedbackDelegate } from '../../../providers/feedback-delegate';
import { AddonModAssignFeedbackPluginComponentBase } from '../../../classes/feedback-plugin-component';
import { AddonModAssignFeedbackCommentsHandler } from '../providers/handler';

/**
 * Component to render a comments feedback plugin.
 */
@Component({
    selector: 'addon-mod-assign-feedback-comments',
    templateUrl: 'addon-mod-assign-feedback-comments.html'
})
export class AddonModAssignFeedbackCommentsComponent extends AddonModAssignFeedbackPluginComponentBase implements OnInit {

    control: FormControl;
    component = AddonModAssignProvider.COMPONENT;
    text: string;
    isSent: boolean;
    loaded: boolean;

    protected element: HTMLElement;

    constructor(modalCtrl: ModalController, element: ElementRef, protected domUtils: CoreDomUtilsProvider,
            protected textUtils: CoreTextUtilsProvider, protected assignOfflineProvider: AddonModAssignOfflineProvider,
            protected assignProvider: AddonModAssignProvider, protected fb: FormBuilder,
            protected feedbackDelegate: AddonModAssignFeedbackDelegate) {
        super(modalCtrl);

        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.getText().then((text) => {

            this.text = text;

            if (!this.canEdit && !this.edit) {
                // User cannot edit the comment. Show it full when clicked.
                this.element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (this.text) {
                        // Open a new state with the text.
                        this.textUtils.expandText(this.plugin.name, this.text, this.component, this.assign.cmid);
                    }
                });
            } else if (this.edit) {
                this.control = this.fb.control(text);
            }
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Edit the comment.
     */
    editComment(): void {
        this.editFeedback().then((inputData) => {
            const text = AddonModAssignFeedbackCommentsHandler.getTextFromInputData(this.textUtils, this.plugin, inputData);

            // Update the text and save it as draft.
            this.isSent = false;
            this.text = this.replacePluginfileUrls(text);
            this.feedbackDelegate.saveFeedbackDraft(this.assign.id, this.userId, this.plugin, {
                text: text,
                format: 1
            });
        }).catch(() => {
            // User cancelled, nothing to do.
        });
    }

    /**
     * Get the text for the plugin.
     *
     * @return {Promise<string>} Promise resolved with the text.
     */
    protected getText(): Promise<string> {
        // Check if the user already modified the comment.
        return this.feedbackDelegate.getPluginDraftData(this.assign.id, this.userId, this.plugin).then((draft) => {
            if (draft) {
                this.isSent = false;

                return this.replacePluginfileUrls(draft.text);
            } else {
                // There is no draft saved. Check if we have anything offline.
                return this.assignOfflineProvider.getSubmissionGrade(this.assign.id, this.userId).catch(() => {
                    // No offline data found.
                }).then((offlineData) => {
                    if (offlineData && offlineData.plugindata && offlineData.plugindata.assignfeedbackcomments_editor) {
                        // Save offline as draft.
                        this.isSent = false;
                        this.feedbackDelegate.saveFeedbackDraft(this.assign.id, this.userId, this.plugin,
                                offlineData.plugindata.assignfeedbackcomments_editor);

                        return this.replacePluginfileUrls(offlineData.plugindata.assignfeedbackcomments_editor.text);
                    }

                    // No offline data found, return online text.
                    this.isSent = true;

                    return this.assignProvider.getSubmissionPluginText(this.plugin);
                });
            }
        });
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL of embedded files.
     *
     * @param {string} Text to treat.
     * @return {string} Treated text.
     */
    replacePluginfileUrls(text: string): string {
        const files = this.plugin.fileareas && this.plugin.fileareas[0] && this.plugin.fileareas[0].files;

        return this.textUtils.replacePluginfileUrls(text, files || []);
    }
}
