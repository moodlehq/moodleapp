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

import { Injectable } from '@angular/core';

import { CoreTimeUtils } from '@services/utils/time';
import { CoreCourseFormatHandler } from '@features/course/services/format-delegate';
import { makeSingleton } from '@singletons';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseWSSection } from '@features/course/services/course';
import { CoreConstants } from '@/core/constants';
import { CoreCourseSection } from '@features/course/services/course-helper';

/**
 * Handler to support weeks course format.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatWeeksHandlerService implements CoreCourseFormatHandler {

    name = 'CoreCourseFormatWeeks';
    format = 'weeks';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Given a list of sections, get the "current" section that should be displayed first.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Current section (or promise resolved with current section).
     */
    async getCurrentSection(course: CoreCourseAnyCourseData, sections: CoreCourseSection[]): Promise<CoreCourseSection> {
        const now = CoreTimeUtils.timestamp();

        if ((course.startdate && now < course.startdate) || (course.enddate && now > course.enddate)) {
            // Course hasn't started yet or it has ended already. Return all sections.
            return sections[0];
        }

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (typeof section.section == 'undefined' || section.section < 1) {
                continue;
            }

            const dates = this.getSectionDates(section, course.startdate || 0);
            if (now >= dates.start && now < dates.end) {
                return section;
            }
        }

        // The section wasn't found, return all sections.
        return sections[0];
    }

    /**
     * Return the start and end date of a section.
     *
     * @param section The section to treat.
     * @param startDate The course start date (in seconds).
     * @return An object with the start and end date of the section.
     */
    protected getSectionDates(section: CoreCourseWSSection, startDate: number): { start: number; end: number } {
        // Hack alert. We add 2 hours to avoid possible DST problems. (e.g. we go into daylight savings and the date changes).
        startDate = startDate + 7200;

        const dates = {
            start: startDate + (CoreConstants.SECONDS_WEEK * (section.section! - 1)),
            end: 0,
        };
        dates.end = dates.start + CoreConstants.SECONDS_WEEK;

        return dates;
    }

}

export const CoreCourseFormatWeeksHandler = makeSingleton(CoreCourseFormatWeeksHandlerService);
