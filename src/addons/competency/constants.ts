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

export const ADDON_COMPETENCY_LEARNING_PLANS_PAGE = 'learning-plans';
export const ADDON_COMPETENCY_COMPETENCIES_PAGE = 'competencies';
export const ADDON_COMPETENCY_SUMMARY_PAGE = 'summary';

/**
 * Learning plan status.
 */
export enum AddonCompetencyLearningPlanStatus {
    DRAFT = 0,
    ACTIVE = 1,
    COMPLETE = 2,
    WAITING_FOR_REVIEW = 3,
    IN_REVIEW = 4,
}

/**
 * Competency status.
 */
export enum AddonCompetencyReviewStatus {
    IDLE = 0,
    WAITING_FOR_REVIEW = 1,
    IN_REVIEW = 2,
}
