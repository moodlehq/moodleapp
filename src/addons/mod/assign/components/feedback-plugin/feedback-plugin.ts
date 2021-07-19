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

import { Component, Input, OnInit, ViewChild, Type } from '@angular/core';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreWSFile } from '@services/ws';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignPlugin,
    AddonModAssignProvider,
    AddonModAssign,
} from '../../services/assign';
import { AddonModAssignHelper, AddonModAssignPluginConfig } from '../../services/assign-helper';
import { AddonModAssignFeedbackDelegate } from '../../services/feedback-delegate';

/**
 * Component that displays an assignment feedback plugin.
 */
@Component({
    selector: 'addon-mod-assign-feedback-plugin',
    templateUrl: 'addon-mod-assign-feedback-plugin.html',
})
export class AddonModAssignFeedbackPluginComponent implements OnInit {

    @ViewChild(CoreDynamicComponent) dynamicComponent!: CoreDynamicComponent;

    @Input() assign!: AddonModAssignAssign; // The assignment.
    @Input() submission!: AddonModAssignSubmission; // The submission.
    @Input() plugin!: AddonModAssignPlugin; // The plugin object.
    @Input() userId!: number; // The user ID of the submission.
    @Input() canEdit = false; // Whether the user can edit.
    @Input() edit = false; // Whether the user is editing.

    pluginComponent?: Type<unknown>; // Component to render the plugin.
    data?: AddonModAssignFeedbackPluginData; // Data to pass to the component.

    // Data to render the plugin if it isn't supported.
    component = AddonModAssignProvider.COMPONENT;
    text = '';
    files: CoreWSFile[] = [];
    notSupported = false;
    pluginLoaded = false;

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        if (!this.plugin) {
            this.pluginLoaded = true;

            return;
        }

        const name = AddonModAssignFeedbackDelegate.getPluginName(this.plugin);

        if (!name) {
            this.pluginLoaded = true;

            return;
        }
        this.plugin.name = name;

        // Check if the plugin has defined its own component to render itself.
        this.pluginComponent = await AddonModAssignFeedbackDelegate.getComponentForPlugin(this.plugin);

        if (this.pluginComponent) {
            // Prepare the data to pass to the component.
            this.data = {
                assign: this.assign,
                submission: this.submission,
                plugin: this.plugin,
                userId: this.userId,
                configs: AddonModAssignHelper.getPluginConfig(this.assign, 'assignfeedback', this.plugin.type),
                edit: this.edit,
                canEdit: this.canEdit,
            };
        } else {
            // Data to render the plugin.
            this.text = AddonModAssign.getSubmissionPluginText(this.plugin);
            this.files = AddonModAssign.getSubmissionPluginAttachments(this.plugin);
            this.notSupported = AddonModAssignFeedbackDelegate.isPluginSupported(this.plugin.type);
            this.pluginLoaded = true;
        }
    }

    /**
     * Invalidate the plugin data.
     *
     * @return Promise resolved when done.
     */
    async invalidate(): Promise<void> {
        await this.dynamicComponent.callComponentFunction('invalidate', []);
    }

}

export type AddonModAssignFeedbackPluginData = {
    assign: AddonModAssignAssign;
    submission: AddonModAssignSubmission;
    plugin: AddonModAssignPlugin;
    configs: AddonModAssignPluginConfig;
    edit: boolean;
    canEdit: boolean;
    userId: number;
};
