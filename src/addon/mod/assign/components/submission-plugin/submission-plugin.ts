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

import { Component, Input, OnInit, Injector, ViewChild } from '@angular/core';
import {
    AddonModAssignProvider, AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignPlugin
} from '../../providers/assign';
import { AddonModAssignHelperProvider } from '../../providers/helper';
import { AddonModAssignSubmissionDelegate } from '../../providers/submission-delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';

/**
 * Component that displays an assignment submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-plugin',
    templateUrl: 'addon-mod-assign-submission-plugin.html',
})
export class AddonModAssignSubmissionPluginComponent implements OnInit {
    @ViewChild(CoreDynamicComponent) dynamicComponent: CoreDynamicComponent;

    @Input() assign: AddonModAssignAssign; // The assignment.
    @Input() submission: AddonModAssignSubmission; // The submission.
    @Input() plugin: AddonModAssignPlugin; // The plugin object.
    @Input() edit: boolean | string; // Whether the user is editing.
    @Input() allowOffline: boolean | string; // Whether to allow offline.

    pluginComponent: any; // Component to render the plugin.
    data: any; // Data to pass to the component.

    // Data to render the plugin if it isn't supported.
    component = AddonModAssignProvider.COMPONENT;
    text = '';
    files = [];
    notSupported: boolean;
    pluginLoaded: boolean;

    constructor(protected injector: Injector, protected submissionDelegate: AddonModAssignSubmissionDelegate,
            protected assignProvider: AddonModAssignProvider, protected assignHelper: AddonModAssignHelperProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.plugin) {
            return;
        }

        this.plugin.name = this.submissionDelegate.getPluginName(this.plugin);
        if (!this.plugin.name) {
            return;
        }

        this.edit = this.edit && this.edit !== 'false';
        this.allowOffline = this.allowOffline && this.allowOffline !== 'false';

        // Check if the plugin has defined its own component to render itself.
        this.submissionDelegate.getComponentForPlugin(this.injector, this.plugin, this.edit).then((component) => {
            this.pluginComponent = component;

            if (component) {
                // Prepare the data to pass to the component.
                this.data = {
                    assign: this.assign,
                    submission: this.submission,
                    plugin: this.plugin,
                    configs: this.assignHelper.getPluginConfig(this.assign, 'assignsubmission', this.plugin.type),
                    edit: this.edit,
                    allowOffline: this.allowOffline
                };
            } else {
                // Data to render the plugin.
                this.text = this.assignProvider.getSubmissionPluginText(this.plugin);
                this.files = this.assignProvider.getSubmissionPluginAttachments(this.plugin);
                this.notSupported = this.submissionDelegate.isPluginSupported(this.plugin.type);
                this.pluginLoaded = true;
            }
        });
    }

    /**
     * Invalidate the plugin data.
     *
     * @return Promise resolved when done.
     */
    invalidate(): Promise<any> {
        return Promise.resolve(this.dynamicComponent && this.dynamicComponent.callComponentFunction('invalidate', []));
    }
}
