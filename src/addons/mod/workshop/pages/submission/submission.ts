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

import { Component, OnInit, OnDestroy, Optional, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Params } from '@angular/router';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreGradesHelper, CoreGradesMenuItem } from '@features/grades/services/grades-helper';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CanLeave } from '@guards/can-leave';
import { IonContent, IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';
import { AddonModWorkshopAssessmentStrategyComponent } from '../../components/assessment-strategy/assessment-strategy';
import {
    AddonModWorkshopProvider,
    AddonModWorkshop,
    AddonModWorkshopPhase,
    AddonModWorkshopSubmissionChangedEventData,
    AddonModWorkshopAction,
    AddonModWorkshopData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
    AddonModWorkshopAssessmentSavedChangedEventData,
} from '../../services/workshop';
import {
    AddonModWorkshopHelper,
    AddonModWorkshopSubmissionAssessmentWithFormData,
    AddonModWorkshopSubmissionDataWithOfflineData,
} from '../../services/workshop-helper';
import { AddonModWorkshopOffline } from '../../services/workshop-offline';
import { AddonModWorkshopSyncProvider, AddonModWorkshopAutoSyncData } from '../../services/workshop-sync';

/**
 * Page that displays a workshop submission.
 */
@Component({
    selector: 'page-addon-mod-workshop-submission-page',
    templateUrl: 'submission.html',
})
export class AddonModWorkshopSubmissionPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild(AddonModWorkshopAssessmentStrategyComponent) assessmentStrategy?: AddonModWorkshopAssessmentStrategyComponent;

    @ViewChild('feedbackFormEl') formElement?: ElementRef;

    module!: CoreCourseModule;
    workshop!: AddonModWorkshopData;
    access!: AddonModWorkshopGetWorkshopAccessInformationWSResponse;
    assessment?: AddonModWorkshopSubmissionAssessmentWithFormData;
    submissionInfo!: AddonModWorkshopSubmissionDataWithOfflineData;
    profile?: CoreUserProfile;
    courseId!: number;

    submission?: AddonModWorkshopSubmissionDataWithOfflineData;
    title?: string;
    loaded = false;
    ownAssessment?: AddonModWorkshopSubmissionAssessmentWithFormData;
    strategy?: string;
    assessmentId?: number;
    assessmentUserId?: number;
    evaluate?: AddonWorkshopSubmissionEvaluateData;
    canAddFeedback = false;
    canEdit = false;
    canDelete = false;
    evaluationGrades: CoreGradesMenuItem[] = [];
    evaluateGradingByProfile?: CoreUserProfile;
    evaluateByProfile?: CoreUserProfile;
    feedbackForm: FormGroup; // The form group.
    submissionId!: number;

    protected workshopId!: number;
    protected currentUserId: number;
    protected userId?: number;
    protected siteId: string;
    protected originalEvaluation: Omit<AddonWorkshopSubmissionEvaluateData, 'grade'> & { grade: number | string} = {
        published: false,
        text: '',
        grade: '',
    };

    protected hasOffline = false;
    protected component = AddonModWorkshopProvider.COMPONENT;
    protected forceLeave = false;
    protected obsAssessmentSaved: CoreEventObserver;
    protected syncObserver: CoreEventObserver;
    protected isDestroyed = false;

    constructor(
        protected fb: FormBuilder,
        @Optional() protected content: IonContent,
    ) {
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.siteId = CoreSites.getCurrentSiteId();

        this.feedbackForm = new FormGroup({});
        this.feedbackForm.addControl('published', this.fb.control(''));
        this.feedbackForm.addControl('grade', this.fb.control(''));
        this.feedbackForm.addControl('text', this.fb.control(''));

        this.obsAssessmentSaved = CoreEvents.on(AddonModWorkshopProvider.ASSESSMENT_SAVED, (data) => {
            this.eventReceived(data);
        }, this.siteId);

        // Refresh workshop on sync.
        this.syncObserver = CoreEvents.on(AddonModWorkshopSyncProvider.AUTO_SYNCED, (data) => {
            // Update just when all database is synced.
            this.eventReceived(data);
        }, this.siteId);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {

        this.submissionId = CoreNavigator.getRouteNumberParam('submissionId')!;
        this.module = CoreNavigator.getRouteParam<CoreCourseModule>('module')!;
        this.workshop = CoreNavigator.getRouteParam<AddonModWorkshopData>('workshop')!;
        this.access = CoreNavigator.getRouteParam<AddonModWorkshopGetWorkshopAccessInformationWSResponse>('access')!;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.profile = CoreNavigator.getRouteParam<CoreUserProfile>('profile');
        this.submissionInfo = CoreNavigator.getRouteParam<AddonModWorkshopSubmissionDataWithOfflineData>('submission')!;
        this.assessment = CoreNavigator.getRouteParam<AddonModWorkshopSubmissionAssessmentWithFormData>('assessment');

        this.title = this.module.name;
        this.workshopId = this.module.instance || this.workshop.id;

        this.userId = this.submissionInfo?.authorid;
        this.strategy = (this.assessment && this.assessment.strategy) || (this.workshop && this.workshop.strategy);
        this.assessmentId = this.assessment?.id;
        this.assessmentUserId = this.assessment?.reviewerid;

        await this.fetchSubmissionData();

        try {
            await AddonModWorkshop.logViewSubmission(this.submissionId, this.workshopId, this.workshop.name);
            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        const assessmentHasChanged = this.assessmentStrategy?.hasDataChanged();
        if (this.forceLeave || (!this.hasEvaluationChanged() && !assessmentHasChanged)) {
            return true;
        }

        // Show confirmation if some data has been modified.
        await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));

        CoreForms.triggerFormCancelledEvent(this.formElement, this.siteId);

        return true;
    }

    /**
     * Goto edit submission page.
     */
    editSubmission(): void {
        const params: Params = {
            module: module,
            access: this.access,
        };

        CoreNavigator.navigate(String(this.submissionId) + '/edit', params);
    }

    /**
     * Function called when we receive an event of submission changes.
     *
     * @param data Event data received.
     */
    protected eventReceived(data: AddonModWorkshopAutoSyncData |
    AddonModWorkshopAssessmentSavedChangedEventData): void {
        if (this.workshopId === data.workshopId) {
            this.content?.scrollToTop();

            this.loaded = false;
            this.refreshAllData();
        }
    }

    /**
     * Fetch the submission data.
     *
     * @return Resolved when done.
     */
    protected async fetchSubmissionData(): Promise<void> {
        try {
            this.submission = await AddonModWorkshopHelper.getSubmissionById(this.workshopId, this.submissionId, {
                cmId: this.module.id,
            });

            const promises: Promise<void>[] = [];

            this.submission.grade = this.submissionInfo?.grade;
            this.submission.gradinggrade = this.submissionInfo?.gradinggrade;
            this.submission.gradeover = this.submissionInfo?.gradeover;
            this.userId = this.submission.authorid || this.userId;
            this.canEdit = this.currentUserId == this.userId && this.access.cansubmit && this.access.modifyingsubmissionallowed;
            this.canDelete = this.access.candeletesubmissions;

            this.canAddFeedback = !this.assessmentId && this.workshop.phase > AddonModWorkshopPhase.PHASE_ASSESSMENT &&
                this.workshop.phase < AddonModWorkshopPhase.PHASE_CLOSED && this.access.canoverridegrades;
            this.ownAssessment = undefined;

            if (this.access.canviewallassessments) {
                // Get new data, different that came from stateParams.
                promises.push(AddonModWorkshop.getSubmissionAssessments(this.workshopId, this.submissionId, {
                    cmId: this.module.id,
                }).then((subAssessments) => {
                    // Only allow the student to delete their own submission if it's still editable and hasn't been assessed.
                    if (this.canDelete) {
                        this.canDelete = !subAssessments.length;
                    }

                    this.submissionInfo.reviewedby = subAssessments;

                    this.submissionInfo.reviewedby.forEach((assessment) => {
                        assessment = AddonModWorkshopHelper.realGradeValue(this.workshop, assessment);

                        if (this.currentUserId == assessment.reviewerid) {
                            this.ownAssessment = assessment;
                            assessment.ownAssessment = true;
                        }
                    });

                    return;
                }));
            } else if (this.currentUserId == this.userId && this.assessmentId) {
                // Get new data, different that came from stateParams.
                promises.push(AddonModWorkshop.getAssessment(this.workshopId, this.assessmentId, {
                    cmId: this.module.id,
                }).then((assessment) => {
                    // Only allow the student to delete their own submission if it's still editable and hasn't been assessed.
                    if (this.canDelete) {
                        this.canDelete = !assessment;
                    }

                    this.submissionInfo.reviewedby = [this.parseAssessment(assessment)];

                    return;
                }));
            } else if (this.workshop.phase == AddonModWorkshopPhase.PHASE_CLOSED && this.userId == this.currentUserId) {
                const assessments = await AddonModWorkshop.getSubmissionAssessments(this.workshopId, this.submissionId, {
                    cmId: this.module.id,
                });

                this.submissionInfo.reviewedby = assessments.map((assessment) => this.parseAssessment(assessment));
            }

            if (this.canAddFeedback || this.workshop.phase == AddonModWorkshopPhase.PHASE_CLOSED) {
                this.evaluate = {
                    published: this.submission.published,
                    text: this.submission.feedbackauthor || '',
                };
            }

            if (this.canAddFeedback) {

                if (!this.isDestroyed) {
                    // Block the workshop.
                    CoreSync.blockOperation(this.component, this.workshopId);
                }

                const defaultGrade = Translate.instant('addon.mod_workshop.notoverridden');

                promises.push(CoreGradesHelper.makeGradesMenu(this.workshop.grade || 0, undefined, defaultGrade, -1)
                    .then(async (grades) => {
                        this.evaluationGrades = grades;

                        this.evaluate!.grade = {
                            label: CoreGradesHelper.getGradeLabelFromValue(grades, this.submissionInfo.gradeover) ||
                            defaultGrade,
                            value: this.submissionInfo.gradeover || -1,
                        };

                        try {
                            const offlineSubmission =
                                await AddonModWorkshopOffline.getEvaluateSubmission(this.workshopId, this.submissionId);

                            this.hasOffline = true;
                            this.evaluate!.published = offlineSubmission.published;
                            this.evaluate!.text = offlineSubmission.feedbacktext;
                            this.evaluate!.grade = {
                                label: CoreGradesHelper.getGradeLabelFromValue(
                                    grades,
                                    parseInt(offlineSubmission.gradeover, 10),
                                ) || defaultGrade,
                                value: offlineSubmission.gradeover || -1,
                            };
                        } catch {
                            // Ignore errors.
                            this.hasOffline = false;
                        } finally {
                            this.originalEvaluation.published = this.evaluate!.published;
                            this.originalEvaluation.text = this.evaluate!.text;
                            this.originalEvaluation.grade = this.evaluate!.grade.value;

                            this.feedbackForm.controls['published'].setValue(this.evaluate!.published);
                            this.feedbackForm.controls['grade'].setValue(this.evaluate!.grade.value);
                            this.feedbackForm.controls['text'].setValue(this.evaluate!.text);
                        }

                        return;
                    }));
            } else if (this.workshop.phase == AddonModWorkshopPhase.PHASE_CLOSED && this.submission.gradeoverby &&
                    this.evaluate && this.evaluate.text) {
                promises.push(CoreUser.getProfile(this.submission.gradeoverby, this.courseId, true).then((profile) => {
                    this.evaluateByProfile = profile;

                    return;
                }));
            }

            if (this.assessment && !this.access.assessingallowed && this.assessment.feedbackreviewer &&
                    this.assessment.gradinggradeoverby) {
                promises.push(CoreUser.getProfile(this.assessment.gradinggradeoverby, this.courseId, true)
                    .then((profile) => {
                        this.evaluateGradingByProfile = profile;

                        return;
                    }));
            }

            await Promise.all(promises);

            const submissionsActions = await AddonModWorkshopOffline.getSubmissions(this.workshopId);

            this.submission = await AddonModWorkshopHelper.applyOfflineData(this.submission, submissionsActions);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Parse assessment to be shown.
     *
     * @param assessment Original assessment.
     * @return Parsed assessment.
     */
    protected parseAssessment(
        assessment: AddonModWorkshopSubmissionAssessmentWithFormData,
    ): AddonModWorkshopSubmissionAssessmentWithFormData {
        assessment = AddonModWorkshopHelper.realGradeValue(this.workshop, assessment);

        if (this.currentUserId == assessment.reviewerid) {
            this.ownAssessment = assessment;
            assessment.ownAssessment = true;
        }

        return assessment;
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
     * @return True if changed, false otherwise.
     */
    protected hasEvaluationChanged(): boolean {
        if (!this.loaded || !this.access.canoverridegrades) {
            return false;
        }

        const inputData = this.feedbackForm.value;

        if (this.originalEvaluation.published != inputData.published) {
            return true;
        }

        if (this.originalEvaluation.text != inputData.text) {
            return true;
        }

        if (this.originalEvaluation.grade != inputData.grade) {
            return true;
        }

        return false;
    }

    /**
     * Convenience function to refresh all the data.
     *
     * @return Resolved when done.
     */
    protected async refreshAllData(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModWorkshop.invalidateSubmissionData(this.workshopId, this.submissionId));
        promises.push(AddonModWorkshop.invalidateSubmissionsData(this.workshopId));
        promises.push(AddonModWorkshop.invalidateSubmissionAssesmentsData(this.workshopId, this.submissionId));

        if (this.assessmentId) {
            promises.push(AddonModWorkshop.invalidateAssessmentFormData(this.workshopId, this.assessmentId));
            promises.push(AddonModWorkshop.invalidateAssessmentData(this.workshopId, this.assessmentId));
        }

        if (this.assessmentUserId) {
            promises.push(AddonModWorkshop.invalidateReviewerAssesmentsData(this.workshopId, this.assessmentId));
        }

        try {
            await Promise.all(promises);
        } finally {
            CoreEvents.trigger(AddonModWorkshopProvider.ASSESSMENT_INVALIDATED, null, this.siteId);

            await this.fetchSubmissionData();
        }
    }

    /**
     * Pull to refresh.
     *
     * @param refresher Refresher.
     */
    refreshSubmission(refresher: IonRefresher): void {
        if (this.loaded) {
            this.refreshAllData().finally(() => {
                refresher?.complete();
            });
        }
    }

    /**
     * Save the assessment.
     */
    async saveAssessment(): Promise<void> {
        if (this.assessmentStrategy?.hasDataChanged()) {
            try {
                await this.assessmentStrategy.saveAssessment();
                this.forceLeavePage();
            } catch {
                // Error, stay on the page.
            }
        } else {
            // Nothing to save, just go back.
            this.forceLeavePage();
        }
    }

    /**
     * Save the submission evaluation.
     */
    async saveEvaluation(): Promise<void> {
        // Check if data has changed.
        if (this.hasEvaluationChanged()) {
            await this.sendEvaluation();
            this.forceLeavePage();
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
    protected async sendEvaluation(): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading('core.sending', true);

        const inputData: {
            grade: number | string;
            text: string;
            published: boolean;
        } = this.feedbackForm.value;

        inputData.grade = inputData.grade >= 0 ? inputData.grade : '';
        // Add some HTML to the message if needed.
        inputData.text = CoreTextUtils.formatHtmlLines(inputData.text);

        // Try to send it to server.
        try {
            const result = await AddonModWorkshop.evaluateSubmission(
                this.workshopId,
                this.submissionId,
                this.courseId,
                inputData.text,
                inputData.published,
                String(inputData.grade),
            );
            CoreForms.triggerFormSubmittedEvent(this.formElement, !!result, this.siteId);

            await AddonModWorkshop.invalidateSubmissionData(this.workshopId, this.submissionId).finally(() => {
                const data: AddonModWorkshopSubmissionChangedEventData = {
                    workshopId: this.workshopId,
                    submissionId: this.submissionId,
                };

                CoreEvents.trigger(AddonModWorkshopProvider.SUBMISSION_CHANGED, data, this.siteId);
            });
        } catch (message) {
            CoreDomUtils.showErrorModalDefault(message, 'Cannot save submission evaluation');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Perform the submission delete action.
     */
    async deleteSubmission(): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm('addon.mod_workshop.submissiondeleteconfirm');
        } catch {
            return;
        }

        const modal = await CoreDomUtils.showModalLoading('core.deleting', true);

        let success = false;
        try {
            await AddonModWorkshop.deleteSubmission(this.workshopId, this.submissionId, this.courseId);
            success = true;

            await AddonModWorkshop.invalidateSubmissionData(this.workshopId, this.submissionId);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Cannot delete submission');
        } finally {
            modal.dismiss();
            if (success) {
                const data: AddonModWorkshopSubmissionChangedEventData = {
                    workshopId: this.workshopId,
                    submissionId: this.submissionId,
                };

                CoreEvents.trigger(AddonModWorkshopProvider.SUBMISSION_CHANGED, data, this.siteId);

                this.forceLeavePage();
            }
        }
    }

    /**
     * Undo the submission delete action.
     *
     * @return Resolved when done.
     */
    async undoDeleteSubmission(): Promise<void> {
        await AddonModWorkshopOffline.deleteSubmissionAction(
            this.workshopId,
            AddonModWorkshopAction.DELETE,
        ).finally(async () => {

            const data: AddonModWorkshopSubmissionChangedEventData = {
                workshopId: this.workshopId,
                submissionId: this.submissionId,
            };

            CoreEvents.trigger(AddonModWorkshopProvider.SUBMISSION_CHANGED, data, this.siteId);

            await this.refreshAllData();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        this.syncObserver?.off();
        this.obsAssessmentSaved?.off();
        // Restore original back functions.
        CoreSync.unblockOperation(this.component, this.workshopId);
    }

}

type AddonWorkshopSubmissionEvaluateData = {
    published: boolean;
    text: string;
    grade?: CoreGradesMenuItem;
};
