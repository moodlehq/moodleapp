// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable } from '@angular/core';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';

/**
 * Service to handle offline choices.
 */
@Injectable()
export class AddonModChoiceOfflineProvider {

    // Variables for database.
    static CHOICE_TABLE = 'addon_mod_choice_responses';

    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModChoiceOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModChoiceOfflineProvider.CHOICE_TABLE,
                columns: [
                    {
                        name: 'choiceid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'name',
                        type: 'TEXT'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'responses',
                        type: 'TEXT'
                    },
                    {
                        name: 'deleting',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['choiceid', 'userid']
            }
        ]
    };

    constructor(private sitesProvider: CoreSitesProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a response.
     *
     * @param  {number} choiceId Choice ID to remove.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @param  {number} [userId] User the responses belong to. If not defined, current user in site.
     * @return {Promise<any>} Promise resolved if stored, rejected if failure.
     */
    deleteResponse(choiceId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().deleteRecords(AddonModChoiceOfflineProvider.CHOICE_TABLE, {choiceid: choiceId, userid: userId});
        });
    }

    /**
     * Get all offline responses.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promi[se resolved with responses.
     */
    getResponses(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModChoiceOfflineProvider.CHOICE_TABLE).then((records) => {
                records.forEach((record) => {
                    record.responses = JSON.parse(record.responses);
                });

                return records;
            });
        });
    }

    /**
     * Check if there are offline responses to send.
     *
     * @param  {number} choiceId Choice ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @param  {number} [userId] User the responses belong to. If not defined, current user in site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    hasResponse(choiceId: number, siteId?: string, userId?: number): Promise<boolean> {
        return this.getResponse(choiceId, siteId, userId).then((response) => {
            return !!response.choiceid;
        }).catch((error) => {
            // No offline data found, return false.
            return false;
        });
    }

    /**
     * Get response to be synced.
     *
     * @param  {number} choiceId Choice ID to get.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @param  {number} [userId] User the responses belong to. If not defined, current user in site.
     * @return {Promise<any>} Promise resolved with the object to be synced.
     */
    getResponse(choiceId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().getRecord(AddonModChoiceOfflineProvider.CHOICE_TABLE, {choiceid: choiceId, userid: userId})
                    .then((record) => {
                record.responses = JSON.parse(record.responses);

                return record;
            });
        });
    }

    /**
     * Offline version for sending a response to a choice to Moodle.
     *
     * @param  {number}   choiceId  Choice ID.
     * @param  {string}   name      Choice name.
     * @param  {number}   courseId  Course ID the choice belongs to.
     * @param  {number[]} responses IDs of selected options.
     * @param  {boolean}  deleting  If true, the user is deleting responses, if false, submitting.
     * @param  {string}   [siteId]  Site ID. If not defined, current site.
     * @param  {number}   [userId]  User the responses belong to. If not defined, current user in site.
     * @return {Promise<any>} Promise resolved when results are successfully submitted.
     */
    saveResponse(choiceId: number, name: string, courseId: number, responses: number[], deleting: boolean,
            siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                choiceid: choiceId,
                name: name,
                courseid: courseId,
                userid: userId || site.getUserId(),
                responses: JSON.stringify(responses),
                deleting: deleting ? 1 : 0,
                timecreated: new Date().getTime()
            };

            return site.getDb().insertRecord(AddonModChoiceOfflineProvider.CHOICE_TABLE, entry);
        });
    }
}
