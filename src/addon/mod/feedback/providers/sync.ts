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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { AddonModFeedbackOfflineProvider } from './offline';
import { AddonModFeedbackProvider } from './feedback';
import { CoreEventsProvider } from '@providers/events';
import { TranslateService } from '@ngx-translate/core';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivitySyncBaseProvider } from '@core/course/classes/activity-sync';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreSyncProvider } from '@providers/sync';
import { AddonModFeedbackPrefetchHandler } from './prefetch-handler';

/**
 * Service to sync feedbacks.
 */
@Injectable()
export class AddonModFeedbackSyncProvider extends CoreCourseActivitySyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_feedback_autom_synced';
    protected componentTranslate: string;

    constructor(protected sitesProvider: CoreSitesProvider, protected loggerProvider: CoreLoggerProvider,
            protected appProvider: CoreAppProvider, private feedbackOffline: AddonModFeedbackOfflineProvider,
            private eventsProvider: CoreEventsProvider,  private feedbackProvider: AddonModFeedbackProvider,
            protected translate: TranslateService, private utils: CoreUtilsProvider, protected textUtils: CoreTextUtilsProvider,
            private courseProvider: CoreCourseProvider, syncProvider: CoreSyncProvider, timeUtils: CoreTimeUtilsProvider,
            private logHelper: CoreCourseLogHelperProvider, prefetchDelegate: CoreCourseModulePrefetchDelegate,
            prefetchHandler: AddonModFeedbackPrefetchHandler) {

        super('AddonModFeedbackSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils, prefetchDelegate, prefetchHandler);

        this.componentTranslate = courseProvider.translateModuleName('feedback');
    }

    /**
     * Conveniece function to prefetch data after an update.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID.
     * @param {RegExp} [regex] If regex matches, don't download the data. Defaults to check files and timers.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetchAfterUpdate(module: any, courseId: number, regex?: RegExp, siteId?: string): Promise<any> {
        regex = regex || /^.*files$|^timers/;

        return super.prefetchAfterUpdate(module, courseId, regex, siteId);
    }

    /**
     * Try to synchronize all the feedbacks in a certain site or in all sites.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} force Wether to force sync not depending on last execution.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllFeedbacks(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all feedbacks', this.syncAllFeedbacksFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all pending feedbacks on a site.
     *
     * @param {string}  [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} force    Wether to force sync not depending on last execution.
     * @param {Promise<any>}     Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllFeedbacksFunc(siteId?: string, force?: boolean): Promise<any> {
         // Sync all new responses.
        return this.feedbackOffline.getAllFeedbackResponses(siteId).then((responses) => {
            const promises = {};

            // Do not sync same feedback twice.
            for (const i in responses) {
                const response = responses[i];

                if (typeof promises[response.feedbackid] != 'undefined') {
                    continue;
                }

                promises[response.feedbackid] = force ? this.syncFeedback(response.feedbackid, siteId) :
                    this.syncFeedbackIfNeeded(response.feedbackid, siteId);

                promises[response.feedbackid].then((result) => {
                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModFeedbackSyncProvider.AUTO_SYNCED, {
                            feedbackId: response.feedbackid,
                            userId: response.userid,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            }

            // Promises will be an object so, convert to an array first;
            return Promise.all(this.utils.objectToArray(promises));
        });
    }

    /**
     * Sync a feedback only if a certain time has passed since the last time.
     *
     * @param  {number} feedbackId  Feedback ID.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved when the feedback is synced or if it doesn't need to be synced.
     */
    syncFeedbackIfNeeded(feedbackId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.isSyncNeeded(feedbackId, siteId).then((needed) => {
            if (needed) {
                return this.syncFeedback(feedbackId, siteId);
            }
        });
    }

    /**
     * Synchronize all offline responses of a feedback.
     *
     * @param  {number} feedbackId Feedback ID to be synced.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected otherwise.
     */
    syncFeedback(feedbackId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = feedbackId;

        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this feedback, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        // Verify that feedback isn't blocked.
        if (this.syncProvider.isBlocked(AddonModFeedbackProvider.COMPONENT, syncId, siteId)) {
            this.logger.debug(`Cannot sync feedback '${syncId}' because it is blocked.`);

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        const result = {
            warnings: [],
            updated: false
        };

        let courseId,
            feedback;

        this.logger.debug(`Try to sync feedback '${feedbackId}' in site ${siteId}'`);

        // Sync offline logs.
        const syncPromise = this.logHelper.syncIfNeeded(AddonModFeedbackProvider.COMPONENT, feedbackId, siteId).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Get offline responses to be sent.
            return this.feedbackOffline.getFeedbackResponses(feedbackId, siteId).catch(() => {
                // No offline data found, return empty array.
                return [];
            });
        }).then((responses) => {
            if (!responses.length) {
                // Nothing to sync.
                return;
            }

            if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            courseId = responses[0].courseid;

            return this.feedbackProvider.getFeedbackById(courseId, feedbackId, siteId).then((feedbackData) => {
                feedback = feedbackData;

                if (!feedback.multiple_submit) {
                    // If it does not admit multiple submits, check if it is completed to know if we can submit.
                    return this.feedbackProvider.isCompleted(feedbackId);
                } else {
                    return false;
                }
            }).then((isCompleted) => {
                if (isCompleted) {
                    // Cannot submit again, delete resposes.
                    const promises = [];

                    responses.forEach((data) => {
                        promises.push(this.feedbackOffline.deleteFeedbackPageResponses(feedbackId, data.page, siteId));
                    });

                    result.updated = true;
                    result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                        component: this.componentTranslate,
                        name: feedback.name,
                        error: this.translate.instant('addon.mod_feedback.this_feedback_is_already_submitted')
                    }));

                    return Promise.all(promises);
                }

                return this.feedbackProvider.getCurrentCompletedTimeModified(feedbackId, true, siteId).then((timemodified) => {
                    // Sort by page.
                    responses.sort((a, b) => {
                        return a.page - b.page;
                    });

                    responses = responses.map((data) => {
                        return {
                            func: this.processPage.bind(this),
                            params: [feedback, data, siteId, timemodified, result],
                            blocking: true
                        };
                    });

                    // Execute all the processes in order to solve dependencies.
                    return this.utils.executeOrderedPromises(responses);
                });
            });
        }).then(() => {
            if (result.updated) {
                // Data has been sent to server, update data.
                return this.courseProvider.getModuleBasicInfoByInstance(feedbackId, 'feedback', siteId).then((module) => {
                    return this.prefetchAfterUpdate(module, courseId, undefined, siteId);
                }).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(syncId, siteId);
        }).then(() => {
            return result;
        });

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Convenience function to sync process page calls.
     *
     * @param  {any}          feedback     Feedback object.
     * @param  {any}          data         Response data.
     * @param  {string}       siteId       Site Id.
     * @param  {number}       timemodified Current completed modification time.
     * @param  {any}          result       Result object to be modified.
     * @return {Promise<any>}              Resolve when done or rejected with error.
     */
    protected processPage(feedback: any, data: any, siteId: string, timemodified: number, result: any): Promise<any> {
        // Delete all pages that are submitted before changing website.
        if (timemodified > data.timemodified) {
            return this.feedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId);
        }

        return this.feedbackProvider.processPageOnline(feedback.id, data.page, data.responses, false, siteId).then(() => {
            result.updated = true;

            return this.feedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId);
        }).catch((error) => {
            if (error && error.wserror) {
                // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                result.updated = true;

                return this.feedbackOffline.deleteFeedbackPageResponses(feedback.id, data.page, siteId).then(() => {
                    // Responses deleted, add a warning.
                    result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                        component: this.componentTranslate,
                        name: feedback.name,
                        error: this.textUtils.getErrorMessageFromError(error)
                    }));
                });
            } else {
                // Couldn't connect to server, reject.
                return Promise.reject(error);
            }
        });
    }
}
