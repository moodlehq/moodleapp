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

import { CORE_USER_FEATURE_PREFIX } from '@features/user/constants';

export const GRADES_PAGE_NAME = 'grades';
export const GRADES_PARTICIPANTS_PAGE_NAME = 'participant-grades';

export const CORE_GRADES_COMPONENT_NAME = 'CoreGrades';
export const CORE_GRADES_USER_MENU_FEATURE_NAME = `${CORE_USER_FEATURE_PREFIX}${CORE_GRADES_COMPONENT_NAME}`;
export const CORE_GRADES_USER_PROFILE_FEATURE_NAME = `${CORE_GRADES_USER_MENU_FEATURE_NAME}:viewGrades`;

export const CORE_GRADES_COURSE_OPTION_NAME = CORE_GRADES_COMPONENT_NAME; // Tabname on course.

export const enum CoreGradeType {
    NONE = 0, // Moodle's GRADE_TYPE_NONE.
    VALUE = 1, // Moodle's GRADE_TYPE_VALUE.
    SCALE = 2, // Moodle's GRADE_TYPE_SCALE.
    TEXT = 3, // Moodle's GRADE_TYPE_TEXT.
}
