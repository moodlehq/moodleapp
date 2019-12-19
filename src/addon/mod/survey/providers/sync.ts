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
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { AddonModSurveyOfflineProvider } from './offline';
import { AddonModSurveyProvider } from './survey';
import { CoreEventsProvider } from '@providers/events';
import { TranslateService } from '@ngx-translate/core';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreCourseActivitySyncBaseProvider } from '@core/course/classes/activity-sync';
import { CoreSyncProvider } from '@providers/sync';
import { AddonModSurveyPrefetchHandler } from './prefetch-handler';

/**
 * Service to sync surveys.
 */
@Injectable()
export class AddonModSurveySyncProvider extends CoreCourseActivitySyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_survey_autom_synced';
    protected componentTranslate: string;

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider, translate: TranslateService,
            private courseProvider: CoreCourseProvider, private surveyOffline: AddonModSurveyOfflineProvider,
            private eventsProvider: CoreEventsProvider,  private surveyProvider: AddonModSurveyProvider,
            private utils: CoreUtilsProvider, timeUtils: CoreTimeUtilsProvider, private logHelper: CoreCourseLogHelperProvider,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModSurveyPrefetchHandler) {

        super('AddonModSurveySyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils, prefetchDelegate, prefetchHandler);

        this.componentTranslate = courseProvider.translateModuleName('survey');
    }

    /**
     * Get the ID of a survey sync.
     *
     * @param surveyId Survey ID.
     * @param userId User the answers belong to.
     * @return Sync ID.
     * @protected
     */
    getSyncId(surveyId: number, userId: number): string {
        return surveyId + '#' + userId;
    }

    /**
     * Try to synchronize all the surveys in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllSurveys(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all surveys', this.syncAllSurveysFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all pending surveys on a site.
     *
     * @param siteId Site ID to sync.
     * @param force Wether to force sync not depending on last execution.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllSurveysFunc(siteId: string, force?: boolean): Promise<any> {
        // Get all survey answers pending to be sent in the site.
        return this.surveyOffline.getAllData(siteId).then((entries) => {
            // Sync all surveys.
            const promises = entries.map((entry) => {
                const promise = force ? this.syncSurvey(entry.surveyid, entry.userid, siteId) :
                    this.syncSurveyIfNeeded(entry.surveyid, entry.userid, siteId);

                return promise.then((result) => {
                    if (result && result.answersSent) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModSurveySyncProvider.AUTO_SYNCED, {
                            surveyId: entry.surveyid,
                            userId: entry.userid,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(promises);
        });
    }

    /**
     * Sync a survey only if a certain time has passed since the last time.
     *
     * @param surveyId Survey ID.
     * @param userId User the answers belong to.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the survey is synced or if it doesn't need to be synced.
     */
    syncSurveyIfNeeded(surveyId: number, userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getSyncId(surveyId, userId);

        return this.isSyncNeeded(syncId, siteId).then((needed) => {
            if (needed) {
                return this.syncSurvey(surveyId, userId, siteId);
            }
        });
    }

    /**
     * Synchronize a survey.
     *
     * @param surveyId Survey ID.
     * @param userId User the answers belong to. If not defined, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    syncSurvey(surveyId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();
            siteId = site.getId();

            const syncId = this.getSyncId(surveyId, userId);
            if (this.isSyncing(syncId, siteId)) {
                // There's already a sync ongoing for this survey and user, return the promise.
                return this.getOngoingSync(syncId, siteId);
            }

            this.logger.debug(`Try to sync survey '${surveyId}' for user '${userId}'`);

            let courseId;
            const result = {
                warnings: [],
                answersSent: false
            };

            // Sync offline logs.
            const syncPromise = this.logHelper.syncIfNeeded(AddonModSurveyProvider.COMPONENT, surveyId, siteId).catch(() => {
                // Ignore errors.
            }).then(() => {
                // Get answers to be sent.
                return this.surveyOffline.getSurveyData(surveyId, siteId, userId).catch(() => {
                    // No offline data found, return empty object.
                    return {};
                });
            }).then((data) => {
                if (!data.answers || !data.answers.length) {
                    // Nothing to sync.
                    return;
                }

                if (!this.appProvider.isOnline()) {
                    // Cannot sync in offline.
                    return Promise.reject(null);
                }

                courseId = data.courseid;

                // Send the answers.
                return this.surveyProvider.submitAnswersOnline(surveyId, data.answers, siteId).then(() => {
                    result.answersSent = true;

                    // Answers sent, delete them.
                    return this.surveyOffline.deleteSurveyAnswers(surveyId, siteId, userId);
                }).catch((error) => {
                    if (this.utils.isWebServiceError(error)) {

                        // The WebService has thrown an error, this means that answers cannot be submitted. Delete them.
                        result.answersSent = true;

                        return this.surveyOffline.deleteSurveyAnswers(surveyId, siteId, userId).then(() => {
                            // Answers deleted, add a warning.
                            result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.componentTranslate,
                                name: data.name,
                                error: this.textUtils.getErrorMessageFromError(error)
                            }));
                        });
                    }

                    // Couldn't connect to server, reject.
                    return Promise.reject(error);
                });
            }).then(() => {
                if (courseId) {
                    return this.surveyProvider.invalidateSurveyData(courseId, siteId).then(() => {
                        // Data has been sent to server, update survey data.
                        return this.courseProvider.getModuleBasicInfoByInstance(surveyId, 'survey', siteId).then((module) => {
                            return this.prefetchAfterUpdate(module, courseId, undefined, siteId);
                        });
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
        });
    }

}
