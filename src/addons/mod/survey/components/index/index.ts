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

import { Component, OnInit, Optional } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { getPrefetchHandlerInstance } from '../../services/handlers/prefetch';
import {
    AddonModSurveySurvey,
    AddonModSurvey,
    AddonModSurveySubmitAnswerData,
} from '../../services/survey';
import { AddonModSurveyHelper, AddonModSurveyQuestionFormatted } from '../../services/survey-helper';
import { AddonModSurveyOffline } from '../../services/survey-offline';
import {
    AddonModSurveyAutoSyncData,
    AddonModSurveySync,
    AddonModSurveySyncResult,
} from '../../services/survey-sync';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ADDON_MOD_SURVEY_AUTO_SYNCED, ADDON_MOD_SURVEY_COMPONENT } from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays a survey.
 */
@Component({
    selector: 'addon-mod-survey-index',
    templateUrl: 'addon-mod-survey-index.html',
    styleUrl: 'index.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModSurveyIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = ADDON_MOD_SURVEY_COMPONENT;
    pluginName = 'survey';

    survey?: AddonModSurveySurvey;
    questions: AddonModSurveyQuestionFormatted[] = [];
    answers: Record<string, string> = {};

    protected currentUserId?: number;
    protected syncEventName = ADDON_MOD_SURVEY_AUTO_SYNCED;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModSurveyIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.currentUserId = CoreSites.getCurrentSiteUserId();

        await this.loadContent(false, true);
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModSurvey.invalidateSurveyData(this.courseId));
        if (this.survey) {
            promises.push(AddonModSurvey.invalidateQuestions(this.survey.id));
        }

        await Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @returns True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModSurveyAutoSyncData): boolean {
        if (this.survey && syncEventData.surveyId == this.survey.id && syncEventData.userId == this.currentUserId) {
            return true;
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        this.survey = await AddonModSurvey.getSurvey(this.courseId, this.module.id);

        this.description = this.survey.intro;
        this.dataRetrieved.emit(this.survey);

        if (sync) {
            // Try to synchronize the survey.
            const updated = await this.syncActivity(showErrors);
            if (updated) {
                // Answers were sent, update the survey.
                this.survey = await AddonModSurvey.getSurvey(this.courseId, this.module.id);
            }
        }

        // Check if there are answers stored in offline.
        this.hasOffline = this.survey.surveydone
            ? false
            : await AddonModSurveyOffline.hasAnswers(this.survey.id);

        if (!this.survey.surveydone && !this.hasOffline) {
            await this.fetchQuestions(this.survey.id);
        }
    }

    /**
     * Convenience function to get survey questions.
     *
     * @param surveyId Survey Id.
     * @returns Promise resolved when done.
     */
    protected async fetchQuestions(surveyId: number): Promise<void> {
        const questions = await AddonModSurvey.getQuestions(surveyId, { cmId: this.module.id });

        this.questions = AddonModSurveyHelper.formatQuestions(questions);

        // Init answers object.
        this.questions.forEach((question) => {
            if (question.name) {
                const isTextArea = question.multiArray && question.multiArray.length === 0 && question.type === 0;
                this.answers[question.name] = question.required ? '-1' : (isTextArea ? '' : '0');
            }

            if (question.multiArray && !question.multiArray.length && question.parent === 0 && question.type > 0) {
                // Options shown in a select. Remove all HTML.
                question.optionsArray = question.optionsArray?.map((option) => CoreText.cleanTags(option));
            }
        });
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.survey) {
            return; // Shouldn't happen.
        }

        await CorePromiseUtils.ignoreErrors(AddonModSurvey.logView(this.survey.id));

        this.analyticsLogEvent('mod_survey_view_survey');
    }

    /**
     * Check if answers are valid to be submitted.
     *
     * @returns If answers are valid
     */
    isValidResponse(): boolean {
        return !this.questions.some((question) => question.required && question.name &&
            (question.type === 0 ? this.answers[question.name] == '' : parseInt(this.answers[question.name], 10) === -1));
    }

    /**
     * Save options selected.
     */
    async submit(): Promise<void> {
        if (!this.survey) {
            return;
        }

        let modal: CoreIonLoadingElement | undefined;

        try {
            await CoreAlerts.confirm(Translate.instant('core.areyousure'));

            const answers: AddonModSurveySubmitAnswerData[] = [];
            modal = await CoreLoadings.show('core.sending', true);

            for (const x in this.answers) {
                answers.push({
                    key: x,
                    value: this.answers[x],
                });
            }

            const online = await AddonModSurvey.submitAnswers(this.survey.id, this.survey.name, this.courseId, answers);

            CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: this.moduleName });

            if (online && this.isPrefetched()) {
                // The survey is downloaded, update the data.
                try {
                    const prefetched = await AddonModSurveySync.prefetchAfterUpdate(
                        getPrefetchHandlerInstance(),
                        this.module,
                        this.courseId,
                    );

                    // Update the view.
                    prefetched ?
                        this.showLoadingAndFetch(false, false) :
                        this.showLoadingAndRefresh(false);
                } catch {
                    // Prefetch failed, refresh the data.
                    this.showLoadingAndRefresh(false);
                }
            } else {
                // Not downloaded, refresh the data.
                this.showLoadingAndRefresh(false);
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_survey.cannotsubmitsurvey') });
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * @inheritdoc
     */
    protected async sync(): Promise<AddonModSurveySyncResult> {
        if (!this.survey) {
            throw new CoreError('Cannot sync without a survey.');
        }

        return AddonModSurveySync.syncSurvey(this.survey.id, this.currentUserId);
    }

}
