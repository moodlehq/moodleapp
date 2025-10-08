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

export const CORE_COURSE_INDEX_PATH = ':courseId';
export const CORE_COURSE_PAGE_NAME = 'course';
export const CORE_COURSE_CONTENTS_PAGE_NAME = 'contents';
export const CORE_COURSE_OVERVIEW_PAGE_NAME = 'overview';
export const CORE_COURSE_CONTENTS_PATH = `${CORE_COURSE_PAGE_NAME}/${CORE_COURSE_INDEX_PATH}/${CORE_COURSE_CONTENTS_PAGE_NAME}`;

export const CORE_COURSE_ALL_SECTIONS_PREFERRED_PREFIX = 'CoreCourseFormatAllSectionsPreferred-';
export const CORE_COURSE_EXPANDED_SECTIONS_PREFIX = 'CoreCourseFormatExpandedSections-';

export const CORE_COURSE_ALL_SECTIONS_ID = -2;
export const CORE_COURSE_STEALTH_MODULES_SECTION_ID = -1;
export const CORE_COURSE_ALL_COURSES_CLEARED = -1;

export const CORE_COURSE_PROGRESS_UPDATED_EVENT = 'progress_updated';
export const CORE_COURSE_SELECT_TAB = 'course_select_tab';

export const CORE_COURSE_AUTO_SYNCED = 'core_course_autom_synced';

export const COURSE_STATUS_CHANGED_EVENT = 'course_status_changed';

export const CORE_COURSE_COMPONENT = 'CoreCourse';

export const CORE_COURSE_OVERVIEW_OPTION_NAME = 'CoreCourseOverview';

export const CORE_COURSE_CORE_MODULES = [
    'assign', 'bigbluebuttonbn', 'book', 'chat', 'choice', 'data', 'feedback', 'folder', 'forum', 'glossary', 'h5pactivity',
    'imscp', 'label', 'lesson', 'lti', 'page', 'quiz', 'resource', 'scorm', 'survey', 'url', 'wiki', 'workshop',
];

export const CORE_COURSE_MODULE_FEATURE_PREFIX = 'CoreCourseModuleDelegate_';

/**
 * Course Module completion status enumeration.
 */
export const enum CoreCourseModuleCompletionStatus {
    COMPLETION_INCOMPLETE = 0,
    COMPLETION_COMPLETE = 1,
    COMPLETION_COMPLETE_PASS = 2,
    COMPLETION_COMPLETE_FAIL = 3,
}

/**
 * Completion tracking valid values.
 */
export const enum CoreCourseModuleCompletionTracking {
    NONE = 0,
    MANUAL = 1,
    AUTOMATIC = 2,
}

export const CoreCourseAccessDataType = {
    ACCESS_GUEST: 'courses_access_guest', // eslint-disable-line @typescript-eslint/naming-convention
    ACCESS_DEFAULT: 'courses_access_default', // eslint-disable-line @typescript-eslint/naming-convention
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CoreCourseAccessDataType = typeof CoreCourseAccessDataType[keyof typeof CoreCourseAccessDataType];

/**
 * Core content types used in course overview and supported by the app by default.
 */
export const enum CoreCourseOverviewContentType {
    BASIC = 'basic',
    ACTIVITY_NAME = 'core_courseformat\\output\\local\\overview\\activityname',
    CM_COMPLETION = 'core_courseformat\\output\\local\\content\\cm\\completion',
    HUMAN_DATE = 'core_calendar\\output\\humandate',
    ACTION_LINK = 'core\\output\\action_link',
    OVERVIEW_DIALOG = 'core_courseformat\\output\\local\\overview\\overviewdialog',
    OVERVIEW_ACTION = 'core_courseformat\\output\\local\\overview\\overviewaction',
    PIX_ICON = 'core\\output\\pix_icon',
};

export const enum CoreCourseDownloadStatusIcon {
    LOADING = 'spinner',
    DOWNLOADED = 'fam-cloud-done',
    DOWNLOADING = CoreCourseDownloadStatusIcon.LOADING,
    NOT_DOWNLOADED = 'fas-cloud-arrow-down',
    OUTDATED = 'fam-cloud-refresh',
    NOT_DOWNLOADABLE = '',
};
