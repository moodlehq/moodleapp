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

export const QUESTION_TODO_STATE_CLASSES = ['notyetanswered'] as const;
export const QUESTION_INVALID_STATE_CLASSES = ['invalidanswer'] as const;
export const QUESTION_COMPLETE_STATE_CLASSES = ['answersaved'] as const;
export const QUESTION_NEEDS_GRADING_STATE_CLASSES = ['requiresgrading', 'complete'] as const;
export const QUESTION_FINISHED_STATE_CLASSES = ['complete'] as const;
export const QUESTION_GAVE_UP_STATE_CLASSES = ['notanswered'] as const;
export const QUESTION_GRADED_STATE_CLASSES = ['complete', 'incorrect', 'partiallycorrect', 'correct'] as const;

/**
 * Possible values to display marks in a question.
 */
export const enum QuestionDisplayOptionsMarks {
    MAX_ONLY = 1,
    MARK_AND_MAX = 2,
}

/**
 * Possible values that most of the display options take.
 */
export const enum QuestionDisplayOptionsValues {
    SHOW_ALL = -1,
    HIDDEN = 0,
    VISIBLE = 1,
    EDITABLE = 2,
}

/**
 * Possible values for the question complete response or gradable response (compatible).
 */
export const enum QuestionCompleteGradableResponse {
    UNKNOWN = -1,
    NO = 0,
    YES = 1,
}
