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
import { makeSingleton } from '@singletons';
import { AddonModChoiceResponsesDBRecord, RESPONSES_TABLE_NAME } from './database/choice';

/**
 * Service to handle offline choices.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChoiceOfflineProvider {

    /**
     * Delete a response.
     *
     * @param choiceId Choice ID to remove.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the responses belong to. If not defined, current user in site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteResponse(choiceId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.getDb().deleteRecords(RESPONSES_TABLE_NAME, { choiceid: choiceId, userid: userId });
    }

    /**
     * Get all offline responses.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promi[se resolved with responses.
     */
    async getResponses(siteId?: string): Promise<AddonModChoiceOfflineResponses[]> {
        const site = await CoreSites.getSite(siteId);

        const records = await site.getDb().getRecords<AddonModChoiceResponsesDBRecord>(RESPONSES_TABLE_NAME);

        return records.map((record) => this.parseResponse(record));
    }

    /**
     * Check if there are offline responses to send.
     *
     * @param choiceId Choice ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the responses belong to. If not defined, current user in site.
     * @returns Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    async hasResponse(choiceId: number, siteId?: string, userId?: number): Promise<boolean> {
        try {
            const response = await this.getResponse(choiceId, siteId, userId);

            return !!response.choiceid;
        } catch {
            // No offline data found, return false.
            return false;
        }
    }

    /**
     * Get response to be synced.
     *
     * @param choiceId Choice ID to get.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the responses belong to. If not defined, current user in site.
     * @returns Promise resolved with the object to be synced.
     */
    async getResponse(choiceId: number, siteId?: string, userId?: number): Promise<AddonModChoiceOfflineResponses> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const record = await site.getDb().getRecord<AddonModChoiceResponsesDBRecord>(RESPONSES_TABLE_NAME, {
            choiceid: choiceId,
            userid: userId,
        });

        return this.parseResponse(record);
    }

    /**
     * Parse responses.
     *
     * @param entry Entry to parse.
     * @returns Parsed entry.
     */
    protected parseResponse(entry: AddonModChoiceResponsesDBRecord): AddonModChoiceOfflineResponses {
        return {
            ...entry,
            responses: CoreText.parseJSON(entry.responses, <number[]> []),
        };
    }

    /**
     * Offline version for sending a response to a choice to Moodle.
     *
     * @param choiceId Choice ID.
     * @param name Choice name.
     * @param courseId Course ID the choice belongs to.
     * @param responses IDs of selected options.
     * @param deleting If true, the user is deleting responses, if false, submitting.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the responses belong to. If not defined, current user in site.
     * @returns Promise resolved when results are successfully submitted.
     */
    async saveResponse(
        choiceId: number,
        name: string,
        courseId: number,
        responses: number[],
        deleting: boolean,
        siteId?: string,
        userId?: number,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const entry: AddonModChoiceResponsesDBRecord = {
            choiceid: choiceId,
            name: name,
            courseid: courseId,
            userid: userId || site.getUserId(),
            responses: JSON.stringify(responses),
            deleting: deleting ? 1 : 0,
            timecreated: Date.now(),
        };

        await site.getDb().insertRecord(RESPONSES_TABLE_NAME, entry);
    }

}

export const AddonModChoiceOffline = makeSingleton(AddonModChoiceOfflineProvider);

export type AddonModChoiceOfflineResponses = Omit<AddonModChoiceResponsesDBRecord, 'responses'> & {
    responses: number[];
};
