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

import { Injectable } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonCalendarProvider } from './calendar';
import { CoreConstants } from '@core/constants';

/**
 * Service that provides some features regarding lists of courses and categories.
 */
@Injectable()
export class AddonCalendarHelperProvider {
    protected logger;

    protected EVENTICONS = {
        course: 'fa-university',
        group: 'people',
        site: 'globe',
        user: 'person',
        category: 'fa-cubes'
    };

    constructor(logger: CoreLoggerProvider, private courseProvider: CoreCourseProvider) {
        this.logger = logger.getInstance('AddonCalendarHelperProvider');
    }

    /**
     * Convenience function to format some event data to be rendered.
     *
     * @param {any} e Event to format.
     */
    formatEventData(e: any): void {
        e.icon = this.EVENTICONS[e.eventtype] || false;
        if (!e.icon) {
            e.icon = this.courseProvider.getModuleIconSrc(e.modulename);
            e.moduleIcon = e.icon;
        }

        if (e.id < 0) {
            // It's an offline event, add some calculated data.
            e.format = 1;
            e.visible = 1;

            if (e.duration == 1) {
                e.timeduration = e.timedurationuntil - e.timestart;
            } else if (e.duration == 2) {
                e.timeduration = e.timedurationminutes * CoreConstants.SECONDS_MINUTE;
            } else {
                e.timeduration = 0;
            }
        }
    }

    /**
     * Get options (name & value) for each allowed event type.
     *
     * @param {any} eventTypes Result of getAllowedEventTypes.
     * @return {{name: string, value: string}[]} Options.
     */
    getEventTypeOptions(eventTypes: any): {name: string, value: string}[] {
        const options = [];

        if (eventTypes.user) {
            options.push({name: 'core.user', value: AddonCalendarProvider.TYPE_USER});
        }
        if (eventTypes.group) {
            options.push({name: 'core.group', value: AddonCalendarProvider.TYPE_GROUP});
        }
        if (eventTypes.course) {
            options.push({name: 'core.course', value: AddonCalendarProvider.TYPE_COURSE});
        }
        if (eventTypes.category) {
            options.push({name: 'core.category', value: AddonCalendarProvider.TYPE_CATEGORY});
        }
        if (eventTypes.site) {
            options.push({name: 'core.site', value: AddonCalendarProvider.TYPE_SITE});
        }

        return options;
    }

    /**
     * Check if the data of an event has changed.
     *
     * @param {any} data Current data.
     * @param {any} [original] Original data.
     * @return {boolean} True if data has changed, false otherwise.
     */
    hasEventDataChanged(data: any, original?: any): boolean {
        if (!original) {
            // There is no original data, assume it hasn't changed.
            return false;
        }

        // Check the fields that don't depend on any other.
        if (data.name != original.name || data.timestart != original.timestart || data.eventtype != original.eventtype ||
                data.description != original.description || data.location != original.location ||
                data.duration != original.duration || data.repeat != original.repeat) {
            return true;
        }

        // Check data that depends on eventtype.
        if ((data.eventtype == AddonCalendarProvider.TYPE_CATEGORY && data.categoryid != original.categoryid) ||
                (data.eventtype == AddonCalendarProvider.TYPE_COURSE && data.courseid != original.courseid) ||
                (data.eventtype == AddonCalendarProvider.TYPE_GROUP && data.groupcourseid != original.groupcourseid &&
                    data.groupid != original.groupid)) {
            return true;
        }

        // Check data that depends on duration.
        if ((data.duration == 1 && data.timedurationuntil != original.timedurationuntil) ||
                (data.duration == 2 && data.timedurationminutes != original.timedurationminutes)) {
            return true;
        }

        if (data.repeat && data.repeats != original.repeats) {
            return true;
        }

        return false;
    }
}
