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

import { Component, input } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '@features/course/services/course-overview';

/**
 * Component to display activity name in an overview item.
 */
@Component({
    selector: 'core-course-overview-item-name',
    templateUrl: 'overview-item-name.html',
    styleUrl: 'overview-item-name.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreCourseOverviewItemNameComponent {

    readonly courseId = input.required<number>();
    readonly activity = input.required<CoreCourseOverviewActivity>();
    readonly item = input.required<CoreCourseOverviewItem<ItemData>>();

}

type ItemData = {
    activityurl: string;
    activityname: string;
    hidden: boolean;
    stealth: boolean;
    sectiontitle?: string;
};
