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

import { Component, Optional, Injector } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { AddonModSurveyProvider } from '../../providers/survey';
import { AddonModSurveyHelperProvider } from '../../providers/helper';
import { AddonModSurveyOfflineProvider } from '../../providers/offline';
import { AddonModSurveySyncProvider } from '../../providers/sync';

/**
 * Component that displays a survey.
 */
@Component({
    selector: 'addon-mod-survey-index',
    templateUrl: 'addon-mod-survey-index.html',
})
export class AddonModSurveyIndexComponent extends CoreCourseModuleMainActivityComponent {
    component = AddonModSurveyProvider.COMPONENT;
    moduleName = 'survey';

    survey: any;
    questions: any;
    answers = {};

    protected userId: number;
    protected syncEventName = AddonModSurveySyncProvider.AUTO_SYNCED;

    constructor(injector: Injector, private surveyProvider: AddonModSurveyProvider, @Optional() content: Content,
            private surveyHelper: AddonModSurveyHelperProvider, private surveyOffline: AddonModSurveyOfflineProvider,
            private surveySync: AddonModSurveySyncProvider) {
        super(injector, content);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.userId = this.sitesProvider.getCurrentSiteUserId();

        this.loadContent(false, true).then(() => {
            this.surveyProvider.logView(this.survey.id, this.survey.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.surveyProvider.invalidateSurveyData(this.courseId));
        if (this.survey) {
            promises.push(this.surveyProvider.invalidateQuestions(this.survey.id));
        }

        return Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param {any} syncEventData Data receiven on sync observer.
     * @return {boolean}          True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        if (this.survey && syncEventData.surveyId == this.survey.id && syncEventData.userId == this.userId) {
            return true;
        }

        return false;
    }

    /**
     * Download survey contents.
     *
     * @param  {boolean}      [refresh=false]    If it's refreshing content.
     * @param  {boolean}      [sync=false]       If it should try to sync.
     * @param  {boolean}      [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        return this.surveyProvider.getSurvey(this.courseId, this.module.id).then((survey) => {
            this.survey = survey;

            this.description = survey.intro || survey.description;
            this.dataRetrieved.emit(survey);

            if (sync) {
                // Try to synchronize the survey.
                return this.syncActivity(showErrors).then((answersSent) => {
                    if (answersSent) {
                        // Answers were sent, update the survey.
                        return this.surveyProvider.getSurvey(this.courseId, this.module.id).then((survey) => {
                            this.survey = survey;
                        });
                    }
                });
            }
        }).then(() => {
            // Check if there are answers stored in offline.
            return this.surveyOffline.hasAnswers(this.survey.id);
        }).then((hasOffline) => {
            this.hasOffline = this.survey.surveydone ? false : hasOffline;

            if (!this.survey.surveydone && !this.hasOffline) {
                return this.fetchQuestions();
            }
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Convenience function to get survey questions.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchQuestions(): Promise<any> {
        return this.surveyProvider.getQuestions(this.survey.id).then((questions) => {
            this.questions = this.surveyHelper.formatQuestions(questions);

            // Init answers object.
            this.questions.forEach((q) => {
                if (q.name) {
                    const isTextArea = q.multi && q.multi.length === 0 && q.type === 0;
                    this.answers[q.name] = q.required ? -1 : (isTextArea ? '' : '0');
                }

                if (q.multi && !q.multi.length && q.parent === 0 && q.type > 0) {
                    // Options shown in a select. Remove all HTML.
                    q.options = q.options.map((option) => {
                        return this.textUtils.cleanTags(option);
                    });
                }
            });
        });
    }

    /**
     * Check if answers are valid to be submitted.
     *
     * @return {boolean}  If answers are valid
     */
    isValidResponse(): boolean {
        for (const x in this.answers) {
            if (this.answers[x] === -1) {
                return false;
            }
        }

        return true;
    }

    /**
     * Save options selected.
     */
    submit(): void {
        this.domUtils.showConfirm(this.translate.instant('core.areyousure')).then(() => {
            const answers = [],
                modal = this.domUtils.showModalLoading('core.sending', true);

            for (const x in this.answers) {
                answers.push({
                    key: x,
                    value: this.answers[x]
                });
            }

            return this.surveyProvider.submitAnswers(this.survey.id, this.survey.name, this.courseId, answers).then((online) => {
                if (online && this.isPrefetched()) {
                    // The survey is downloaded, update the data.
                    return this.surveySync.prefetchAfterUpdate(this.module, this.courseId).then(() => {
                        // Update the view.
                        this.showLoadingAndFetch(false, false);
                    }).catch((error) => {
                        // Prefetch failed, refresh the data.
                        return this.showLoadingAndRefresh(false);
                    });
                } else {
                    // Not downloaded, refresh the data.
                    return this.showLoadingAndRefresh(false);
                }
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.mod_survey.cannotsubmitsurvey', true);
        });
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.surveySync.syncSurvey(this.survey.id, this.userId);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param  {any}     result Data returned on the sync function.
     * @return {boolean}        If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return result.answersSent;
    }
}
