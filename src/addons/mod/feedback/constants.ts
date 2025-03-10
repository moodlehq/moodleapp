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

export const ADDON_MOD_FEEDBACK_COMPONENT = 'AddonModFeedback';
export const ADDON_MOD_FEEDBACK_COMPONENT_LEGACY = 'mmaModFeedback';
export const ADDON_MOD_FEEDBACK_PAGE_NAME = 'mod_feedback';
export const ADDON_MOD_FEEDBACK_MODNAME = 'feedback';

export const ADDON_MOD_FEEDBACK_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_FEEDBACK_COMPONENT;

// Events.
export const ADDON_MOD_FEEDBACK_FORM_SUBMITTED = 'addon_mod_feedback_form_submitted';

export const ADDON_MOD_FEEDBACK_LINE_SEP = '|';
export const ADDON_MOD_FEEDBACK_MULTICHOICE_TYPE_SEP = '>>>>>';
export const ADDON_MOD_FEEDBACK_MULTICHOICE_ADJUST_SEP = '<<<<<';
export const ADDON_MOD_FEEDBACK_MULTICHOICE_HIDENOSELECT = 'h';
export const ADDON_MOD_FEEDBACK_MULTICHOICERATED_VALUE_SEP = '####';

export const ADDON_MOD_FEEDBACK_AUTO_SYNCED = 'addon_mod_feedback_autom_synced';

export const ADDON_MOD_FEEDBACK_PER_PAGE = 20;

/**
 * Index Tabs.
 */
export enum AddonModFeedbackIndexTabName {
    OVERVIEW = 'overview',
    ANALYSIS = 'analysis',
}

/**
 * Feedback question types.
 */
export enum AddonModFeedbackQuestionType {
    CAPTCHA = 'captcha',
    INFO = 'info',
    LABEL = 'label',
    MULTICHOICE = 'multichoice',
    MULTICHOICERATED = 'multichoicerated',
    NUMERIC = 'numeric',
    PAGEBREAK = 'pagebreak',
    TEXTAREA = 'textarea',
    TEXTFIELD = 'textfield',
}

/**
 * Multichoice subtypes.
 */
export enum AddonModFeedbackMultichoiceSubtype {
    CHECKBOX = 'c', // Multiple answers.
    DROPDOWN = 'd', // Single answer allowed (drop-down menu).
    RADIO = 'r', // Single answer.
}

export const AddonModFeedbackQuestionTemplateMultichoicePrefix = 'multichoice-';

/**
 * Feedback question templates.
 */
export enum AddonModFeedbackQuestionTemplateNames {
    CAPTCHA = 'captcha',
    LABEL = 'label',
    MULTICHOICE_CHECKBOX = AddonModFeedbackQuestionTemplateMultichoicePrefix + AddonModFeedbackMultichoiceSubtype.CHECKBOX,
    MULTICHOICE_RADIO = AddonModFeedbackQuestionTemplateMultichoicePrefix + AddonModFeedbackMultichoiceSubtype.RADIO,
    MULTICHOICE_DROPDOWN = AddonModFeedbackQuestionTemplateMultichoicePrefix + AddonModFeedbackMultichoiceSubtype.DROPDOWN,
    NUMERIC = 'numeric',
    TEXTAREA = 'textarea',
    TEXTFIELD = 'textfield',
}

/**
 * Feedback analysis templates.
 */
export enum AddonModFeedbackAnalysisTemplateNames {
    CHART = 'chart',
    LIST = 'list',
    NUMERIC = 'numeric',
}
