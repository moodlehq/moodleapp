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
import { AddonModAssign } from '@addons/mod/assign/services/assign';
import { AddonModAssignOffline } from '@addons/mod/assign/services/assign-offline';
import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { AddonModAssignSubmissionOnlineTextPluginData } from '../services/handler';
import { ContextLevel } from '@/core/constants';
import { ADDON_MOD_ASSIGN_COMPONENT } from '@addons/mod/assign/constants';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render an onlinetext submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-online-text',
    templateUrl: 'addon-mod-assign-submission-onlinetext.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreEditorRichTextEditorComponent,
    ],
})
export class AddonModAssignSubmissionOnlineTextComponent extends AddonModAssignSubmissionPluginBaseComponent implements OnInit {

    control?: FormControl<string>;
    words = 0;
    component = ADDON_MOD_ASSIGN_COMPONENT;
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
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Get the text. Check if we have anything offline.
        const offlineData = await CorePromiseUtils.ignoreErrors(
            AddonModAssignOffline.getSubmission(this.assign.id),
            undefined,
        );

        this.wordLimitEnabled = !!parseInt(this.configs?.wordlimitenabled || '0', 10);
        this.wordLimit = parseInt(this.configs?.wordlimit || '0');

        try {
            if (offlineData && offlineData.plugindata) {
                // Offline submission, get text if submission is not removed.
                if (offlineData.plugindata.onlinetext_editor) {
                    this.text = (<AddonModAssignSubmissionOnlineTextPluginData>offlineData.plugindata).onlinetext_editor.text;
                }
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
                        CoreViewer.viewText(this.plugin.name, this.text, {
                            component: this.component,
                            componentId: this.assign.cmid,
                            filter: true,
                            contextLevel: ContextLevel.MODULE,
                            instanceId: this.assign.cmid,
                            courseId: this.assign.course,
                        });
                    }
                });
            } else {
                // Create and add the control.
                this.control = this.fb.control(this.text, { nonNullable: true });
            }

            // Calculate initial words.
            if (this.wordLimitEnabled) {
                this.words = CoreText.countWords(this.text);
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
    onChange(text?: string | null): void {
        // Count words if needed.
        if (this.wordLimitEnabled) {
            // Cancel previous wait.
            clearTimeout(this.wordCountTimeout);

            // Wait before calculating, if the user keeps inputing we won't calculate.
            // This is to prevent slowing down devices, this calculation can be slow if the text is long.
            this.wordCountTimeout = window.setTimeout(() => {
                this.words = CoreText.countWords(text);
            }, 1500);
        }
    }

}
