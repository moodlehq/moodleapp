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

import { Component, OnChanges, viewChild } from '@angular/core';

import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreSitePlugins, CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { CoreSitePluginsPluginContentComponent } from '../plugin-content/plugin-content';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseFormatDynamicComponent } from '@features/course/classes/base-course-format-component';

/**
 * Component that displays the index of a course format site plugin.
 */
@Component({
    selector: 'core-site-plugins-course-format',
    templateUrl: 'core-siteplugins-course-format.html',
    styles: [':host { display: contents; }'],
    imports: [
        CoreSharedModule,
        CoreSitePluginsPluginContentComponent,
    ],
    host: {
        '[class]': 'component',
    },
})
export class CoreSitePluginsCourseFormatComponent extends CoreCourseFormatDynamicComponent implements OnChanges {

    readonly content = viewChild(CoreSitePluginsPluginContentComponent);

    component?: string;
    method?: string;
    args?: Record<string, unknown>;
    initResult?: CoreSitePluginsContent | null;
    data?: Record<string, unknown>;

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
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
        await this.content()?.refreshContent(afterCompletionChange);
    }

}
