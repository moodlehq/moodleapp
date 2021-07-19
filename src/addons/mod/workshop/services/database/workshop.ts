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

import { CoreSiteSchema } from '@services/sites';
import { AddonModWorkshopAction } from '../workshop';

/**
 * Database variables for AddonModWorkshopOfflineProvider.
 */
export const SUBMISSIONS_TABLE = 'addon_mod_workshop_submissions';
export const ASSESSMENTS_TABLE = 'addon_mod_workshop_assessments';
export const EVALUATE_SUBMISSIONS_TABLE = 'addon_mod_workshop_evaluate_submissions';
export const EVALUATE_ASSESSMENTS_TABLE = 'addon_mod_workshop_evaluate_assessments';

export const ADDON_MOD_WORKSHOP_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModWorkshopOfflineProvider',
    version: 1,
    tables: [
        {
            name: SUBMISSIONS_TABLE,
            columns: [
                {
                    name: 'workshopid',
                    type: 'INTEGER',
                },
                {
                    name: 'action',
                    type: 'TEXT',
                },
                {
                    name: 'submissionid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'title',
                    type: 'TEXT',
                },
                {
                    name: 'content',
                    type: 'TEXT',
                },
                {
                    name: 'attachmentsid',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['workshopid', 'action'],
        },
        {
            name: ASSESSMENTS_TABLE,
            columns: [
                {
                    name: 'workshopid',
                    type: 'INTEGER',
                },
                {
                    name: 'assessmentid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'inputdata',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['workshopid', 'assessmentid'],
        },
        {
            name: EVALUATE_SUBMISSIONS_TABLE,
            columns: [
                {
                    name: 'workshopid',
                    type: 'INTEGER',
                },
                {
                    name: 'submissionid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'feedbacktext',
                    type: 'TEXT',
                },
                {
                    name: 'published',
                    type: 'INTEGER',
                },
                {
                    name: 'gradeover',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['workshopid', 'submissionid'],
        },
        {
            name: EVALUATE_ASSESSMENTS_TABLE,
            columns: [
                {
                    name: 'workshopid',
                    type: 'INTEGER',
                },
                {
                    name: 'assessmentid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'feedbacktext',
                    type: 'TEXT',
                },
                {
                    name: 'weight',
                    type: 'INTEGER',
                },
                {
                    name: 'gradinggradeover',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['workshopid', 'assessmentid'],
        },
    ],
};

/**
 * Data about workshop submissions to sync.
 */
export type AddonModWorkshopSubmissionDBRecord = {
    workshopid: number; // Primary key.
    action: AddonModWorkshopAction; // Primary key.
    submissionid: number;
    courseid: number;
    title: string;
    content: string;
    attachmentsid: string;
    timemodified: number;
};

/**
 * Data about workshop assessments to sync.
 */
export type AddonModWorkshopAssessmentDBRecord = {
    workshopid: number; // Primary key.
    assessmentid: number; // Primary key.
    courseid: number;
    inputdata: string;
    timemodified: number;
};

/**
 * Data about workshop evaluate submissions to sync.
 */
export type AddonModWorkshopEvaluateSubmissionDBRecord = {
    workshopid: number; // Primary key.
    submissionid: number; // Primary key.
    courseid: number;
    timemodified: number;
    feedbacktext: string;
    published: number;
    gradeover: string;
};

/**
 * Data about workshop evaluate assessments to sync.
 */
export type AddonModWorkshopEvaluateAssessmentDBRecord = {
    workshopid: number; // Primary key.
    assessmentid: number; // Primary key.
    courseid: number;
    timemodified: number;
    feedbacktext: string;
    weight: number;
    gradinggradeover: string;
};
