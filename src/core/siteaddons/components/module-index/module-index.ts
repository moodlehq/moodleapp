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

import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { CoreSiteAddonsProvider } from '../../providers/siteaddons';
import { CoreCourseModuleMainComponent } from '../../../course/providers/module-delegate';
import { CoreSiteAddonsAddonContentComponent } from '../addon-content/addon-content';

/**
 * Component that displays the index of a module site addon.
 */
@Component({
    selector: 'core-site-addons-module-index',
    templateUrl: 'module-index.html',
})
export class CoreSiteAddonsModuleIndexComponent implements OnInit, CoreCourseModuleMainComponent {
    @Input() module: any; // The module.
    @Input() courseId: number; // Course ID the module belongs to.

    @ViewChild(CoreSiteAddonsAddonContentComponent) addonContent: CoreSiteAddonsAddonContentComponent;

    component: string;
    method: string;
    args: any;

    constructor(protected siteAddonsProvider: CoreSiteAddonsProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.module) {
            const handler = this.siteAddonsProvider.getModuleSiteAddonHandler(this.module.modname);
            if (handler) {
                this.component = handler.addon.component;
                this.method = handler.handlerSchema.method;
                this.args = {
                    courseid: this.courseId,
                    cmid: this.module.id
                };
            }
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any> {
        if (this.addonContent) {
            return Promise.resolve(this.addonContent.refreshData()).finally(() => {
                refresher.complete();
            });
        } else {
            refresher.complete();

            return Promise.resolve();
        }
    }
}
