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

import { Injectable } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * Service to handle Offline feedback.
 */
@Injectable()
export class AddonModFeedbackOfflineProvider {

    protected logger;

    // Variables for database.
    static FEEDBACK_TABLE = 'addon_mod_feedback_answers';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModFeedbackOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModFeedbackOfflineProvider.FEEDBACK_TABLE,
                columns: [
                    {
                        name: 'feedbackid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'page',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'responses',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['feedbackid', 'page']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider,
        private textUtils: CoreTextUtilsProvider, private timeUtils: CoreTimeUtilsProvider) {
        this.logger = logger.getInstance('AddonModFeedbackOfflineProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete the stored for a certain feedback page.
     *
     * @param feedbackId Feedback ID.
     * @param page Page of the form to delete responses from.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if deleted, rejected if failure.
     */
    deleteFeedbackPageResponses(feedbackId: number, page: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonModFeedbackOfflineProvider.FEEDBACK_TABLE, {feedbackid: feedbackId, page: page});
        });
    }

    /**
     * Get all the stored feedback responses data from all the feedback.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with entries.
     */
    getAllFeedbackResponses(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getAllRecords(AddonModFeedbackOfflineProvider.FEEDBACK_TABLE).then((entries) => {
                entries.forEach((entry) => {
                    entry.responses = this.textUtils.parseJSON(entry.responses);
                });

                return entries;
            });
        });
    }

    /**
     * Get all the stored responses from a certain feedback.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with responses.
     */
    getFeedbackResponses(feedbackId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModFeedbackOfflineProvider.FEEDBACK_TABLE, {feedbackid: feedbackId});
        }).then((entries) => {
            entries.forEach((entry) => {
                entry.responses = this.textUtils.parseJSON(entry.responses);
            });

            return entries;
        });
    }

    /**
     * Get the stored responses for a certain feedback page.
     *
     * @param feedbackId Feedback ID.
     * @param page Page of the form to get responses from.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with responses.
     */
    getFeedbackPageResponses(feedbackId: number, page: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonModFeedbackOfflineProvider.FEEDBACK_TABLE, {feedbackid: feedbackId, page: page});
        }).then((entry) => {
            entry.responses = this.textUtils.parseJSON(entry.responses);

            return entry;
        });
    }

    /**
     * Get if the feedback have something to be synced.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if the feedback have something to be synced.
     */
    hasFeedbackOfflineData(feedbackId: number, siteId?: string): Promise<any> {
        return this.getFeedbackResponses(feedbackId, siteId).then((responses) => {
           return !!responses.length;
        });
    }

    /**
     * Save page responses to be sent later.
     *
     * @param feedbackId Feedback ID.
     * @param page The page being processed.
     * @param responses The data to be processed the key is the field name (usually type[index]_id)
     * @param courseId Course ID the feedback belongs to.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if stored, rejected if failure.
     */
    saveResponses(feedbackId: number, page: number, responses: any, courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                    feedbackid: feedbackId,
                    page: page,
                    courseid: courseId,
                    responses: JSON.stringify(responses),
                    timemodified: this.timeUtils.timestamp()
                };

            return site.getDb().insertRecord(AddonModFeedbackOfflineProvider.FEEDBACK_TABLE, entry);
        });
    }
}
