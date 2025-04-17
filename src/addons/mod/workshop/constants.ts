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

export const ADDON_MOD_WORKSHOP_COMPONENT = 'mmaModWorkshop';

export const ADDON_MOD_WORKSHOP_PER_PAGE = 10;

// Routing.
export const ADDON_MOD_WORKSHOP_PAGE_NAME = 'mod_workshop';

// Handlers.
export const ADDON_MOD_WORKSHOP_PREFETCH_NAME = 'AddonModWorkshop';
export const ADDON_MOD_WORKSHOP_PREFETCH_MODNAME = 'workshop';
export const ADDON_MOD_WORKSHOP_PREFETCH_COMPONENT = ADDON_MOD_WORKSHOP_COMPONENT;
export const ADDON_MOD_WORKSHOP_PREFETCH_UPDATE_NAMES = new RegExp(
    [
        '^configuration$',
        '^.*files$',
        '^completion',
        '^gradeitems$',
        '^outcomes$',
        '^submissions$',
        '^assessments$' +
        '^assessmentgrades$',
        '^usersubmissions$',
        '^userassessments$',
        '^userassessmentgrades$',
        '^userassessmentgrades$',
    ].join('|'),
);

export const ADDON_MOD_WORKSHOP_SYNC_CRON_NAME = 'AddonModWorkshopSyncCronHandler';

export const ADDON_MOD_WORKSHOP_FEATURE_NAME = 'CoreCourseModuleDelegate_AddonModWorkshop';

// Events.
export const ADDON_MOD_WORKSHOP_SUBMISSION_CHANGED = 'addon_mod_workshop_submission_changed';
export const ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED = 'addon_mod_workshop_assessment_saved';
export const ADDON_MOD_WORKSHOP_ASSESSMENT_INVALIDATED = 'addon_mod_workshop_assessment_invalidated';
export const ADDON_MOD_WORKSHOP_AUTO_SYNCED = 'addon_mod_workshop_autom_synced';

export const enum AddonModWorkshopPhase {
    PHASE_SETUP = 10,
    PHASE_SUBMISSION = 20,
    PHASE_ASSESSMENT = 30,
    PHASE_EVALUATION = 40,
    PHASE_CLOSED = 50,
}

export const enum AddonModWorkshopSubmissionType {
    SUBMISSION_TYPE_DISABLED = 0,
    SUBMISSION_TYPE_AVAILABLE = 1,
    SUBMISSION_TYPE_REQUIRED = 2,
}

export const enum AddonModWorkshopExampleMode {
    EXAMPLES_VOLUNTARY = 0,
    EXAMPLES_BEFORE_SUBMISSION = 1,
    EXAMPLES_BEFORE_ASSESSMENT = 2,
}

export const enum AddonModWorkshopAction {
    ADD = 'add',
    DELETE = 'delete',
    UPDATE = 'update',
}

export const enum AddonModWorkshopAssessmentMode {
    ASSESSMENT = 'assessment',
    PREVIEW = 'preview',
}

export const enum AddonModWorkshopOverallFeedbackMode {
    DISABLED = 0,
    ENABLED_OPTIONAL = 1,
    ENABLED_REQUIRED = 2,
}
