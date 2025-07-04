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

import { Component, OnInit, ElementRef, inject } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { AddonModAssign } from '@addons/mod/assign/services/assign';
import { CoreFileHelper } from '@services/file-helper';
import {
    AddonModAssignFeedbackCommentsPluginData,
} from '../services/handler';
import { AddonModAssignOffline } from '@addons/mod/assign/services/assign-offline';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { AddonModAssignFeedbackPluginBaseComponent } from '@addons/mod/assign/classes/base-feedback-plugin-component';
import { ContextLevel } from '@/core/constants';
import { ADDON_MOD_ASSIGN_COMPONENT_LEGACY } from '@addons/mod/assign/constants';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render a comments feedback plugin.
 */
@Component({
    selector: 'addon-mod-assign-feedback-comments',
    templateUrl: 'addon-mod-assign-feedback-comments.html',
    imports: [
        CoreSharedModule,
        CoreEditorRichTextEditorComponent,
    ],
})
export class AddonModAssignFeedbackCommentsComponent extends AddonModAssignFeedbackPluginBaseComponent implements OnInit {

    protected fb = inject(FormBuilder);

    control?: FormControl<string>;
    component = ADDON_MOD_ASSIGN_COMPONENT_LEGACY;
    text = '';
    isSent = false;
    loaded = false;

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.text = await this.getText();

            if (this.edit) {
                this.control = this.fb.control(this.text, { nonNullable: true });
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Open the text in a modal.
     *
     * @param e Event.
     */
    open(e: Event): void {
        // Not editing, see full text when clicked.
        e.preventDefault();
        e.stopPropagation();

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

    /**
     * Get the text for the plugin.
     *
     * @returns Promise resolved with the text.
     */
    protected async getText(): Promise<string> {
        // Check if we have anything offline.
        const offlineData = await CorePromiseUtils.ignoreErrors(
            AddonModAssignOffline.getSubmissionGrade(this.assign.id, this.userId),
            undefined,
        );

        if (offlineData?.plugindata?.assignfeedbackcomments_editor) {
            const pluginData = <AddonModAssignFeedbackCommentsPluginData>offlineData.plugindata;
            this.isSent = false;

            return this.replacePluginfileUrls(pluginData.assignfeedbackcomments_editor.text);
        }

        // No offline data found, return online text.
        this.isSent = true;

        return AddonModAssign.getSubmissionPluginText(this.plugin);
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL of embedded files.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    replacePluginfileUrls(text: string): string {
        const files = this.plugin.fileareas && this.plugin.fileareas[0] && this.plugin.fileareas[0].files;

        return CoreFileHelper.replacePluginfileUrls(text, files || []);
    }

}
