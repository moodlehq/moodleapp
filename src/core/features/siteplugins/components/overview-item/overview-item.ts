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

import { CoreSharedModule } from '@/core/shared.module';
import { Component, computed, input } from '@angular/core';
import { CoreCompileHtmlComponent } from '@features/compile/components/compile-html/compile-html';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';

/**
 * Component to render a site plugin overview item.
 */
@Component({
    selector: 'core-site-plugins-overview-item',
    templateUrl: 'core-siteplugins-overview-item.html',
    imports: [
        CoreSharedModule,
        CoreCompileHtmlComponent,
    ],
})
export class CoreSitePluginsOverviewItemComponent {

    readonly courseId = input.required<number>();
    readonly activity = input.required<CoreCourseOverviewActivity>();
    readonly item = input.required<CoreCourseOverviewItem<unknown>>();
    readonly html = input.required<string>();
    readonly otherData = input<Record<string,unknown>>();

    // Pass jsData even if there's no JS code because the JS variables can be used in the HTML.
    readonly jsData = computed(() => ({
        courseId: this.courseId(),
        activity: this.activity(),
        item: this.item(),
        // Make a copy of otherdata to make it unique for each item and activity.
        INIT_OTHERDATA: { ...(this.otherData() ?? {}) }, // eslint-disable-line @typescript-eslint/naming-convention
    }));

}
