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

export const ADDON_MOD_LESSON_COMPONENT = 'mmaModLesson';

export const ADDON_MOD_LESSON_PAGE_NAME = 'mod_lesson';

export const ADDON_MOD_LESSON_AUTO_SYNCED = 'addon_mod_lesson_autom_synced';
export const ADDON_MOD_LESSON_DATA_SENT_EVENT = 'addon_mod_lesson_data_sent';

export const enum AddonModLessonJumpTo {
    THISPAGE = 0, // This page.
    UNSEENPAGE = 1, // Next page -> any page not seen before.
    UNANSWEREDPAGE = 2, // Next page -> any page not answered correctly.
    NEXTPAGE = -1, // Jump to Next Page.
    EOL = -9, // End of Lesson.
    UNSEENBRANCHPAGE = -50, // Jump to an unseen page within a branch and end of branch or end of lesson.
    RANDOMPAGE = -60, // Jump to a random page within a branch and end of branch or end of lesson.
    RANDOMBRANCH = -70, // Jump to a random Branch.
    CLUSTERJUMP = -80, // Cluster Jump.
}

// Type of page: question or structure (content).
export const enum AddonModLessonPageType {
    QUESTION = 0,
    STRUCTURE = 1,
}

// Type of question pages.
export const enum AddonModLessonPageSubtype {
    SHORTANSWER =  1,
    TRUEFALSE =    2,
    MULTICHOICE =  3,
    MATCHING =     5,
    NUMERICAL =    8,
    ESSAY =        10,
    BRANCHTABLE =  20, // Content page.
    ENDOFBRANCH =  21,
    CLUSTER =      30,
    ENDOFCLUSTER = 31
}

export const ADDON_MOD_LESSON_OTHER_ANSWERS = '@#wronganswer#@';
