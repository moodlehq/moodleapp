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
import { CoreSiteAddonsAddonContentComponent } from '../addon-content/addon-content';

/**
 * Component that displays the index of a course format site addon.
 */
@Component({
    selector: 'core-site-addons-course-format',
    templateUrl: 'course-format.html',
})
export class CoreSiteAddonsCourseFormatComponent implements OnInit {
    @Input() course: any; // The course to render.
    @Input() sections: any[]; // List of course sections.
    @Input() downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.

    @ViewChild(CoreSiteAddonsAddonContentComponent) content: CoreSiteAddonsAddonContentComponent;

    component: string;
    method: string;
    args: any;
    bootstrapResult: any;

    constructor(protected siteAddonsProvider: CoreSiteAddonsProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.course && this.course.format) {
            const handler = this.siteAddonsProvider.getSiteAddonHandler(this.course.format);
            if (handler) {
                this.component = handler.addon.component;
                this.method = handler.handlerSchema.method;
                this.args = {
                    courseid: this.course.id,
                    downloadenabled: this.downloadEnabled
                };
                this.bootstrapResult = handler.bootstrapResult;
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
        return Promise.resolve(this.content.refreshData());
    }
}
