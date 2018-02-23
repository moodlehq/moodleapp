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
 * Component that displays the index of a course option site addon.
 */
@Component({
    selector: 'core-site-addons-course-option',
    templateUrl: 'course-option.html',
})
export class CoreSiteAddonsCourseOptionComponent implements OnInit {
    @Input() courseId: number;
    @Input() handlerUniqueName: string;

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
        if (this.handlerUniqueName) {
            const handler = this.siteAddonsProvider.getSiteAddonHandler(this.handlerUniqueName);
            if (handler) {
                this.component = handler.addon.component;
                this.method = handler.handlerSchema.method;
                this.args = {
                    courseid: this.courseId,
                };
                this.bootstrapResult = handler.bootstrapResult;
            }
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} refresher Refresher.
     */
    refreshData(refresher: any): void {
        this.content.refreshData().finally(() => {
            refresher.complete();
        });
    }
}
