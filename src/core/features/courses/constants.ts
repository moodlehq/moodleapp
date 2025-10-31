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

import { MAIN_MENU_FEATURE_PREFIX } from '@features/mainmenu/constants';

export const CORE_COURSES_ENROL_INVALID_KEY = 'CoreCoursesEnrolInvalidKey';

export const CORE_COURSES_MY_COURSES_CHANGED_EVENT = 'courses_my_courses_changed'; // User course list changed while app is running.

export const CORE_COURSES_DASHBOARD_PAGE_NAME = 'dashboard';
export const CORE_COURSES_MYCOURSES_PAGE_NAME = 'courses';

// Events.
// A course was hidden/favourite, or user enroled in a course.
export const CORE_COURSES_MY_COURSES_UPDATED_EVENT = 'courses_my_courses_updated';
export const CORE_COURSES_MY_COURSES_REFRESHED_EVENT = 'courses_my_courses_refreshed';
export const CORE_COURSES_DASHBOARD_DOWNLOAD_ENABLED_CHANGED_EVENT = 'dashboard_download_enabled_changed';

// Features.
export const CORE_COURSE_DOWNLOAD_FEATURE_NAME = 'NoDelegate_CoreCourseDownload';
export const CORE_COURSES_DOWNLOAD_FEATURE_NAME = 'NoDelegate_CoreCoursesDownload';
export const CORE_COURSES_SEARCH_FEATURE_NAME = 'CoreCourseOptionsDelegate_search';

export const CORE_COURSES_COMPONENT_NAME = 'CoreCourses';
export const CORE_COURSES_MENU_FEATURE_NAME = `${MAIN_MENU_FEATURE_PREFIX}${CORE_COURSES_COMPONENT_NAME}`;

export const CORE_COURSES_MY_COURSES_COMPONENT_NAME = 'CoreCoursesMyCourses';

export const CORE_COURSES_DASHBOARD_COMPONENT_NAME = 'CoreCoursesDashboard';
export const CORE_COURSES_DASHBOARD_MENU_FEATURE_NAME = `${MAIN_MENU_FEATURE_PREFIX}${CORE_COURSES_DASHBOARD_COMPONENT_NAME}`;

// Actions for event CORE_COURSES_MY_COURSES_UPDATED_EVENT.
export const CoreCoursesMyCoursesUpdatedEventAction = {
/* eslint-disable @typescript-eslint/naming-convention */
    ENROL: 'enrol', // User enrolled in a course.
    STATE_CHANGED: 'state_changed', // Course state changed (hidden, favourite).
    VIEW: 'view', // Course viewed.
/* eslint-enable @typescript-eslint/naming-convention*/
} as const;

export type CoreCoursesMyCoursesUpdatedEventAction =
    typeof CoreCoursesMyCoursesUpdatedEventAction[keyof typeof CoreCoursesMyCoursesUpdatedEventAction];

// Possible states changed.
export const CORE_COURSES_STATE_HIDDEN = 'hidden';
export const CORE_COURSES_STATE_FAVOURITE = 'favourite';

export const enum CoreCoursesMyPageName {
    DEFAULT = '__default',
    COURSES = '__courses',
}
