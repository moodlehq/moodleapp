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

import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarHelperProvider, AddonCalendarFilter } from '../../providers/helper';

/**
 * Component to display the events filter that includes events types and a list of courses.
 */
@Component({
    selector: 'addon-calendar-filter-popover',
    templateUrl: 'addon-calendar-filter-popover.html'
})
export class AddonCalendarFilterPopoverComponent {
    courses: any[];
    courseId = -1;

    types = {};
    typeIcons = {};
    typeKeys = [];

    constructor(navParams: NavParams, protected eventsProvider: CoreEventsProvider) {
        this.courses = navParams.get('courses') || [];
        const filter: AddonCalendarFilter = navParams.get('filter') || {
            filtered: false,
            courseId: null,
            categoryId: null,
            course: true,
            group: true,
            site: true,
            user: true,
            category: true
        };
        this.courseId = filter.courseId || -1;

        this.typeKeys = AddonCalendarProvider.ALL_TYPES.map((name) => {
            this.types[name] = filter[name];
            this.typeIcons[name] = AddonCalendarHelperProvider.EVENTICONS[name];

            return name;
        });
    }

    /**
     * Function called when an item is clicked.
     *
     * @param event Click event.
     */
    onChange(event: Event): void {
        const filter = this.types;
        if (this.courseId > 0) {
            const course = this.courses.find((course) => this.courseId == course.id);
            filter['courseId'] = course && course.id;
            filter['categoryId'] = course && course.category;
        } else {
            filter['courseId'] = false;
            filter['categoryId'] = false;
        }

        filter['filtered'] = filter['courseId'] || AddonCalendarProvider.ALL_TYPES.some((name) => !this.types[name]);

        this.eventsProvider.trigger(AddonCalendarProvider.FILTER_CHANGED_EVENT, filter);
    }
}
