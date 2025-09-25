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
 * Course completion criteria aggregation method.
 */
export enum AddonCourseCompletionAggregation {
    ALL = 1,
    ANY = 2,
}

/**
 * Criteria type constant, primarily for storing criteria type in the database.
 */
export enum AddonCourseCompletionCriteriaType {
    SELF = 1, // Self completion criteria type.
    DATE = 2, // Date completion criteria type.
    UNENROL = 3, // Unenrol completion criteria type.
    ACTIVITY = 4, // Activity completion criteria type.
    DURATION = 5, // Duration completion criteria type.
    GRADE = 6, // Grade completion criteria type.
    ROLE = 7, // Role completion criteria type.
    COURSE = 8, // Course completion criteria type.
}
