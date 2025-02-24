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

export const ADDON_MOD_CHOICE_COMPONENT = 'AddonModChoice';
export const ADDON_MOD_CHOICE_COMPONENT_LEGACY = 'mmaModChoice';
export const ADDON_MOD_CHOICE_PAGE_NAME = 'mod_choice';
export const ADDON_MOD_CHOICE_MODNAME = 'choice';

export const ADDON_MOD_CHOICE_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_CHOICE_COMPONENT;

// Events.
export const ADDON_MOD_CHOICE_AUTO_SYNCED = 'addon_mod_choice_autom_synced';

// Possible choice publish values.
export const ADDON_MOD_CHOICE_PUBLISH_ANONYMOUS = false;
export const ADDON_MOD_CHOICE_PUBLISH_NAMES = true;

/**
 * Possible show results values.
 */
export const enum AddonModChoiceShowResults {
    SHOWRESULTS_NOT = 0,
    SHOWRESULTS_AFTER_ANSWER = 1,
    SHOWRESULTS_AFTER_CLOSE = 2,
    SHOWRESULTS_ALWAYS = 3,
}
