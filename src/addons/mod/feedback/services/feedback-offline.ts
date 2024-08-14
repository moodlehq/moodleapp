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
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreTimeUtils } from '@services/utils/time';
import { makeSingleton } from '@singletons';
import { AddonModFeedbackResponseDBRecord, FEEDBACK_TABLE_NAME } from './database/feedback';
import { AddonModFeedbackResponseValue } from './feedback';

/**
 * Service to handle offline feedback.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackOfflineProvider {

    /**
     * Delete the stored for a certain feedback page.
     *
     * @param feedbackId Feedback ID.
     * @param page Page of the form to delete responses from.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteFeedbackPageResponses(feedbackId: number, page: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(FEEDBACK_TABLE_NAME, <Partial<AddonModFeedbackResponseDBRecord>> {
            feedbackid: feedbackId,
            page: page,
        });
    }

    /**
     * Get all the stored feedback responses data from all the feedback.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with entries.
     */
    async getAllFeedbackResponses(siteId?: string): Promise<AddonModFeedbackOfflineResponse[]> {
        const site = await CoreSites.getSite(siteId);

        const entries = await site.getDb().getAllRecords<AddonModFeedbackResponseDBRecord>(FEEDBACK_TABLE_NAME);

        return entries.map(entry => this.parseResponse(entry));
    }

    /**
     * Get all the stored responses from a certain feedback.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with responses.
     */
    async getFeedbackResponses(feedbackId: number, siteId?: string): Promise<AddonModFeedbackOfflineResponse[]> {
        const site = await CoreSites.getSite(siteId);

        const entries = await site.getDb().getRecords<AddonModFeedbackResponseDBRecord>(FEEDBACK_TABLE_NAME, {
            feedbackid: feedbackId,
        });

        return entries.map(entry => this.parseResponse(entry));
    }

    /**
     * Get the stored responses for a certain feedback page.
     *
     * @param feedbackId Feedback ID.
     * @param page Page of the form to get responses from.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with responses.
     */
    async getFeedbackPageResponses(feedbackId: number, page: number, siteId?: string): Promise<AddonModFeedbackOfflineResponse> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModFeedbackResponseDBRecord> = {
            feedbackid: feedbackId,
            page: page,
        };

        const entry = await site.getDb().getRecord<AddonModFeedbackResponseDBRecord>(FEEDBACK_TABLE_NAME, conditions);

        return this.parseResponse(entry);
    }

    /**
     * Get if the feedback have something to be synced.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if the feedback have something to be synced.
     */
    async hasFeedbackOfflineData(feedbackId: number, siteId?: string): Promise<boolean> {
        const responses = await this.getFeedbackResponses(feedbackId, siteId);

        return !!responses.length;
    }

    /**
     * Parse "options" and "attachments" columns of a fetched record.
     *
     * @param record Record object
     * @returns Record object with columns parsed.
     */
    protected parseResponse(record: AddonModFeedbackResponseDBRecord): AddonModFeedbackOfflineResponse {
        return Object.assign(record, {
            responses: <Record<string, AddonModFeedbackResponseValue>> CoreText.parseJSON(record.responses),
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
     * @returns Promise resolved if stored, rejected if failure.
     */
    async saveResponses(
        feedbackId: number,
        page: number,
        responses: Record<string, AddonModFeedbackResponseValue>,
        courseId: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const entry: AddonModFeedbackResponseDBRecord = {
            feedbackid: feedbackId,
            page: page,
            courseid: courseId,
            responses: JSON.stringify(responses),
            timemodified: CoreTimeUtils.timestamp(),
        };

        await site.getDb().insertRecord(FEEDBACK_TABLE_NAME, entry);
    }

}

export const AddonModFeedbackOffline = makeSingleton(AddonModFeedbackOfflineProvider);

/**
 * Feedback offline response with parsed data.
 */
export type AddonModFeedbackOfflineResponse = Omit<AddonModFeedbackResponseDBRecord, 'responses'> & {
    responses: Record<string, AddonModFeedbackResponseValue>;
};
