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

import { Component, OnChanges, Input, ViewChild } from '@angular/core';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';

/**
 * Component that displays the index of a course format site plugin.
 */
@Component({
    selector: 'core-site-plugins-course-format',
    templateUrl: 'core-siteplugins-course-format.html',
})
export class CoreSitePluginsCourseFormatComponent implements OnChanges {
    @Input() course: any; // The course to render.
    @Input() sections: any[]; // List of course sections.
    @Input() downloadEnabled?: boolean; // Whether the download of sections and modules is enabled.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).

    @ViewChild(CoreSitePluginsPluginContentComponent) content: CoreSitePluginsPluginContentComponent;

    component: string;
    method: string;
    args: any;
    initResult: any;
    data: any;

    constructor(protected sitePluginsProvider: CoreSitePluginsProvider) { }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(): void {
        if (this.course && this.course.format) {
            if (!this.component) {
                // Initialize the data.
                const handler = this.sitePluginsProvider.getSitePluginHandler(this.course.format);
                if (handler) {
                    this.component = handler.plugin.component;
                    this.method = handler.handlerSchema.method;
                    this.args = {
                        courseid: this.course.id,
                        downloadenabled: this.downloadEnabled
                    };
                    this.initResult = handler.initResult;
                }
            }

            // Pass input data to the component.
            this.data = {
                course: this.course,
                sections: this.sections,
                downloadEnabled: this.downloadEnabled,
                initialSectionId: this.initialSectionId,
                initialSectionNumber: this.initialSectionNumber
            };
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
        return Promise.resolve(this.content.refreshContent(false));
    }
}
