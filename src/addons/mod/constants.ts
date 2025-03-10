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

/**
 * Module purposes.
 * On LMS they are prefixed with MOD_PURPOSE_.
 */
export const enum ModPurpose {
    COMMUNICATION = 'communication',
    ASSESSMENT = 'assessment',
    COLLABORATION = 'collaboration',
    CONTENT = 'content',
    ADMINISTRATION = 'administration',
    INTERFACE = 'interface', // @deprecatedonmoodle since 4.4.
    INTERACTIVECONTENT = 'interactivecontent',
    OTHER = 'other',
}

/**
 * Constants from Moodle's resourcelib.
 * On LMS they are prefixed with RESOURCELIB_DISPLAY_.
 */
export const enum ModResourceDisplay {
    INVALID = -1, // Invalid (added by the App.)
    AUTO = 0, // Try the best way.
    EMBED = 1, // Display using object tag.
    FRAME = 2, // Display inside frame.
    NEW = 3, // Display normal link in new window.
    DOWNLOAD = 4, // Force download of file instead of display.
    OPEN = 5, // Open directly.
    POPUP = 6, // Open in "emulated" pop-up without navigation.
}

/**
 * Feature constants. Used to report features that are, or are not, supported by a module.
 * On LMS they are prefixed with FEATURE_.
 */
export const enum ModFeature {
    GRADE_HAS_GRADE = 'grade_has_grade', // True if module can provide a grade.
    GRADE_OUTCOMES = 'outcomes', // True if module supports outcomes.
    ADVANCED_GRADING = 'grade_advanced_grading', // True if module supports advanced grading methods.
    CONTROLS_GRADE_VISIBILITY = 'controlsgradevisbility', // True if module controls grade visibility over gradebook.
    PLAGIARISM = 'plagiarism', // True if module supports plagiarism plugins.
    COMPLETION_TRACKS_VIEWS = 'completion_tracks_views', // True if module tracks whether somebody viewed it.
    COMPLETION_HAS_RULES = 'completion_has_rules', // True if module has custom completion rules.
    NO_VIEW_LINK = 'viewlink', // True if module has no 'view' page (like label).
    IDNUMBER = 'idnumber', // True if module wants support for setting the ID number for grade calculation purposes.
    GROUPS = 'groups', // True if module supports groups.
    GROUPINGS = 'groupings', // True if module supports groupings.
    MOD_ARCHETYPE = 'mod_archetype', // Type of module.
    MOD_INTRO = 'mod_intro', // True if module supports intro editor.
    MODEDIT_DEFAULT_COMPLETION = 'modedit_default_completion', // True if module has default completion.
    COMMENT = 'comment',
    MOD_PURPOSE = 'mod_purpose', // Type of module.
    RATE = 'rate',
    BACKUP_MOODLE2 = 'backup_moodle2', // True if module supports backup/restore of moodle2 format.
    SHOW_DESCRIPTION = 'showdescription', // True if module can show description on course main page.
    USES_QUESTIONS = 'usesquestions', // True if module uses the question bank.
}

/**
 * Possible archetypes for modules.
 * On LMS they are prefixed with MOD_ARCHETYPE_.
 */
export const enum ModArchetype {
    OTHER = 0, // Unspecified module archetype.
    RESOURCE = 1, // Resource-like type module.
    ASSIGNMENT = 2, // Assignment module archetype.
    SYSTEM = 3, // System (not user-addable) module archetype.
}
