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

export const ADDON_MOD_ASSIGN_COMPONENT = 'AddonModAssign';
export const ADDON_MOD_ASSIGN_COMPONENT_LEGACY = 'mmaModAssign';
export const ADDON_MOD_ASSIGN_PAGE_NAME = 'mod_assign';
export const ADDON_MOD_ASSIGN_MODNAME = 'assign';

export const ADDON_MOD_ASSIGN_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_ASSIGN_COMPONENT;

// Handlers.
export const ADDON_MOD_ASSIGN_SYNC_CRON_NAME = 'AddonModAssignSyncCronHandler';

// Events.
export const ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT = 'addon_mod_assign_submission_saved';
export const ADDON_MOD_ASSIGN_SUBMISSION_REMOVED_EVENT = 'addon_mod_assign_submission_removed';
export const ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT = 'addon_mod_assign_submitted_for_grading';
export const ADDON_MOD_ASSIGN_GRADED_EVENT = 'addon_mod_assign_graded';
export const ADDON_MOD_ASSIGN_STARTED_EVENT = 'addon_mod_assign_started';
export const ADDON_MOD_ASSIGN_AUTO_SYNCED = 'addon_mod_assign_autom_synced';
export const ADDON_MOD_ASSIGN_MANUAL_SYNCED = 'addon_mod_assign_manual_synced';

export const ADDON_MOD_ASSIGN_UNLIMITED_ATTEMPTS = -1;

// Group submissions warnings.
export const ADDON_MOD_ASSIGN_WARN_GROUPS_REQUIRED = 'warnrequired';
export const ADDON_MOD_ASSIGN_WARN_GROUPS_OPTIONAL = 'warnoptional';

/**
 * Assignment submission statuses.
 * Constants on LMS starting with ASSIGN_SUBMISSION_STATUS_
 */
const enum AddonModAssignSubmissionStatus {
    NEW = 'new',
    REOPENED = 'reopened',
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
};

/**
 * Marking workflow states.
 * Constants on LMS starting with ASSIGN_MARKING_WORKFLOW_STATE_
 */
const enum AddonModAssignMarkingWorkflowStates {
    NOTMARKED = 'notmarked',
    INMARKING = 'inmarking',
    READYFORREVIEW = 'readyforreview',
    INREVIEW = 'inreview',
    READYFORRELEASE = 'readyforrelease',
    RELEASED = 'released',
}

/**
 * Grading states.
 * Constants on LMS starting with ASSIGN_GRADING_STATUS_
 */
const enum AddonModAssignGradingStatus {
    GRADED = 'graded',
    NOT_GRADED = 'notgraded',
}

/**
 * Submission status for the app.
 */
export const enum AddonModAssignSubmissionStatusValues {
    SUBMITTED = AddonModAssignSubmissionStatus.SUBMITTED,
    DRAFT = AddonModAssignSubmissionStatus.DRAFT,
    NEW = AddonModAssignSubmissionStatus.NEW,
    REOPENED = AddonModAssignSubmissionStatus.REOPENED,
    // Added by App Statuses.
    NO_ATTEMPT = 'noattempt',
    NO_ONLINE_SUBMISSIONS = 'noonlinesubmissions',
    NO_SUBMISSION = 'nosubmission',
    GRADED_FOLLOWUP_SUBMIT = 'gradedfollowupsubmit',
}

/**
 * Grading status for the app. Merge of AddonModAssignGradingStatus and AddonModAssignMarkingWorkflowStates.
 */
export const enum AddonModAssignGradingStates {
    // AddonModAssignGradingStatus
    GRADED = AddonModAssignGradingStatus.GRADED,
    NOT_GRADED = AddonModAssignGradingStatus.NOT_GRADED,
    // AddonModAssignMarkingWorkflowStates
    MARKING_WORKFLOW_STATE_NOTMARKED = AddonModAssignMarkingWorkflowStates.NOTMARKED,
    MARKING_WORKFLOW_STATE_INMARKING = AddonModAssignMarkingWorkflowStates.INMARKING,
    MARKING_WORKFLOW_STATE_READYFORREVIEW = AddonModAssignMarkingWorkflowStates.READYFORREVIEW,
    MARKING_WORKFLOW_STATE_INREVIEW = AddonModAssignMarkingWorkflowStates.INREVIEW,
    MARKING_WORKFLOW_STATE_READYFORRELEASE = AddonModAssignMarkingWorkflowStates.READYFORRELEASE,
    MARKING_WORKFLOW_STATE_RELEASED = AddonModAssignMarkingWorkflowStates.RELEASED,
    // Added by App Statuses.
    GRADED_FOLLOWUP_SUBMIT = 'gradedfollowupsubmit',
}

/**
 * Reopen attempt methods.
 * Constants on LMS starting with ASSIGN_ATTEMPT_REOPEN_METHOD_
 */
export const enum AddonModAssignAttemptReopenMethodValues {
    NONE = 'none',
    MANUAL = 'manual',
    AUTOMATIC = 'automatic',
    UNTILPASS = 'untilpass',
}

/**
 * List filter by status name.
 */
export const enum AddonModAssignListFilterName {
    ALL = '',
    NEED_GRADING = 'needgrading',
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
}
