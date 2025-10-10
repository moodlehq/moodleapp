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

import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { Router, Translate } from '@singletons';
import { CoreCourseOverview } from '../services/course-overview';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreAlerts } from '@services/overlays/alerts';
import { CORE_COURSE_OVERVIEW_OPTION_NAME } from '../constants';
import { CoreCourseHelper } from '../services/course-helper';

/**
 * Guard to check if the activities overview has replaced list-mod-type.
 *
 * @returns True if overview is not enabled. Redirect otherwise.
 *
 * @deprecatedonmoodle 5.1 Use course overview instead.
 */
export const overviewGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
    if (CoreCourseOverview.canGetInformation()) {
        const courseId = parseInt(route.params.courseId, 10);
        const modName = route.queryParams.modName;

        // Check if it's enabled.
        const options = await CoreCourses.getCoursesAdminAndNavOptions([courseId]);

        if (!options.navOptions[courseId].overview) {
            CoreAlerts.showError(Translate.instant('core.nopermissions', {
                $a: Translate.instant('core.course.course:viewoverview'),
            }));

            return false;
        }

        await CoreCourseHelper.getAndOpenCourse(courseId, { selectedTab: CORE_COURSE_OVERVIEW_OPTION_NAME, expand: modName });

        return Router.parseUrl('');
    }

    return true;
};
