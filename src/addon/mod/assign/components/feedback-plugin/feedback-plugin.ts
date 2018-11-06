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

import { Component, Input, OnInit, Injector, ViewChild } from '@angular/core';
import { AddonModAssignProvider } from '../../providers/assign';
import { AddonModAssignHelperProvider } from '../../providers/helper';
import { AddonModAssignFeedbackDelegate } from '../../providers/feedback-delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';

/**
 * Component that displays an assignment feedback plugin.
 */
@Component({
    selector: 'addon-mod-assign-feedback-plugin',
    templateUrl: 'addon-mod-assign-feedback-plugin.html',
})
export class AddonModAssignFeedbackPluginComponent implements OnInit {
    @ViewChild(CoreDynamicComponent) dynamicComponent: CoreDynamicComponent;

    @Input() assign: any; // The assignment.
    @Input() submission: any; // The submission.
    @Input() plugin: any; // The plugin object.
    @Input() userId: number; // The user ID of the submission.
    @Input() canEdit: boolean | string; // Whether the user can edit.
    @Input() edit: boolean | string; // Whether the user is editing.

    pluginComponent: any; // Component to render the plugin.
    data: any; // Data to pass to the component.

    // Data to render the plugin if it isn't supported.
    component = AddonModAssignProvider.COMPONENT;
    text = '';
    files = [];
    notSupported: boolean;
    pluginLoaded: boolean;

    constructor(protected injector: Injector, protected feedbackDelegate: AddonModAssignFeedbackDelegate,
            protected assignProvider: AddonModAssignProvider, protected assignHelper: AddonModAssignHelperProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.plugin) {
            this.pluginLoaded = true;

            return;
        }

        this.plugin.name = this.feedbackDelegate.getPluginName(this.plugin);
        if (!this.plugin.name) {
            this.pluginLoaded = true;

            return;
        }

        this.edit = this.edit && this.edit !== 'false';
        this.canEdit = this.canEdit && this.canEdit !== 'false';

        // Check if the plugin has defined its own component to render itself.
        this.feedbackDelegate.getComponentForPlugin(this.injector, this.plugin).then((component) => {
            this.pluginComponent = component;

            if (component) {
                // Prepare the data to pass to the component.
                this.data = {
                    assign: this.assign,
                    submission: this.submission,
                    plugin: this.plugin,
                    userId: this.userId,
                    configs: this.assignHelper.getPluginConfig(this.assign, 'assignfeedback', this.plugin.type),
                    edit: this.edit,
                    canEdit: this.canEdit
                };
            } else {
                // Data to render the plugin.
                this.text = this.assignProvider.getSubmissionPluginText(this.plugin);
                this.files = this.assignProvider.getSubmissionPluginAttachments(this.plugin);
                this.notSupported = this.feedbackDelegate.isPluginSupported(this.plugin.type);
                this.pluginLoaded = true;
            }
        });
    }

    /**
     * Invalidate the plugin data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidate(): Promise<any> {
        return Promise.resolve(this.dynamicComponent && this.dynamicComponent.callComponentFunction('invalidate', []));
    }
}
