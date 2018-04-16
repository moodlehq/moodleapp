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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModSurveyOfflineProvider } from './offline';
import { AddonModSurveyProvider } from './survey';
import { CoreEventsProvider } from '@providers/events';
import { TranslateService } from '@ngx-translate/core';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreSyncProvider } from '@providers/sync';

/**
 * Service to sync surveys.
 */
@Injectable()
export class AddonModSurveySyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_survey_autom_synced';
    protected componentTranslate: string;

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider, translate: TranslateService,
            courseProvider: CoreCourseProvider, private surveyOffline: AddonModSurveyOfflineProvider,
            private eventsProvider: CoreEventsProvider,  private surveyProvider: AddonModSurveyProvider,
            private utils: CoreUtilsProvider) {

        super('AddonModSurveySyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate);

        this.componentTranslate = courseProvider.translateModuleName('survey');
    }

    /**
     * Get the ID of a survey sync.
     *
     * @param  {number} surveyId Survey ID.
     * @param  {number} userId   User the answers belong to.
     * @return {string}          Sync ID.
     * @protected
     */
    getSyncId (surveyId: number, userId: number): string {
        return surveyId + '#' + userId;
    }

    /**
     * Try to synchronize all the surveys in a certain site or in all sites.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllSurveys(siteId?: string): Promise<any> {
        return this.syncOnSites('all surveys', this.syncAllSurveysFunc.bind(this), undefined, siteId);
    }

    /**
     * Sync all pending surveys on a site.
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {Promise<any>}     Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllSurveysFunc(siteId?: string): Promise<any> {
        // Get all survey answers pending to be sent in the site.
        return this.surveyOffline.getAllData(siteId).then((entries) => {
            // Sync all surveys.
            const promises = entries.map((entry) => {
                return this.syncSurveyIfNeeded(entry.surveyid, entry.userid, siteId).then((result) => {
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
     * @param  {number} surveyId Survey ID.
     * @param  {number} userId   User the answers belong to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the survey is synced or if it doesn't need to be synced.
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
     * @param  {number} surveyId Survey ID.
     * @param  {number} userId   User the answers belong to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected otherwise.
     */
    syncSurvey(surveyId: number, userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

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

        // Get answers to be sent.
        const syncPromise = this.surveyOffline.getSurveyData(surveyId, siteId, userId).catch(() => {
            // No offline data found, return empty object.
            return {};
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
                            error: error.error
                        }));
                    });
                }

                // Couldn't connect to server, reject.
                return Promise.reject(error && error.error);
            });
        }).then(() => {
            if (courseId) {
                // Data has been sent to server, update survey data.
                return this.surveyProvider.invalidateSurveyData(courseId, siteId).then(() => {
                    return this.surveyProvider.getSurveyById(courseId, surveyId, siteId);
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

}
