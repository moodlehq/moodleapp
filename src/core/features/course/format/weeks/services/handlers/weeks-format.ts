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

import { CoreTime } from '@singletons/time';
import { CoreCourseFormatCurrentSectionData, CoreCourseFormatHandler } from '@features/course/services/format-delegate';
import { makeSingleton, Translate } from '@singletons';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseWSSection } from '@features/course/services/course';
import { CoreTimeConstants } from '@/core/constants';
import { CoreCourseSection } from '@features/course/services/course-helper';

/**
 * Handler to support weeks course format.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatWeeksHandlerService implements CoreCourseFormatHandler {

    name = 'CoreCourseFormatWeeks';
    format = 'weeks';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async getCurrentSection(
        course: CoreCourseAnyCourseData,
        sections: CoreCourseSection[],
    ): Promise<CoreCourseFormatCurrentSectionData<CoreCourseSection>> {
        const now = CoreTime.timestamp();

        if ((course.startdate && now < course.startdate) || (course.enddate && now > course.enddate)) {
            // Course hasn't started yet or it has ended already. Return all sections.
            return {
                section: sections[0],
                forceSelected: false,
            };
        }

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (section.section === undefined || section.section < 1) {
                continue;
            }

            const dates = this.getSectionDates(section, course.startdate || 0);
            if (now >= dates.start && now < dates.end) {
                return {
                    section,
                    forceSelected: false,
                };
            }
        }

        // The section wasn't found, return all sections.
        return {
            section: sections[0],
            forceSelected: false,
        };
    }

    /**
     * @inheritdoc
     */
    getSectionHightlightedName(): string {
        return Translate.instant('core.course.thisweek');
    }

    /**
     * Return the start and end date of a section.
     *
     * @param section The section to treat.
     * @param startDate The course start date (in seconds).
     * @returns An object with the start and end date of the section.
     */
    protected getSectionDates(section: CoreCourseWSSection, startDate: number): { start: number; end: number } {
        // Hack alert. We add 2 hours to avoid possible DST problems. (e.g. we go into daylight savings and the date changes).
        startDate = startDate + 7200;

        const dates = {
            start: startDate + (CoreTimeConstants.SECONDS_WEEK * ((section.section || 0) - 1)),
            end: 0,
        };
        dates.end = dates.start + CoreTimeConstants.SECONDS_WEEK;

        return dates;
    }

}

export const CoreCourseFormatWeeksHandler = makeSingleton(CoreCourseFormatWeeksHandlerService);
