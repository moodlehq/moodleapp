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

import { Component, OnChanges, Input, ViewChild, HostBinding } from '@angular/core';

import { CoreCourseFormatComponent } from '@features/course/components/course-format/course-format';
import { CoreCourseSection } from '@features/course/services/course-helper';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreSitePlugins, CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays the index of a course format site plugin.
 */
@Component({
    selector: 'core-site-plugins-course-format',
    templateUrl: 'core-siteplugins-course-format.html',
    styles: [':host { display: contents; }'],
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreSitePluginsPluginContentComponent,
    ],
})
export class CoreSitePluginsCourseFormatComponent implements OnChanges {

    @Input() course?: CoreCourseAnyCourseData; // The course to render.
    @Input() sections?: CoreCourseSection[]; // List of course sections. The status will be calculated in this component.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.

    // Special input, allows access to the parent instance properties and methods.
    // Please notice that all the other inputs/outputs are also accessible through this instance, so they could be removed.
    // However, we decided to keep them to support ngOnChanges and to make templates easier to read.
    @Input() coreCourseFormatComponent?: CoreCourseFormatComponent;

    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    @HostBinding('class') component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    data?: Record<string, unknown>;
    stylesPath?: string; // Styles to apply to the component.

    /**
     * @inheritdoc
     */
    async ngOnChanges(): Promise<void> {
        if (!this.course || !this.course.format) {
            return;
        }

        if (!this.component) {
            // Initialize the data.
            const handlerName = CoreCourseFormatDelegate.getHandlerName(this.course.format);
            const handler = CoreSitePlugins.getSitePluginHandler(handlerName);

            if (handler) {
                this.component = handler.plugin.component;
                this.method = handler.handlerSchema.method;
                this.args = {
                    courseid: this.course.id,
                };
                this.initResult = handler.initResult;

                this.stylesPath = await CoreSitePlugins.getHandlerDownloadedStyles(handlerName);
            }
        }

        // Pass input data to the component.
        this.data = {
            course: this.course,
            sections: this.sections,
            initialSectionId: this.initialSectionId,
            initialSectionNumber: this.initialSectionNumber,
            moduleId: this.moduleId,
            coreCourseFormatComponent: this.coreCourseFormatComponent,
        };
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param afterCompletionChange Whether the refresh is due to a completion change.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement, done?: () => void, afterCompletionChange?: boolean): Promise<void> {
        await this.content?.refreshContent(afterCompletionChange);
    }

}
