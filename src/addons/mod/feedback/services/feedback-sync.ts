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
import { CoreSyncBlockedError } from '@classes/base-sync';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreWSError } from '@classes/errors/wserror';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModFeedback, AddonModFeedbackWSFeedback } from './feedback';
import { AddonModFeedbackOffline, AddonModFeedbackOfflineResponse } from './feedback-offline';
import { ADDON_MOD_FEEDBACK_AUTO_SYNCED, ADDON_MOD_FEEDBACK_COMPONENT } from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Service to sync feedbacks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackSyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModFeedbackSyncResult> {

    protected componentTranslatableString = 'feedback';

    constructor() {
        super('AddonModFeedbackSyncProvider');
    }

    /**
     * @inheritdoc
     */
    prefetchModuleAfterUpdate(
        module: CoreCourseAnyModuleData,
        courseId: number,
        regex?: RegExp,
        siteId?: string,
    ): Promise<boolean> {
        regex = regex || /^.*files$|^timers/;

        return super.prefetchModuleAfterUpdate(module, courseId, regex, siteId);
    }

    /**
     * Try to synchronize all the feedbacks in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllFeedbacks(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all feedbacks', (siteId) => this.syncAllFeedbacksFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all pending feedbacks on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllFeedbacksFunc(force: boolean, siteId?: string): Promise<void> {
        // Sync all new responses.
        const responses = await AddonModFeedbackOffline.getAllFeedbackResponses(siteId);

        // Do not sync same feedback twice.
        const treated: Record<number, boolean> = {};

        await Promise.all(responses.map(async (response) => {
            if (treated[response.feedbackid]) {
                return;
            }

            treated[response.feedbackid] = true;

            const result = force ?
                await this.syncFeedback(response.feedbackid, siteId) :
                await this.syncFeedbackIfNeeded(response.feedbackid, siteId);

            if (result?.updated) {
                // Sync successful, send event.
                CoreEvents.trigger(ADDON_MOD_FEEDBACK_AUTO_SYNCED, {
                    feedbackId: response.feedbackid,
                    warnings: result.warnings,
                }, siteId);
            }
        }));
    }

    /**
     * Sync a feedback only if a certain time has passed since the last time.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the feedback is synced or if it doesn't need to be synced.
     */
    async syncFeedbackIfNeeded(feedbackId: number, siteId?: string): Promise<AddonModFeedbackSyncResult | undefined> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const needed = await this.isSyncNeeded(feedbackId, siteId);

        if (needed) {
            return this.syncFeedback(feedbackId, siteId);
        }
    }

    /**
     * Synchronize all offline responses of a feedback.
     *
     * @param feedbackId Feedback ID to be synced.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncFeedback(feedbackId: number, siteId?: string): Promise<AddonModFeedbackSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(feedbackId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for this feedback, return the promise.
            return currentSyncPromise;
        }

        // Verify that feedback isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_FEEDBACK_COMPONENT, feedbackId, siteId)) {
            this.logger.debug(`Cannot sync feedback '${feedbackId}' because it is blocked.`);

            throw new CoreSyncBlockedError(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync feedback '${feedbackId}' in site ${siteId}'`);

        return this.addOngoingSync(feedbackId, this.performSyncFeedback(feedbackId, siteId), siteId);
    }

    /**
     * Perform the feedback sync.
     *
     * @param feedbackId Feedback ID.
     * @param siteId Site ID.
     * @returns Promise resolved in success.
     */
    protected async performSyncFeedback(feedbackId: number, siteId: string): Promise<AddonModFeedbackSyncResult> {
        const result: AddonModFeedbackSyncResult = {
            warnings: [],
            updated: false,
        };

        // Sync offline logs.
        await CorePromiseUtils.ignoreErrors(CoreCourseLogHelper.syncActivity(ADDON_MOD_FEEDBACK_COMPONENT, feedbackId, siteId));

        // Get offline responses to be sent.
        const responses = await CorePromiseUtils.ignoreErrors(AddonModFeedbackOffline.getFeedbackResponses(feedbackId, siteId));

        if (!responses || !responses.length) {
            // Nothing to sync.
            await CorePromiseUtils.ignoreErrors(this.setSyncTime(feedbackId, siteId));

            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const courseId = responses[0].courseid;

        const feedback = await AddonModFeedback.getFeedbackById(courseId, feedbackId, { siteId });

        if (!feedback.multiple_submit) {
            // If it does not admit multiple submits, check if it is completed to know if we can submit.
            const isCompleted = await AddonModFeedback.isCompleted(feedbackId, { cmId: feedback.coursemodule, siteId });

            if (isCompleted) {
                // Cannot submit again, delete resposes.
                await Promise.all(responses.map((data) =>
                    AddonModFeedbackOffline.deleteFeedbackPageResponses(feedbackId, data.page, siteId)));

                result.updated = true;
                this.addOfflineDataDeletedWarning(
                    result.warnings,
                    feedback.name,
                    Translate.instant('addon.mod_feedback.this_feedback_is_already_submitted'),
                );

                await CorePromiseUtils.ignoreErrors(this.setSyncTime(feedbackId, siteId));

                return result;
            }
        }

        const timemodified = await AddonModFeedback.getCurrentCompletedTimeModified(feedbackId, {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        });
        // Sort by page.
        responses.sort((a, b) => a.page - b.page);

        const orderedData = responses.map((data) => ({
            function: () => this.processPage(feedback, data, siteId, timemodified, result),
            blocking: true,
        }));

        // Execute all the processes in order to solve dependencies.
        await CorePromiseUtils.executeOrderedPromises(orderedData);

        if (result.updated) {
            // Data has been sent to server, update data.
            try {
                const module = await CoreCourse.getModuleBasicInfoByInstance(feedbackId, 'feedback', { siteId });

                await this.prefetchModuleAfterUpdate(module, courseId, undefined, siteId);
            } catch {
                // Ignore errors.
            }
        }

        // Sync finished, set sync time.
        await CorePromiseUtils.ignoreErrors(this.setSyncTime(feedbackId, siteId));

        return result;
    }

    /**
     * Convenience function to sync process page calls.
     *
     * @param feedback Feedback object.
     * @param data Response data.
     * @param siteId Site Id.
     * @param timemodified Current completed modification time.
     * @param result Result object to be modified.
     * @returns Resolve when done or rejected with error.
     */
    protected async processPage(
        feedback: AddonModFeedbackWSFeedback,
        data: AddonModFeedbackOfflineResponse,
        siteId: string,
        timemodified: number,
        result: AddonModFeedbackSyncResult,
    ): Promise<void> {
        // Delete all pages that are submitted before changing website.
        if (timemodified > data.timemodified) {
            return AddonModFeedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId);
        }

        try {
            await AddonModFeedback.processPageOnline(feedback.id, data.page, data.responses, false, siteId);

            result.updated = true;

            await AddonModFeedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId);
        } catch (error) {
            if (!CoreWSError.isWebServiceError(error)) {
                // Couldn't connect to server, reject.
                throw error;
            }

            // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
            result.updated = true;

            await AddonModFeedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId);

            // Responses deleted, add a warning.
            this.addOfflineDataDeletedWarning(
                result.warnings,
                feedback.name,
                error,
            );
        }
    }

}

export const AddonModFeedbackSync = makeSingleton(AddonModFeedbackSyncProvider);

/**
 * Data returned by a feedback sync.
 */
export type AddonModFeedbackSyncResult = CoreSyncResult;

/**
 * Data passed to ADDON_MOD_FEEDBACK_AUTO_SYNCED event.
 */
export type AddonModFeedbackAutoSyncData = {
    feedbackId: number;
    warnings: string[];
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_FEEDBACK_AUTO_SYNCED]: AddonModFeedbackAutoSyncData;
    }

}
