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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CoreCourse } from '@features/course/services/course';
import { CoreGradesHelper, CoreGradesMenuItem } from '@features/grades/services/grades-helper';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CanLeave } from '@guards/can-leave';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreText } from '@singletons/text';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';
import {
    AddonModWorkshop,
    AddonModWorkshopAssessmentSavedChangedEventData,
    AddonModWorkshopData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
    AddonModWorkshopSubmissionData,
} from '../../services/workshop';
import { AddonModWorkshopHelper, AddonModWorkshopSubmissionAssessmentWithFormData } from '../../services/workshop-helper';
import { AddonModWorkshopOffline } from '../../services/workshop-offline';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_WORKSHOP_ASSESSMENT_INVALIDATED,
    ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED,
    ADDON_MOD_WORKSHOP_AUTO_SYNCED,
    ADDON_MOD_WORKSHOP_COMPONENT,
    AddonModWorkshopPhase,
} from '@addons/mod/workshop/constants';
import { CoreLoadings } from '@services/loadings';

/**
 * Page that displays a workshop assessment.
 */
@Component({
    selector: 'page-addon-mod-workshop-assessment-page',
    templateUrl: 'assessment.html',
})
export class AddonModWorkshopAssessmentPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild('evaluateFormEl') formElement!: ElementRef;

    assessment!: AddonModWorkshopSubmissionAssessmentWithFormData;
    submission!: AddonModWorkshopSubmissionData;
    profile?: CoreUserProfile;
    courseId!: number;
    access?: AddonModWorkshopGetWorkshopAccessInformationWSResponse;
    assessmentId!: number;
    evaluating = false;
    loaded = false;
    showGrade: (grade?: string | number) => boolean;
    evaluateForm: FormGroup;
    maxGrade?: number;
    workshop?: AddonModWorkshopData;
    strategy?: string;
    title = '';
    evaluate: AddonModWorkshopAssessmentEvaluation = {
        text: '',
        grade: -1,
        weight: 1,
    };

    weights: number[] = [];
    evaluateByProfile?: CoreUserProfile;
    evaluationGrades: CoreGradesMenuItem[] = [];
    gradingGrade?: string | number;

    protected workshopId!: number;
    protected originalEvaluation: AddonModWorkshopAssessmentEvaluation = {
        text: '',
        grade: -1,
        weight: 1,
    };

    protected hasOffline = false;
    protected syncObserver: CoreEventObserver;
    protected isDestroyed = false;
    protected siteId: string;
    protected currentUserId: number;
    protected forceLeave = false;
    protected logView: () => void;

    constructor(
        protected fb: FormBuilder,
    ) {
        this.siteId = CoreSites.getCurrentSiteId();
        this.currentUserId = CoreSites.getCurrentSiteUserId();

        this.showGrade = AddonModWorkshopHelper.showGrade;

        this.evaluateForm = new FormGroup({});
        this.evaluateForm.addControl('weight', this.fb.control('', Validators.required));
        this.evaluateForm.addControl('grade', this.fb.control(''));
        this.evaluateForm.addControl('text', this.fb.control(''));

        // Refresh workshop on sync.
        this.syncObserver = CoreEvents.on(ADDON_MOD_WORKSHOP_AUTO_SYNCED, (data) => {
            // Update just when all database is synced.
            if (this.workshopId === data.workshopId) {
                this.loaded = false;
                this.refreshAllData();
            }
        }, this.siteId);

        this.logView = CoreTime.once(async () => {
            if (!this.workshop) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_workshop_get_assessment',
                name: this.workshop.name,
                data: { id: this.workshop.id, assessmentid: this.assessment.id, category: 'workshop' },
                url: `/mod/workshop/assessment.php?asid=${this.assessment.id}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.assessment = CoreNavigator.getRequiredRouteParam<AddonModWorkshopSubmissionAssessmentWithFormData>('assessment');
            this.submission = CoreNavigator.getRequiredRouteParam<AddonModWorkshopSubmissionData>('submission');
            this.profile = CoreNavigator.getRouteParam<CoreUserProfile>('profile');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.assessmentId = this.assessment.id;
        this.workshopId = this.submission.workshopid;

        this.fetchAssessmentData();
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave || !this.evaluating) {
            return true;
        }

        if (!this.hasEvaluationChanged()) {
            return true;
        }

        // Show confirmation if some data has been modified.
        await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));

        CoreForms.triggerFormCancelledEvent(this.formElement, this.siteId);

        return true;
    }

    /**
     * Fetch the assessment data.
     *
     * @returns Resolved when done.
     */
    protected async fetchAssessmentData(): Promise<void> {
        try {
            this.workshop = await AddonModWorkshop.getWorkshopById(this.courseId, this.workshopId);
            this.title = this.workshop.name;
            this.strategy = this.workshop.strategy;

            const gradeInfo = await CoreCourse.getModuleBasicGradeInfo(this.workshop.coursemodule);
            this.maxGrade = gradeInfo?.grade;

            this.access = await AddonModWorkshop.getWorkshopAccessInformation(
                this.workshopId,
                { cmId: this.workshop.coursemodule },
            );

            // Load Weights selector.
            if (this.assessmentId && (this.access.canallocate || this.access.canoverridegrades)) {
                if (!this.isDestroyed) {
                    // Block the workshop.
                    CoreSync.blockOperation(ADDON_MOD_WORKSHOP_COMPONENT, this.workshopId);
                }

                this.evaluating = true;
            } else {
                this.evaluating = false;
            }

            if (!this.evaluating && this.workshop.phase != AddonModWorkshopPhase.PHASE_CLOSED) {
                return;
            }

            // Get all info of the assessment.
            const assessment = await AddonModWorkshopHelper.getReviewerAssessmentById(this.workshopId, this.assessmentId, {
                userId: this.profile?.id,
                cmId: this.workshop.coursemodule,
            });

            this.assessment = AddonModWorkshopHelper.realGradeValue(this.workshop, assessment);
            this.evaluate.text = this.assessment.feedbackreviewer || '';
            this.evaluate.weight = this.assessment.weight;
            this.gradingGrade = this.assessment.gradinggrade ?? '-';

            if (this.evaluating) {
                if (this.access.canallocate) {
                    this.weights = [];
                    for (let i = 16; i >= 0; i--) {
                        this.weights[i] = i;
                    }
                }

                if (this.access.canoverridegrades) {
                    const defaultGrade = Translate.instant('addon.mod_workshop.notoverridden');
                    this.evaluationGrades =
                        await CoreGradesHelper.makeGradesMenu(this.workshop.gradinggrade, undefined, defaultGrade, -1);
                }

                try {
                    const offlineAssess = await AddonModWorkshopOffline.getEvaluateAssessment(this.workshopId, this.assessmentId);
                    this.hasOffline = true;
                    this.evaluate.weight = offlineAssess.weight;
                    if (this.access.canoverridegrades) {
                        this.evaluate.text = offlineAssess.feedbacktext || '';
                        this.evaluate.grade = parseInt(offlineAssess.gradinggradeover, 10) || -1;
                    }
                } catch {
                    this.hasOffline = false;
                    // No offline, load online.
                    if (this.access.canoverridegrades) {
                        this.evaluate.text = this.assessment.feedbackreviewer || '';
                        this.evaluate.grade = parseInt(String(this.assessment.gradinggradeover), 10) || -1;
                    }
                } finally {
                    this.originalEvaluation.weight = this.evaluate.weight;
                    if (this.access.canoverridegrades) {
                        this.originalEvaluation.text = this.evaluate.text;
                        this.originalEvaluation.grade = this.evaluate.grade;
                    }

                    this.evaluateForm.controls['weight'].setValue(this.evaluate.weight);
                    if (this.access.canoverridegrades) {
                        this.evaluateForm.controls['grade'].setValue(this.evaluate.grade);
                        this.evaluateForm.controls['text'].setValue(this.evaluate.text);
                    }
                }

            } else if (this.workshop.phase == AddonModWorkshopPhase.PHASE_CLOSED && this.assessment.gradinggradeoverby) {
                this.evaluateByProfile = await CoreUser.getProfile(this.assessment.gradinggradeoverby, this.courseId, true);
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Force leaving the page, without checking for changes.
     */
    protected forceLeavePage(): void {
        this.forceLeave = true;
        CoreNavigator.back();
    }

    /**
     * Check if data has changed.
     *
     * @returns True if changed, false otherwise.
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
     * @returns Resolved when done.
     */
    protected async refreshAllData(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModWorkshop.invalidateWorkshopData(this.courseId));
        promises.push(AddonModWorkshop.invalidateWorkshopAccessInformationData(this.workshopId));
        promises.push(AddonModWorkshop.invalidateReviewerAssesmentsData(this.workshopId));

        if (this.assessmentId) {
            promises.push(AddonModWorkshop.invalidateAssessmentFormData(this.workshopId, this.assessmentId));
            promises.push(AddonModWorkshop.invalidateAssessmentData(this.workshopId, this.assessmentId));
        }

        try {
            await Promise.all(promises);
        } finally {
            CoreEvents.trigger(ADDON_MOD_WORKSHOP_ASSESSMENT_INVALIDATED, null, this.siteId);

            await this.fetchAssessmentData();
        }
    }

    /**
     * Pull to refresh.
     *
     * @param refresher Refresher.
     */
    refreshAssessment(refresher: HTMLIonRefresherElement): void {
        if (this.loaded) {
            this.refreshAllData().finally(() => {
                refresher?.complete();
            });
        }
    }

    /**
     * Save the assessment evaluation.
     */
    async saveEvaluation(): Promise<void> {
        // Check if data has changed.
        if (this.hasEvaluationChanged()) {
            await this.sendEvaluation();
        }

        // Go back.
        this.forceLeavePage();
    }

    /**
     * Sends the evaluation to be saved on the server.
     *
     * @returns Resolved when done.
     */
    protected async sendEvaluation(): Promise<void> {
        const modal = await CoreLoadings.show('core.sending', true);
        const inputData: AddonModWorkshopAssessmentEvaluation = this.evaluateForm.value;

        const grade = inputData.grade >= 0 ? String(inputData.grade) : '';
        // Add some HTML to the message if needed.
        const text = CoreText.formatHtmlLines(inputData.text);

        try {
            // Try to send it to server.
            const result = await AddonModWorkshop.evaluateAssessment(
                this.workshopId,
                this.assessmentId,
                this.courseId,
                text,
                inputData.weight,
                grade,
            );

            CoreForms.triggerFormSubmittedEvent(this.formElement, !!result, this.siteId);

            const data: AddonModWorkshopAssessmentSavedChangedEventData = {
                workshopId: this.workshopId,
                assessmentId: this.assessmentId,
                userId: this.currentUserId,
            };

            return AddonModWorkshop.invalidateAssessmentData(this.workshopId, this.assessmentId).finally(() => {
                CoreEvents.trigger(ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED, data, this.siteId);
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Cannot save assessment evaluation');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        this.syncObserver?.off();
        // Restore original back functions.
        CoreSync.unblockOperation(ADDON_MOD_WORKSHOP_COMPONENT, this.workshopId);
    }

}

type AddonModWorkshopAssessmentEvaluation = {
    text: string;
    grade: number;
    weight: number;
};
