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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicPage, NavParams, NavController } from 'ionic-angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { AddonModWorkshopProvider } from '../../providers/workshop';
import { AddonModWorkshopHelperProvider } from '../../providers/helper';
import { AddonModWorkshopOfflineProvider } from '../../providers/offline';
import { AddonModWorkshopSyncProvider } from '../../providers/sync';

/**
 * Page that displays a workshop assessment.
 */
@IonicPage({ segment: 'addon-mod-workshop-assessment' })
@Component({
    selector: 'page-addon-mod-workshop-assessment-page',
    templateUrl: 'assessment.html',
})
export class AddonModWorkshopAssessmentPage implements OnInit, OnDestroy {

    assessment: any;
    submission: any;
    profile: any;
    courseId: number;
    access: any;
    assessmentId: number;
    evaluating = false;
    loaded = false;
    showGrade: any;
    evaluateForm: FormGroup;
    maxGrade: number;
    workshop: any;
    strategy: any;
    title: string;
    evaluate = {
        text: '',
        grade: -1,
        weight: 1
    };
    weights = [];
    evaluateByProfile: any;
    evaluationGrades: any;

    protected workshopId: number;
    protected originalEvaluation: any = {};
    protected hasOffline = false;
    protected syncObserver: any;
    protected isDestroyed = false;
    protected siteId: string;
    protected currentUserId: number;
    protected forceLeave = false;

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider, protected courseProvider: CoreCourseProvider,
            protected workshopProvider: AddonModWorkshopProvider, protected workshopOffline: AddonModWorkshopOfflineProvider,
            protected workshopHelper: AddonModWorkshopHelperProvider, protected navCtrl: NavController,
            protected syncProvider: CoreSyncProvider, protected textUtils: CoreTextUtilsProvider, protected fb: FormBuilder,
            protected translate: TranslateService, protected eventsProvider: CoreEventsProvider,
            protected domUtils: CoreDomUtilsProvider, protected gradesHelper: CoreGradesHelperProvider,
            protected userProvider: CoreUserProvider) {

        this.assessment = navParams.get('assessment');
        this.submission = navParams.get('submission') || {};
        this.profile = navParams.get('profile');
        this.courseId = navParams.get('courseId');

        this.assessmentId = this.assessment.assessmentid || this.assessment.id;
        this.workshopId = this.submission.workshopid || null;
        this.siteId = sitesProvider.getCurrentSiteId();
        this.currentUserId = sitesProvider.getCurrentSiteUserId();

        this.showGrade = this.workshopHelper.showGrade;

        this.evaluateForm = new FormGroup({});
        this.evaluateForm.addControl('weight', this.fb.control('', Validators.required));
        this.evaluateForm.addControl('grade', this.fb.control(''));
        this.evaluateForm.addControl('text', this.fb.control(''));

        // Refresh workshop on sync.
        this.syncObserver = this.eventsProvider.on(AddonModWorkshopSyncProvider.AUTO_SYNCED, (data) => {
            // Update just when all database is synced.
            if (this.workshopId === data.workshopId) {
                this.loaded = false;
                this.refreshAllData();
            }
        }, this.siteId);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchAssessmentData();
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave || !this.evaluating) {
            return true;
        }

        if (!this.hasEvaluationChanged()) {
            return Promise.resolve();
        }

        // Show confirmation if some data has been modified.
        return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
    }

    /**
     * Fetch the assessment data.
     *
     * @return Resolved when done.
     */
    protected fetchAssessmentData(): Promise<void> {
        return this.workshopProvider.getWorkshopById(this.courseId, this.workshopId).then((workshopData) => {
            this.workshop = workshopData;
            this.title = this.workshop.name;
            this.strategy = this.workshop.strategy;

            return this.courseProvider.getModuleBasicGradeInfo(workshopData.coursemodule);
        }).then((gradeInfo) => {
            this.maxGrade = gradeInfo.grade;

            return this.workshopProvider.getWorkshopAccessInformation(this.workshopId);
        }).then((accessData) => {
            this.access = accessData;

            // Load Weights selector.
            if (this.assessmentId && (accessData.canallocate || accessData.canoverridegrades)) {
                if (!this.isDestroyed) {
                    // Block the workshop.
                    this.syncProvider.blockOperation(AddonModWorkshopProvider.COMPONENT, this.workshopId);
                }

                this.evaluating = true;
            } else {
                this.evaluating = false;
            }

            if (this.evaluating || this.workshop.phase == AddonModWorkshopProvider.PHASE_CLOSED) {
                // Get all info of the assessment.
                return this.workshopHelper.getReviewerAssessmentById(this.workshopId, this.assessmentId,
                        this.profile && this.profile.id).then((assessment) => {
                    let defaultGrade, promise;

                    this.assessment = this.workshopHelper.realGradeValue(this.workshop, assessment);
                    this.evaluate.text = this.assessment.feedbackreviewer || '';
                    this.evaluate.weight = this.assessment.weight;

                    if (this.evaluating) {
                        if (accessData.canallocate) {
                            this.weights = [];
                            for (let i = 16; i >= 0; i--) {
                                this.weights[i] = i;
                            }
                        }

                        if (accessData.canoverridegrades) {
                            defaultGrade = this.translate.instant('addon.mod_workshop.notoverridden');
                            promise = this.gradesHelper.makeGradesMenu(this.workshop.gradinggrade, undefined, defaultGrade, -1)
                                    .then((grades) => {
                                this.evaluationGrades = grades;
                            });
                        } else {
                            promise = Promise.resolve();
                        }

                        return promise.then(() => {
                            return this.workshopOffline.getEvaluateAssessment(this.workshopId, this.assessmentId)
                                    .then((offlineAssess) => {
                                this.hasOffline = true;
                                this.evaluate.weight = offlineAssess.weight;
                                if (accessData.canoverridegrades) {
                                    this.evaluate.text = offlineAssess.feedbacktext || '';
                                    this.evaluate.grade = offlineAssess.gradinggradeover || -1;
                                }
                            }).catch(() => {
                                this.hasOffline = false;
                                // No offline, load online.
                                if (accessData.canoverridegrades) {
                                    this.evaluate.text = this.assessment.feedbackreviewer || '';
                                    this.evaluate.grade = this.assessment.gradinggradeover || -1;
                                }
                            });
                        }).finally(() => {
                            this.originalEvaluation.weight = this.evaluate.weight;
                            if (accessData.canoverridegrades) {
                                this.originalEvaluation.text = this.evaluate.text;
                                this.originalEvaluation.grade = this.evaluate.grade;
                            }

                            this.evaluateForm.controls['weight'].setValue(this.evaluate.weight);
                            if (accessData.canoverridegrades) {
                                this.evaluateForm.controls['grade'].setValue(this.evaluate.grade);
                                this.evaluateForm.controls['text'].setValue(this.evaluate.text);
                            }
                        });

                    } else if (this.workshop.phase == AddonModWorkshopProvider.PHASE_CLOSED && this.assessment.gradinggradeoverby) {
                        return this.userProvider.getProfile(this.assessment.gradinggradeoverby, this.courseId, true)
                                .then((profile) => {
                            this.evaluateByProfile = profile;
                        });
                    }
                });
            }
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Force leaving the page, without checking for changes.
     */
    protected forceLeavePage(): void {
        this.forceLeave = true;
        this.navCtrl.pop();
    }

    /**
     * Check if data has changed.
     *
     * @return True if changed, false otherwise.
     */
    protected hasEvaluationChanged(): boolean {
        if (!this.loaded || !this.evaluating) {
            return false;
        }

        const inputData = this.evaluateForm.value;

        if (this.originalEvaluation.weight != inputData.weight) {
            return true;
        }

        if (this.access && this.access.canoverridegrades) {
            if (this.originalEvaluation.text != inputData.text) {
                return true;
            }

            if (this.originalEvaluation.grade != inputData.grade) {
                return true;
            }
        }

        return false;
    }

    /**
     * Convenience function to refresh all the data.
     *
     * @return Resolved when done.
     */
    protected refreshAllData(): Promise<any> {
        const promises = [];

        promises.push(this.workshopProvider.invalidateWorkshopData(this.courseId));
        promises.push(this.workshopProvider.invalidateWorkshopAccessInformationData(this.workshopId));
        promises.push(this.workshopProvider.invalidateReviewerAssesmentsData(this.workshopId));

        if (this.assessmentId) {
            promises.push(this.workshopProvider.invalidateAssessmentFormData(this.workshopId, this.assessmentId));
            promises.push(this.workshopProvider.invalidateAssessmentData(this.workshopId, this.assessmentId));
        }

        return Promise.all(promises).finally(() => {
            this.eventsProvider.trigger(AddonModWorkshopProvider.ASSESSMENT_INVALIDATED, this.siteId);

            return this.fetchAssessmentData();
        });
    }

    /**
     * Pull to refresh.
     *
     * @param refresher Refresher.
     */
    refreshAssessment(refresher: any): void {
        if (this.loaded) {
            this.refreshAllData().finally(() => {
                refresher.complete();
            });
        }
    }

    /**
     * Save the assessment evaluation.
     */
    saveEvaluation(): void {
        // Check if data has changed.
        if (this.hasEvaluationChanged()) {
            this.sendEvaluation().then(() => {
                this.forceLeavePage();
            });
        } else {
            // Nothing to save, just go back.
            this.forceLeavePage();
        }
    }

    /**
     * Sends the evaluation to be saved on the server.
     *
     * @return Resolved when done.
     */
    protected sendEvaluation(): Promise<any> {
        const modal = this.domUtils.showModalLoading('core.sending', true),
            inputData = this.evaluateForm.value;

        inputData.grade = inputData.grade >= 0 ? inputData.grade : '';
        // Add some HTML to the message if needed.
        inputData.text = this.textUtils.formatHtmlLines(inputData.text);

        // Try to send it to server.
        return this.workshopProvider.evaluateAssessment(this.workshopId, this.assessmentId, this.courseId, inputData.text,
                inputData.weight, inputData.grade).then(() => {
            const data = {
                workshopId: this.workshopId,
                assessmentId: this.assessmentId,
                userId: this.currentUserId
            };

            return this.workshopProvider.invalidateAssessmentData(this.workshopId, this.assessmentId).finally(() => {
                this.eventsProvider.trigger(AddonModWorkshopProvider.ASSESSMENT_SAVED, data, this.siteId);
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Cannot save assessment evaluation');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        this.syncObserver && this.syncObserver.off();
        // Restore original back functions.
        this.syncProvider.unblockOperation(AddonModWorkshopProvider.COMPONENT, this.workshopId);
    }
}
