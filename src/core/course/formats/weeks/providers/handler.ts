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
import { CoreCourseFormatHandler } from '../../../providers/format-delegate';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreConstants } from '../../../../constants';

/**
 * Handler to support weeks course format.
 */
@Injectable()
export class CoreCourseFormatWeeksHandler implements CoreCourseFormatHandler {
    name = 'CoreCourseFormatWeeks';
    format = 'weeks';

    constructor(private timeUtils: CoreTimeUtilsProvider) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Given a list of sections, get the "current" section that should be displayed first.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {any|Promise<any>} Current section (or promise resolved with current section).
     */
    getCurrentSection(course: any, sections: any[]): any | Promise<any> {
        const now = this.timeUtils.timestamp();

        if (now < course.startdate || (course.enddate && now > course.enddate)) {
            // Course hasn't started yet or it has ended already. Return all sections.
            return sections[0];
        }

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (typeof section.section == 'undefined' || section.section < 1) {
                continue;
            }

            const dates = this.getSectionDates(section, course.startdate);
            if ((now >= dates.start) && (now < dates.end)) {
                return section;
            }
        }

        // The section wasn't found, return all sections.
        return sections[0];
    }

    /**
     * Return the start and end date of a section.
     *
     * @param {any} section The section to treat.
     * @param {number} startDate The course start date (in seconds).
     * @return {{start: number, end: number}} An object with the start and end date of the section.
     */
    protected getSectionDates(section: any, startDate: number): { start: number, end: number } {
        // Hack alert. We add 2 hours to avoid possible DST problems. (e.g. we go into daylight savings and the date changes).
        startDate = startDate + 7200;

        const dates = {
            start: startDate + (CoreConstants.SECONDS_WEEK * (section.section - 1)),
            end: 0
        };
        dates.end = dates.start + CoreConstants.SECONDS_WEEK;

        return dates;
    }
}
