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

export const ADDON_MOD_H5PACTIVITY_COMPONENT = 'AddonModH5PActivity';
export const ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY = 'mmaModH5PActivity';
export const ADDON_MOD_H5PACTIVITY_PAGE_NAME = 'mod_h5pactivity';
export const ADDON_MOD_H5PACTIVITY_MODNAME = 'h5pactivity';

export const ADDON_MOD_H5PACTIVITY_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_H5PACTIVITY_COMPONENT;

// Events.
export const ADDON_MOD_H5PACTIVITY_AUTO_SYNCED = 'addon_mod_h5pactivity_autom_synced';

export const ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT = 'mod_h5pactivity'; // Component for tracking.
export const ADDON_MOD_H5PACTIVITY_USERS_PER_PAGE = 20;

// Grade type constants.
export const enum AddonModH5PActivityGradeMethod {
    GRADEMANUAL = 0, // No automatic grading using attempt results.
    GRADEHIGHESTATTEMPT = 1, // Use highest attempt results for grading.
    GRADEAVERAGEATTEMPT = 2, // Use average attempt results for grading.
    GRADELASTATTEMPT = 3, // Use last attempt results for grading.
    GRADEFIRSTATTEMPT = 4, // Use first attempt results for grading.
}

export const ADDON_MOD_H5PACTIVITY_STATE_ID = 'state';
