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
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import { CoreSyncResult } from '@services/sync';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreWSError } from '@classes/errors/wserror';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@static/events';
import { AddonModSurvey } from './survey';
import { AddonModSurveyAnswersDBRecordFormatted, AddonModSurveyOffline } from './survey-offline';
import { ADDON_MOD_SURVEY_AUTO_SYNCED, ADDON_MOD_SURVEY_COMPONENT_LEGACY, ADDON_MOD_SURVEY_MODNAME } from '../constants';
import { CorePromiseUtils } from '@static/promise-utils';

/**
 * Service to sync surveys.
 */
@Injectable( { providedIn: 'root' })
export class AddonModSurveySyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModSurveySyncResult> {

    protected componentTranslatableString = 'survey';

    constructor() {
        super('AddonModSurveySyncProvider');
    }

    /**
     * Get the ID of a survey sync.
     *
     * @param surveyId Survey ID.
     * @param userId User the answers belong to.
     * @returns Sync ID.
     * @protected
     */
    getSyncId(surveyId: number, userId: number): string {
        return `${surveyId}#${userId}`;
    }

    /**
     * Try to synchronize all the surveys in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllSurveys(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all surveys', (siteId) => this.syncAllSurveysFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all pending surveys on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllSurveysFunc(force: boolean, siteId: string): Promise<void> {
        // Get all survey answers pending to be sent in the site.
        const entries = await AddonModSurveyOffline.getAllData(siteId);

        // Sync all surveys.
        const promises = entries.map(async (entry) => {
            const result = await (force
                ? this.syncSurvey(entry.surveyid, entry.userid, siteId)
                : this.syncSurveyIfNeeded(entry.surveyid, entry.userid, siteId));

            if (result && result.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(ADDON_MOD_SURVEY_AUTO_SYNCED, {
                    surveyId: entry.surveyid,
                    userId: entry.userid,
                    warnings: result.warnings,
                }, siteId);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Sync a survey only if a certain time has passed since the last time.
     *
     * @param surveyId Survey ID.
     * @param userId User the answers belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the survey is synced or if it doesn't need to be synced.
     */
    async syncSurveyIfNeeded(surveyId: number, userId: number, siteId?: string): Promise<AddonModSurveySyncResult | undefined> {
        const syncId = this.getSyncId(surveyId, userId);

        const needed = await this.isSyncNeeded(syncId, siteId);
        if (needed) {
            return this.syncSurvey(surveyId, userId, siteId);
        }
    }

    /**
     * Synchronize a survey.
     *
     * @param surveyId Survey ID.
     * @param userId User the answers belong to. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncSurvey(surveyId: number, userId?: number, siteId?: string): Promise<AddonModSurveySyncResult> {
        const site = await CoreSites.getSite(siteId);
        siteId = site.getId();
        userId = userId || site.getUserId();

        const syncId = this.getSyncId(surveyId, userId);
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);

        if (currentSyncPromise) {
            // There's already a sync ongoing for this site, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug(`Try to sync survey '${surveyId}' for user '${userId}'`);

        // Get offline events.
        const syncPromise = this.performSyncSurvey(surveyId, userId, siteId);

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Perform the survey sync.
     *
     * @param surveyId Survey ID.
     * @param userId User the answers belong to. If not defined, current user.
     * @param siteId Site ID.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    protected async performSyncSurvey(surveyId: number, userId: number, siteId: string): Promise<AddonModSurveySyncResult> {
        const result: AddonModSurveySyncResult = {
            warnings: [],
            updated: false,
        };

        // Sync offline logs.
        CorePromiseUtils.ignoreErrors(CoreCourseLogHelper.syncActivity(ADDON_MOD_SURVEY_COMPONENT_LEGACY, surveyId, siteId));

        let answersNumber = 0;
        let data: AddonModSurveyAnswersDBRecordFormatted | undefined;
        try {
            // Get answers to be sent.
            data = await AddonModSurveyOffline.getSurveyData(surveyId, siteId, userId);

            answersNumber = data.answers.length;
        } catch {
            // Ignore errors.
        }

        if (answersNumber > 0 && data) {
            if (!CoreNetwork.isOnline()) {
                // Cannot sync in offline.
                throw new CoreNetworkError();
            }

            result.courseId = data.courseid;

            // Send the answers.
            try {
                await AddonModSurvey.submitAnswersOnline(surveyId, data.answers, siteId);

                result.updated = true;

                // Answers sent, delete them.
                await AddonModSurveyOffline.deleteSurveyAnswers(surveyId, siteId, userId);
            } catch (error) {
                if (!CoreWSError.isWebServiceError(error)) {
                    // Local error, reject.
                    throw error;
                }

                // The WebService has thrown an error, this means that answers cannot be submitted. Delete them.
                result.updated = true;

                await AddonModSurveyOffline.deleteSurveyAnswers(surveyId, siteId, userId);

                // Answers deleted, add a warning.
                this.addOfflineDataDeletedWarning(result.warnings, data.name, error);
            }

            if (result.courseId) {
                await AddonModSurvey.invalidateSurveyData(result.courseId, siteId);

                // Data has been sent to server, update survey data.
                const module = await CoreCourse.getModuleBasicInfoByInstance(surveyId, ADDON_MOD_SURVEY_MODNAME, { siteId });

                CorePromiseUtils.ignoreErrors(
                    this.prefetchModuleAfterUpdate(module, result.courseId, undefined, siteId),
                );
            }
        }

        const syncId = this.getSyncId(surveyId, userId);
        // Sync finished, set sync time.
        CorePromiseUtils.ignoreErrors(this.setSyncTime(syncId, siteId));

        return result;
    }

}
export const AddonModSurveySync = makeSingleton(AddonModSurveySyncProvider);

declare module '@static/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_SURVEY_AUTO_SYNCED]: AddonModSurveyAutoSyncData;
    }

}

/**
 * Data returned by a assign sync.
 */
export type AddonModSurveySyncResult = CoreSyncResult & {
    courseId?: number; // Course the survey belongs to (if known).
};

/**
 * Data passed to ADDON_MOD_SURVEY_AUTO_SYNCED event.
 */
export type AddonModSurveyAutoSyncData = {
    surveyId: number;
    warnings: string[];
    userId: number;
};
