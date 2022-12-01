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

import { Component, OnInit, Input } from '@angular/core';

import { AddonModAssignAssign, AddonModAssignPlugin, AddonModAssignSubmission } from '@addons/mod/assign/services/assign';
import { AddonModAssignFeedbackDelegate } from '@addons/mod/assign/services/feedback-delegate';
import { CoreSitePluginsCompileInitComponent } from '@features/siteplugins/classes/compile-init-component';

/**
 * Component that displays an assign feedback plugin created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-assign-feedback',
    templateUrl: 'core-siteplugins-assign-feedback.html',
    styles: [':host { display: contents; }'],
})
export class CoreSitePluginsAssignFeedbackComponent extends CoreSitePluginsCompileInitComponent implements OnInit {

    @Input() assign!: AddonModAssignAssign; // The assignment.
    @Input() submission!: AddonModAssignSubmission; // The submission.
    @Input() plugin!: AddonModAssignPlugin; // The plugin object.
    @Input() userId!: number; // The user ID of the submission.
    @Input() configs?: Record<string,string>; // The configs for the plugin.
    @Input() canEdit = false; // Whether the user can edit.
    @Input() edit = false; // Whether the user is editing.

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        // Pass the input and output data to the component.
        this.jsData.assign = this.assign;
        this.jsData.submission = this.submission;
        this.jsData.plugin = this.plugin;
        this.jsData.userId = this.userId;
        this.jsData.configs = this.configs;
        this.jsData.edit = this.edit;
        this.jsData.canEdit = this.canEdit;

        if (this.plugin) {
            this.getHandlerData(AddonModAssignFeedbackDelegate.getHandlerName(this.plugin.type));
        }
    }

    /**
     * Invalidate the data.
     *
     * @returns Promise resolved when done.
     */
    invalidate(): Promise<void> {
        return Promise.resolve();
    }

}
