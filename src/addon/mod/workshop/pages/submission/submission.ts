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

import { Component, OnInit, OnDestroy, Optional, ViewChild } from '@angular/core';
import { Content, IonicPage, NavParams, NavController } from 'ionic-angular';
import { FormGroup, FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { AddonModWorkshopAssessmentStrategyComponent } from '../../components/assessment-strategy/assessment-strategy';
import { AddonModWorkshopProvider } from '../../providers/workshop';
import { AddonModWorkshopHelperProvider } from '../../providers/helper';
import { AddonModWorkshopOfflineProvider } from '../../providers/offline';
import { AddonModWorkshopSyncProvider } from '../../providers/sync';

/**
 * Page that displays a workshop submission.
 */
@IonicPage({ segment: 'addon-mod-workshop-submission' })
@Component({
    selector: 'page-addon-mod-workshop-submission-page',
    templateUrl: 'submission.html',
})
export class AddonModWorkshopSubmissionPage implements OnInit, OnDestroy {

    @ViewChild(AddonModWorkshopAssessmentStrategyComponent) assessmentStrategy: AddonModWorkshopAssessmentStrategyComponent;

    module: any;
    workshop: any;
    access: any;
    assessment: any;
    submissionInfo: any;
    submission: any;

    courseId: number;
    profile: any;

    title: string;
    loaded = false;
    ownAssessment = false;
    strategy: any;
    assessmentId: number;
    assessmentUserId: number;
    evaluate: any;
    canAddFeedback = false;
    canEdit = false;
    canDelete = false;
    evaluationGrades: any;
    evaluateGradingByProfile: any;
    evaluateByProfile: any;
    feedbackForm: FormGroup; // The form group.

    protected submissionId: number;
    protected workshopId: number;
    protected currentUserId: number;
    protected userId: number;
    protected siteId: string;
    protected originalEvaluation = {
        published: '',
        text: '',
        grade: ''
    };
    protected hasOffline = false;
    protected component = AddonModWorkshopProvider.COMPONENT;
    protected forceLeave = false;
    protected obsAssessmentSaved: any;
    protected syncObserver: any;
    protected isDestroyed = false;

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider, protected workshopProvider: AddonModWorkshopProvider,
            protected workshopOffline: AddonModWorkshopOfflineProvider, protected syncProvider: CoreSyncProvider,
            protected workshopHelper: AddonModWorkshopHelperProvider, protected navCtrl: NavController,
            protected textUtils: CoreTextUtilsProvider, protected domUtils: CoreDomUtilsProvider, protected fb: FormBuilder,
            protected translate: TranslateService, protected eventsProvider: CoreEventsProvider,
            protected courseProvider: CoreCourseProvider, @Optional() protected content: Content,
            protected gradesHelper: CoreGradesHelperProvider, protected userProvider: CoreUserProvider) {
        this.module = navParams.get('module');
        this.workshop = navParams.get('workshop');
        this.access = navParams.get('access');
        this.courseId = navParams.get('courseId');
        this.profile = navParams.get('profile');
        this.submissionInfo = navParams.get('submission') || {};
        this.assessment = navParams.get('assessment') || null;

        this.title = this.module.name;
        this.workshopId = this.module.instance;
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.siteId = sitesProvider.getCurrentSiteId();
        this.submissionId = this.submissionInfo.submissionid || this.submissionInfo.id;
        this.userId = this.submissionInfo.userid || null;
        this.strategy = (this.assessment && this.assessment.strategy) || (this.workshop && this.workshop.strategy);
        this.assessmentId = this.assessment && (this.assessment.assessmentid || this.assessment.id);
        this.assessmentUserId = this.assessment && (this.assessment.reviewerid || this.assessment.userid);

        this.feedbackForm = new FormGroup({});
        this.feedbackForm.addControl('published', this.fb.control(''));
        this.feedbackForm.addControl('grade', this.fb.control(''));
        this.feedbackForm.addControl('text', this.fb.control(''));

        this.obsAssessmentSaved = this.eventsProvider.on(AddonModWorkshopProvider.ASSESSMENT_SAVED, (data) => {
            this.eventReceived(data);
        }, this.siteId);

        // Refresh workshop on sync.
        this.syncObserver = this.eventsProvider.on(AddonModWorkshopSyncProvider.AUTO_SYNCED, (data) => {
            // Update just when all database is synced.
            this.eventReceived(data);
        }, this.siteId);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchSubmissionData().then(() => {
            this.workshopProvider.logViewSubmission(this.submissionId, this.workshopId, this.workshop.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        const assessmentHasChanged = this.assessmentStrategy && this.assessmentStrategy.hasDataChanged();
        if (this.forceLeave || (!this.hasEvaluationChanged() && !assessmentHasChanged)) {
            return true;
        }

        // Show confirmation if some data has been modified.
        return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
    }

    /**
     * Goto edit submission page.
     */
     editSubmission(): void {
        const params = {
            module: module,
            access: this.access,
            courseid: this.courseId,
            submissionId: this.submission.id
        };

        this.navCtrl.push('AddonModWorkshopEditSubmissionPage', params);
    }

    /**
     * Function called when we receive an event of submission changes.
     *
     * @param data Event data received.
     */
    protected eventReceived(data: any): void {
        if (this.workshopId === data.workshopId) {
            this.domUtils.scrollToTop(this.content);

            this.loaded = false;
            this.refreshAllData();
        }
    }

    /**
     * Fetch the submission data.
     *
     * @return Resolved when done.
     */
    protected fetchSubmissionData(): Promise<void> {
        return this.workshopHelper.getSubmissionById(this.workshopId, this.submissionId).then((submissionData) => {
            const promises = [];

            this.submission = submissionData;
            this.submission.attachmentfiles = submissionData.attachmentfiles || [];
            this.submission.submissiongrade = this.submissionInfo && this.submissionInfo.submissiongrade;
            this.submission.gradinggrade = this.submissionInfo && this.submissionInfo.gradinggrade;
            this.submission.submissiongradeover = this.submissionInfo && this.submissionInfo.submissiongradeover;
            this.userId = submissionData.authorid || this.userId;
            this.canEdit = this.currentUserId == this.userId && this.access.cansubmit && this.access.modifyingsubmissionallowed;
            this.canDelete = this.access.candeletesubmissions;
            this.canAddFeedback = !this.assessmentId && this.workshop.phase > AddonModWorkshopProvider.PHASE_ASSESSMENT &&
                this.workshop.phase < AddonModWorkshopProvider.PHASE_CLOSED && this.access.canoverridegrades;
            this.ownAssessment = false;

            if (this.access.canviewallassessments) {
                // Get new data, different that came from stateParams.
                promises.push(this.workshopProvider.getSubmissionAssessments(this.workshopId, this.submissionId)
                        .then((subAssessments) => {
                    // Only allow the student to delete their own submission if it's still editable and hasn't been assessed.
                    if (this.canDelete) {
                        this.canDelete = !subAssessments.length;
                    }

                    this.submissionInfo.reviewedby = subAssessments;

                    this.submissionInfo.reviewedby.forEach((assessment) => {
                        assessment.userid = assessment.reviewerid;
                        assessment = this.workshopHelper.realGradeValue(this.workshop, assessment);

                        if (this.currentUserId == assessment.userid) {
                            this.ownAssessment = assessment;
                            assessment.ownAssessment = true;
                        }
                    });
                }));
            } else if (this.currentUserId == this.userId && this.assessmentId) {
                // Get new data, different that came from stateParams.
                promises.push(this.workshopProvider.getAssessment(this.workshopId, this.assessmentId).then((assessment) => {
                    // Only allow the student to delete their own submission if it's still editable and hasn't been assessed.
                    if (this.canDelete) {
                        this.canDelete = !assessment;
                    }

                    assessment.userid = assessment.reviewerid;
                    assessment = this.workshopHelper.realGradeValue(this.workshop, assessment);

                    if (this.currentUserId == assessment.userid) {
                        this.ownAssessment = assessment;
                        assessment.ownAssessment = true;
                    }

                    this.submissionInfo.reviewedby = [assessment];
                }));
            }

            if (this.canAddFeedback || this.workshop.phase == AddonModWorkshopProvider.PHASE_CLOSED) {
                this.evaluate = {
                    published: submissionData.published,
                    text: submissionData.feedbackauthor || ''
                };
            }

            if (this.canAddFeedback) {

                if (!this.isDestroyed) {
                    // Block the workshop.
                    this.syncProvider.blockOperation(this.component, this.workshopId);
                }

                const defaultGrade = this.translate.instant('addon.mod_workshop.notoverridden');

                promises.push(this.gradesHelper.makeGradesMenu(this.workshop.grade, undefined, defaultGrade, -1).then((grades) => {
                    this.evaluationGrades = grades;

                    this.evaluate.grade = {
                        label: this.gradesHelper.getGradeLabelFromValue(grades, this.submissionInfo.submissiongradeover) ||
                            defaultGrade,
                        value: this.submissionInfo.submissiongradeover || -1
                    };

                    return this.workshopOffline.getEvaluateSubmission(this.workshopId, this.submissionId)
                            .then((offlineSubmission) => {
                        this.hasOffline = true;
                        this.evaluate.published = offlineSubmission.published;
                        this.evaluate.text = offlineSubmission.feedbacktext;
                        this.evaluate.grade = {
                            label: this.gradesHelper.getGradeLabelFromValue(grades, offlineSubmission.gradeover) || defaultGrade,
                            value: offlineSubmission.gradeover || -1
                        };
                    }).catch(() => {
                        this.hasOffline = false;
                        // Ignore errors.
                    }).finally(() => {
                        this.originalEvaluation.published = this.evaluate.published;
                        this.originalEvaluation.text = this.evaluate.text;
                        this.originalEvaluation.grade = this.evaluate.grade.value;

                        this.feedbackForm.controls['published'].setValue(this.evaluate.published);
                        this.feedbackForm.controls['grade'].setValue(this.evaluate.grade.value);
                        this.feedbackForm.controls['text'].setValue(this.evaluate.text);
                    });
                }));
            } else if (this.workshop.phase == AddonModWorkshopProvider.PHASE_CLOSED && submissionData.gradeoverby &&
                    this.evaluate && this.evaluate.text) {
                promises.push(this.userProvider.getProfile(submissionData.gradeoverby, this.courseId, true).then((profile) => {
                    this.evaluateByProfile = profile;
                }));
            }

            if (this.assessmentId && !this.access.assessingallowed && this.assessment.feedbackreviewer &&
                    this.assessment.gradinggradeoverby) {
                promises.push(this.userProvider.getProfile(this.assessment.gradinggradeoverby, this.courseId, true)
                        .then((profile) => {
                    this.evaluateGradingByProfile = profile;
                }));
            }

            return Promise.all(promises);
        }).then(() => {
            return this.workshopOffline.getSubmissions(this.workshopId).then((submissionsActions) => {
                const actions = this.workshopHelper.filterSubmissionActions(submissionsActions, this.submissionId);

                return this.workshopHelper.applyOfflineData(this.submission, actions).then((submission) => {
                    this.submission = submission;
                });
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
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
    protected refreshAllData(): Promise<any> {
        const promises = [];

        promises.push(this.workshopProvider.invalidateSubmissionData(this.workshopId, this.submissionId));
        promises.push(this.workshopProvider.invalidateSubmissionsData(this.workshopId));
        promises.push(this.workshopProvider.invalidateSubmissionAssesmentsData(this.workshopId, this.submissionId));

        if (this.assessmentId) {
            promises.push(this.workshopProvider.invalidateAssessmentFormData(this.workshopId, this.assessmentId));
            promises.push(this.workshopProvider.invalidateAssessmentData(this.workshopId, this.assessmentId));
        }

        if (this.assessmentUserId) {
            promises.push(this.workshopProvider.invalidateReviewerAssesmentsData(this.workshopId, this.assessmentId));
        }

        return Promise.all(promises).finally(() => {
            this.eventsProvider.trigger(AddonModWorkshopProvider.ASSESSMENT_INVALIDATED, this.siteId);

            return this.fetchSubmissionData();
        });
    }

    /**
     * Pull to refresh.
     *
     * @param refresher Refresher.
     */
    refreshSubmission(refresher: any): void {
        if (this.loaded) {
            this.refreshAllData().finally(() => {
                refresher.complete();
            });
        }
    }

    /**
     * Save the assessment.
     */
    saveAssessment(): void {
        if (this.assessmentStrategy && this.assessmentStrategy.hasDataChanged()) {
            this.assessmentStrategy.saveAssessment().then(() => {
                this.forceLeavePage();
            }).catch(() => {
                // Error, stay on the page.
            });
        } else {
            // Nothing to save, just go back.
            this.forceLeavePage();
        }
    }

    /**
     * Save the submission evaluation.
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
        const modal = this.domUtils.showModalLoading('core.sending', true);

        const inputData = this.feedbackForm.value;

        inputData.grade = inputData.grade >= 0 ? inputData.grade : '';
        // Add some HTML to the message if needed.
        inputData.text = this.textUtils.formatHtmlLines(inputData.text);

        // Try to send it to server.
        return this.workshopProvider.evaluateSubmission(this.workshopId, this.submissionId, this.courseId, inputData.text,
                inputData.published, inputData.grade).then(() => {
            const data = {
                workshopId: this.workshopId,
                cmId: this.module.cmid,
                submissionId: this.submissionId
            };

            return this.workshopProvider.invalidateSubmissionData(this.workshopId, this.submissionId).finally(() => {
                this.eventsProvider.trigger(AddonModWorkshopProvider.SUBMISSION_CHANGED, data, this.siteId);
            });
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'Cannot save submission evaluation');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Perform the submission delete action.
     */
    deleteSubmission(): void {
        this.domUtils.showDeleteConfirm('addon.mod_workshop.submissiondeleteconfirm').then(() => {
            const modal = this.domUtils.showModalLoading('core.deleting', true);
            let success = false;
            this.workshopProvider.deleteSubmission(this.workshopId, this.submissionId, this.courseId).then(() => {
                success = true;

                return this.workshopProvider.invalidateSubmissionData(this.workshopId, this.submissionId);
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'Cannot delete submission');
            }).finally(() => {
                modal.dismiss();
                if (success) {
                    const data = {
                        workshopId: this.workshopId,
                        cmId: this.module.cmid,
                        submissionId: this.submissionId
                    };

                    this.eventsProvider.trigger(AddonModWorkshopProvider.SUBMISSION_CHANGED, data, this.siteId);

                    this.forceLeavePage();
                }
            });
        });
    }

    /**
     * Undo the submission delete action.
     *
     * @return Resolved when done.
     */
    undoDeleteSubmission(): Promise<any> {
        return this.workshopOffline.deleteSubmissionAction(this.workshopId, this.submissionId, 'delete').finally(() => {

            const data = {
                workshopId: this.workshopId,
                cmId: this.module.cmid,
                submissionId: this.submissionId
            };

            this.eventsProvider.trigger(AddonModWorkshopProvider.SUBMISSION_CHANGED, data, this.siteId);

            return this.refreshAllData();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        this.syncObserver && this.syncObserver.off();
        this.obsAssessmentSaved && this.obsAssessmentSaved.off();
        // Restore original back functions.
        this.syncProvider.unblockOperation(this.component, this.workshopId);
    }
}
