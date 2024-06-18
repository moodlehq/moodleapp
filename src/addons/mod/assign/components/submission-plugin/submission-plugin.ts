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

import { Component, Input, OnInit, Type, ViewChild } from '@angular/core';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignPlugin,
    AddonModAssign,
} from '../../services/assign';
import { AddonModAssignHelper, AddonModAssignPluginConfig } from '../../services/assign-helper';
import { AddonModAssignSubmissionDelegate } from '../../services/submission-delegate';
import { CoreFileEntry } from '@services/file-helper';
import type { AddonModAssignSubmissionPluginBaseComponent } from '@addons/mod/assign/classes/base-submission-plugin-component';
import { ADDON_MOD_ASSIGN_COMPONENT } from '../../constants';

/**
 * Component that displays an assignment submission plugin.
 */
@Component({
    selector: 'addon-mod-assign-submission-plugin',
    templateUrl: 'addon-mod-assign-submission-plugin.html',
})
export class AddonModAssignSubmissionPluginComponent implements OnInit {

    @ViewChild(CoreDynamicComponent) dynamicComponent!: CoreDynamicComponent<AddonModAssignSubmissionPluginBaseComponent>;

    @Input({ required: true }) assign!: AddonModAssignAssign; // The assignment.
    @Input({ required: true }) submission!: AddonModAssignSubmission; // The submission.
    @Input({ required: true }) plugin!: AddonModAssignPlugin; // The plugin object.
    @Input() edit = false; // Whether the user is editing.
    @Input() allowOffline = false; // Whether to allow offline.

    pluginComponent?: Type<AddonModAssignSubmissionPluginBaseComponent>; // Component to render the plugin.
    data?: AddonModAssignSubmissionPluginData; // Data to pass to the component.

    // Data to render the plugin if it isn't supported.
    component = ADDON_MOD_ASSIGN_COMPONENT;
    text = '';
    files: CoreFileEntry[] = [];
    notSupported = false;
    pluginLoaded = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.plugin) {
            this.pluginLoaded = true;

            return;
        }

        const name = AddonModAssignSubmissionDelegate.getPluginName(this.plugin);

        if (!name) {
            this.pluginLoaded = true;

            return;
        }
        this.plugin.name = name;

        // Check if the plugin has defined its own component to render itself.
        this.pluginComponent = await AddonModAssignSubmissionDelegate.getComponentForPlugin(this.plugin, this.edit);

        if (this.pluginComponent) {
            // Prepare the data to pass to the component.
            this.data = {
                assign: this.assign,
                submission: this.submission,
                plugin: this.plugin,
                configs: AddonModAssignHelper.getPluginConfig(this.assign, 'assignsubmission', this.plugin.type),
                edit: this.edit,
                allowOffline: this.allowOffline,
            };
        } else {
            // Data to render the plugin.
            this.text = AddonModAssign.getSubmissionPluginText(this.plugin);
            this.files = AddonModAssign.getSubmissionPluginAttachments(this.plugin);
            this.notSupported = AddonModAssignSubmissionDelegate.isPluginSupported(this.plugin.type);
            this.pluginLoaded = true;
        }
    }

    /**
     * Invalidate the plugin data.
     *
     * @returns Promise resolved when done.
     */
    async invalidate(): Promise<void> {
        await this.dynamicComponent.callComponentMethod('invalidate');
    }

}

export type AddonModAssignSubmissionPluginData = {
    assign: AddonModAssignAssign;
    submission: AddonModAssignSubmission;
    plugin: AddonModAssignPlugin;
    configs: AddonModAssignPluginConfig;
    edit: boolean;
    allowOffline: boolean;
};
