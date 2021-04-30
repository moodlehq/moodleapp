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

import { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
import { AddonModAssignProvider, AddonModAssign } from '@addons/mod/assign/services/assign';
import { AddonModAssignOffline } from '@addons/mod/assign/services/assign-offline';
import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { AddonModAssignSubmissionOnlineTextPluginData } from '../services/handler';

/**
 * Component to render an onlinetext submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-online-text',
    templateUrl: 'addon-mod-assign-submission-onlinetext.html',
})
export class AddonModAssignSubmissionOnlineTextComponent extends AddonModAssignSubmissionPluginBaseComponent implements OnInit {

    control?: FormControl;
    words = 0;
    component = AddonModAssignProvider.COMPONENT;
    text = '';
    loaded = false;
    wordLimitEnabled = false;
    currentUserId: number;
    wordLimit = 0;

    protected wordCountTimeout?: number;
    protected element: HTMLElement;

    constructor(
        protected fb: FormBuilder,
        element: ElementRef,
    ) {
        super();
        this.element = element.nativeElement;
        this.currentUserId = CoreSites.getCurrentSiteUserId();
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        // Get the text. Check if we have anything offline.
        const offlineData = await CoreUtils.ignoreErrors(
            AddonModAssignOffline.getSubmission(this.assign.id),
            undefined,
        );

        this.wordLimitEnabled = !!parseInt(this.configs?.wordlimitenabled || '0', 10);
        this.wordLimit = parseInt(this.configs?.wordlimit || '0');

        try {
            if (offlineData && offlineData.plugindata && offlineData.plugindata.onlinetext_editor) {
                this.text = (<AddonModAssignSubmissionOnlineTextPluginData>offlineData.plugindata).onlinetext_editor.text;
            } else {
                // No offline data found, return online text.
                this.text = AddonModAssign.getSubmissionPluginText(this.plugin);
            }

            // Set the text.
            if (!this.edit) {
                // Not editing, see full text when clicked.
                this.element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (this.text) {
                        // Open a new state with the interpolated contents.
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
            } else {
                // Create and add the control.
                this.control = this.fb.control(this.text);
            }

            // Calculate initial words.
            if (this.wordLimitEnabled) {
                this.words = CoreTextUtils.countWords(this.text);
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Text changed.
     *
     * @param text The new text.
     */
    onChange(text: string): void {
        // Count words if needed.
        if (this.wordLimitEnabled) {
            // Cancel previous wait.
            clearTimeout(this.wordCountTimeout);

            // Wait before calculating, if the user keeps inputing we won't calculate.
            // This is to prevent slowing down devices, this calculation can be slow if the text is long.
            this.wordCountTimeout = window.setTimeout(() => {
                this.words = CoreTextUtils.countWords(text);
            }, 1500);
        }
    }

}
