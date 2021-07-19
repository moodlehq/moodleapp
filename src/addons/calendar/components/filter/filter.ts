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

import { Component, Input, OnInit } from '@angular/core';
import { CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreUtils } from '@services/utils/utils';
import { CoreEvents } from '@singletons/events';
import { AddonCalendarEventType, AddonCalendarProvider } from '../../services/calendar';
import { AddonCalendarFilter, AddonCalendarEventIcons } from '../../services/calendar-helper';

/**
 * Component to display the events filter that includes events types and a list of courses.
 */
@Component({
    selector: 'addon-calendar-filter-popover',
    templateUrl: 'addon-calendar-filter-popover.html',
    styleUrls: ['../../calendar-common.scss', 'filter-popover.scss'],
})
export class AddonCalendarFilterPopoverComponent implements OnInit {

    @Input() filter: AddonCalendarFilter = {
        filtered: false,
        courseId: undefined,
        categoryId: undefined,
        course: true,
        group: true,
        site: true,
        user: true,
        category: true,
    };

    courseId = -1;

    @Input() courses: Partial<CoreEnrolledCourseData>[] = [];
    typeIcons: AddonCalendarEventIcons[] = [];
    types: string[] = [];

    constructor() {
        CoreUtils.enumKeys(AddonCalendarEventType).forEach((name) => {
            const value = AddonCalendarEventType[name];
            this.typeIcons[value] = AddonCalendarEventIcons[name];
            this.types.push(value);
        });

    }

    /**
     * Init the component.
     */
    ngOnInit(): void {
        this.courseId = this.filter.courseId || -1;
    }

    /**
     * Function called when an item is clicked.
     */
    onChange(): void {
        if (this.courseId > 0) {
            const course = this.courses.find((course) => this.courseId == course.id);
            this.filter.courseId = course?.id;
            this.filter.categoryId = course?.categoryid;
        } else {
            this.filter.courseId = undefined;
            this.filter.categoryId = undefined;
        }

        this.filter.filtered = !!this.filter.courseId || this.types.some((name) => !this.filter[name]);

        CoreEvents.trigger(AddonCalendarProvider.FILTER_CHANGED_EVENT, this.filter);
    }

}
