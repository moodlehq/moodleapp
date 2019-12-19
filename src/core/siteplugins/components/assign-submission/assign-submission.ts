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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreSitePluginsCompileInitComponent } from '../../classes/compile-init-component';
import { AddonModAssignSubmissionDelegate } from '@addon/mod/assign/providers/submission-delegate';

/**
 * Component that displays an assign submission plugin created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-assign-submission',
    templateUrl: 'core-siteplugins-assign-submission.html',
})
export class CoreSitePluginsAssignSubmissionComponent extends CoreSitePluginsCompileInitComponent implements OnInit {
    @Input() assign: any; // The assignment.
    @Input() submission: any; // The submission.
    @Input() plugin: any; // The plugin object.
    @Input() configs: any; // The configs for the plugin.
    @Input() edit: boolean; // Whether the user is editing.
    @Input() allowOffline: boolean; // Whether to allow offline.

    constructor(sitePluginsProvider: CoreSitePluginsProvider, utils: CoreUtilsProvider,
            protected assignSubmissionDelegate: AddonModAssignSubmissionDelegate) {
        super(sitePluginsProvider, utils);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Pass the input and output data to the component.
        this.jsData.assign = this.assign;
        this.jsData.submission = this.submission;
        this.jsData.plugin = this.plugin;
        this.jsData.configs = this.configs;
        this.jsData.edit = this.edit;
        this.jsData.allowOffline = this.allowOffline;

        if (this.plugin) {
            this.getHandlerData(this.assignSubmissionDelegate.getHandlerName(this.plugin.type));
        }
    }

    /**
     * Invalidate the data.
     *
     * @return Promise resolved when done.
     */
    invalidate(): Promise<any> {
        return Promise.resolve();
    }
}
