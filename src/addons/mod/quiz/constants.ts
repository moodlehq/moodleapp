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

import { CORE_COURSE_MODULE_FEATURE_PREFIX } from '@features/course/constants';

export const ADDON_MOD_QUIZ_COMPONENT = 'AddonModQuiz';
export const ADDON_MOD_QUIZ_COMPONENT_LEGACY = 'mmaModQuiz';
export const ADDON_MOD_QUIZ_PAGE_NAME = 'mod_quiz';
export const ADDON_MOD_QUIZ_MODNAME = 'quiz';

export const ADDON_MOD_QUIZ_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_QUIZ_COMPONENT;

// Events.
export const ADDON_MOD_QUIZ_ATTEMPT_FINISHED_EVENT = 'addon_mod_quiz_attempt_finished';
export const ADDON_MOD_QUIZ_AUTO_SYNCED = 'addon_mod_quiz_autom_synced';

export const ADDON_MOD_QUIZ_SHOW_TIME_BEFORE_DEADLINE = 3600;
export const ADDON_MOD_QUIZ_IMMEDIATELY_AFTER_PERIOD = 120; // Time considered 'immedately after the attempt', in seconds.

/**
 * Possible grade methods for a quiz.
 */
export const enum AddonModQuizGradeMethods {
    HIGHEST_GRADE = 1,
    AVERAGE_GRADE = 2,
    FIRST_ATTEMPT = 3,
    LAST_ATTEMPT = 4,
}

/**
 * Possible states for an attempt.
 */
export const enum AddonModQuizAttemptStates {
    IN_PROGRESS = 'inprogress',
    OVERDUE = 'overdue',
    FINISHED = 'finished',
    ABANDONED = 'abandoned',
}

/**
 * Bitmask patterns to determine if data should be displayed based on the attempt state.
 */
export const enum AddonModQuizDisplayOptionsAttemptStates {
    DURING = 0x10000,
    IMMEDIATELY_AFTER = 0x01000,
    LATER_WHILE_OPEN = 0x00100,
    AFTER_CLOSE = 0x00010,
}

/**
 * Possible navigation methods for a quiz.
 */
export const enum AddonModQuizNavMethods {
    FREE = 'free',
    SEQ = 'sequential',
}
