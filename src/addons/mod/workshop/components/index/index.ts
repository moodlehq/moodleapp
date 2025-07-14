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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Params } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CorePlatform } from '@services/platform';
import { CoreModals } from '@services/overlays/modals';
import { CoreObject } from '@singletons/object';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import {
    AddonModWorkshop,
    AddonModWorkshopData,
    AddonModWorkshopGetWorkshopAccessInformationWSResponse,
    AddonModWorkshopPhaseData,
    AddonModWorkshopGetGradesWSResponse,
    AddonModWorkshopAssessmentSavedChangedEventData,
    AddonModWorkshopSubmissionChangedEventData,
    AddonModWorkshopGradesData,
    AddonModWorkshopPhaseTaskData,
    AddonModWorkshopReviewer,
} from '../../services/workshop';
import {
    AddonModWorkshopHelper,
    AddonModWorkshopSubmissionAssessmentWithFormData,
    AddonModWorkshopSubmissionDataWithOfflineData,
} from '../../services/workshop-helper';
import { AddonModWorkshopOffline, AddonModWorkshopOfflineSubmission } from '../../services/workshop-offline';
import {
    AddonModWorkshopSync,
    AddonModWorkshopAutoSyncData,
    AddonModWorkshopSyncResult,
} from '../../services/workshop-sync';
import {
    ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED,
    ADDON_MOD_WORKSHOP_AUTO_SYNCED,
    ADDON_MOD_WORKSHOP_COMPONENT,
    ADDON_MOD_WORKSHOP_PAGE_NAME,
    ADDON_MOD_WORKSHOP_PER_PAGE,
    ADDON_MOD_WORKSHOP_SUBMISSION_CHANGED,
    AddonModWorkshopPhase,
} from '@addons/mod/workshop/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreOpener } from '@singletons/opener';
import { AddonModWorkshopSubmissionComponent } from '../submission/submission';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';

/**
 * Component that displays a workshop index page.
 */
@Component({
    selector: 'addon-mod-workshop-index',
    templateUrl: 'addon-mod-workshop-index.html',
    imports: [
        CoreSharedModule,
        AddonModWorkshopSubmissionComponent,
        CoreCourseModuleNavigationComponent,
        CoreCourseModuleInfoComponent,
    ],
})
export class AddonModWorkshopIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    @Input() group = 0;

    component = ADDON_MOD_WORKSHOP_COMPONENT;
    pluginName = 'workshop';

    workshop?: AddonModWorkshopData;
    page = 0;
    access?: AddonModWorkshopGetWorkshopAccessInformationWSResponse;
    phases?: Record<string, AddonModWorkshopPhaseData>;
    grades: AddonModWorkshopSubmissionDataWithOfflineData[] = [];
    assessments: AddonModWorkshopSubmissionAssessmentWithFormData[] = [];
    userGrades?: AddonModWorkshopGetGradesWSResponse;
    publishedSubmissions: AddonModWorkshopSubmissionDataWithOfflineData[] = [];
    submission?: AddonModWorkshopSubmissionDataWithOfflineData;
    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false,
        defaultGroupId: 0,
        canAccessAllGroups: false,
    };

    canSubmit = false;
    showSubmit = false;
    canAssess = false;
    hasNextPage = false;

    readonly PHASE_SETUP = AddonModWorkshopPhase.PHASE_SETUP;
    readonly PHASE_SUBMISSION = AddonModWorkshopPhase.PHASE_SUBMISSION;
    readonly PHASE_ASSESSMENT = AddonModWorkshopPhase.PHASE_ASSESSMENT;
    readonly PHASE_EVALUATION = AddonModWorkshopPhase.PHASE_EVALUATION;
    readonly PHASE_CLOSED = AddonModWorkshopPhase.PHASE_CLOSED;

    protected offlineSubmissions: AddonModWorkshopOfflineSubmission[] = [];
    protected obsSubmissionChanged: CoreEventObserver;
    protected obsAssessmentSaved: CoreEventObserver;
    protected appResumeSubscription: Subscription;
    protected syncObserver?: CoreEventObserver;
    protected syncEventName = ADDON_MOD_WORKSHOP_AUTO_SYNCED;

    constructor () {
        super();

        // Listen to submission and assessment changes.
        this.obsSubmissionChanged = CoreEvents.on(ADDON_MOD_WORKSHOP_SUBMISSION_CHANGED, (data) => {
            this.eventReceived(data);
        }, this.siteId);

        // Listen to submission and assessment changes.
        this.obsAssessmentSaved = CoreEvents.on(ADDON_MOD_WORKSHOP_ASSESSMENT_SAVED, (data) => {
            this.eventReceived(data);
        }, this.siteId);

        // Since most actions will take the user out of the app, we should refresh the view when the app is resumed.
        this.appResumeSubscription = CorePlatform.resume.subscribe(() => {
            this.showLoadingAndRefresh(true);
        });

        // Refresh workshop on sync.
        this.syncObserver = CoreEvents.on(ADDON_MOD_WORKSHOP_AUTO_SYNCED, (data) => {
            // Update just when all database is synced.
            this.eventReceived(data);
        }, this.siteId);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent(false, true);
    }

    /**
     * Function called when we receive an event of submission changes.
     *
     * @param data Data received by the event.
     */
    protected eventReceived(
        data: AddonModWorkshopAutoSyncData |
        AddonModWorkshopSubmissionChangedEventData |
        AddonModWorkshopAssessmentSavedChangedEventData,
    ): void {
        if (this.workshop?.id === data.workshopId) {
            this.showLoadingAndRefresh(true);

            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            this.checkCompletion();
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModWorkshop.invalidateWorkshopData(this.courseId));
        if (this.workshop) {
            promises.push(AddonModWorkshop.invalidateWorkshopAccessInformationData(this.workshop.id));
            promises.push(AddonModWorkshop.invalidateUserPlanPhasesData(this.workshop.id));
            if (this.canSubmit) {
                promises.push(AddonModWorkshop.invalidateSubmissionsData(this.workshop.id));
            }
            if (this.submission) {
                promises.push(AddonModWorkshop.invalidateSubmissionData(this.workshop.id, this.submission.id));
            }
            if (this.access?.canviewallsubmissions) {
                promises.push(AddonModWorkshop.invalidateGradeReportData(this.workshop.id));
                promises.push(CoreGroups.invalidateActivityAllowedGroups(this.workshop.coursemodule));
                promises.push(CoreGroups.invalidateActivityGroupMode(this.workshop.coursemodule));
            }
            if (this.canAssess) {
                promises.push(AddonModWorkshop.invalidateReviewerAssesmentsData(this.workshop.id));
            }
            promises.push(AddonModWorkshop.invalidateGradesData(this.workshop.id));
            promises.push(AddonModWorkshop.invalidateWorkshopWSData(this.workshop.id));
        }

        await Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @returns True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModWorkshopAutoSyncData): boolean {
        if (this.workshop && syncEventData.workshopId == this.workshop.id) {
            // Refresh the data.
            this.content?.scrollToTop();

            return true;
        }

        return false;
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        this.workshop = await AddonModWorkshop.getWorkshop(this.courseId, this.module.id);

        this.description = this.workshop.intro;
        this.dataRetrieved.emit(this.workshop);

        if (sync) {
            // Try to synchronize the feedback.
            await this.syncActivity(showErrors);
        }

        // Check if there are answers stored in offline.
        this.access = await AddonModWorkshop.getWorkshopAccessInformation(this.workshop.id, { cmId: this.module.id });

        if (this.access.canviewallsubmissions) {
            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.workshop.coursemodule);
            this.group = CoreGroups.validateGroupId(this.group, this.groupInfo);
        }

        this.phases = await AddonModWorkshop.getUserPlanPhases(this.workshop.id, { cmId: this.module.id });

        this.phases[this.workshop.phase].tasks.forEach((task) => {
            if (!task.link && (task.code == 'examples' || task.code == 'prepareexamples')) {
                // Add links to manage examples.
                task.link = this.module.url || '';
            }
        });

        // Check if there are info stored in offline.
        this.hasOffline = await AddonModWorkshopOffline.hasWorkshopOfflineData(this.workshop.id);
        if (this.hasOffline) {
            this.offlineSubmissions = await AddonModWorkshopOffline.getSubmissions(this.workshop.id);
        } else {
            this.offlineSubmissions = [];
        }

        await this.setPhaseInfo();
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.workshop) {
            return; // Shouldn't happen.
        }

        await CorePromiseUtils.ignoreErrors(AddonModWorkshop.logView(this.workshop.id));

        this.analyticsLogEvent('mod_workshop_view_workshop');
    }

    /**
     * Retrieves and shows submissions grade page.
     *
     * @param page Page number to be retrieved.
     * @returns Resolved when done.
     */
    async gotoSubmissionsPage(page: number): Promise<void> {
        if (!this.workshop) {
            return;
        }
        const workshop = this.workshop;

        const report = await AddonModWorkshop.getGradesReport(workshop.id, {
            groupId: this.group,
            page,
            cmId: this.module.id,
        });

        const numEntries = (report && report.grades && report.grades.length) || 0;

        this.page = page;

        this.hasNextPage = numEntries >= ADDON_MOD_WORKSHOP_PER_PAGE && ((this.page + 1) *
            ADDON_MOD_WORKSHOP_PER_PAGE) < report.totalcount;

        const grades: AddonModWorkshopGradesData[] = report.grades || [];

        this.grades = [];

        await Promise.all(grades.map(async (grade) => {
            const submission: AddonModWorkshopSubmissionDataWithOfflineData = {
                id: grade.submissionid || 0,
                workshopid: workshop.id,
                example: false,
                authorid: grade.userid,
                timecreated: grade.submissionmodified || 0,
                timemodified: grade.submissionmodified || 0,
                title: grade.submissiontitle || '',
                content: '',
                contenttrust: 0,
                attachment: 0,
                grade: grade.submissiongrade,
                gradeover: grade.submissiongradeover,
                gradeoverby: grade.submissiongradeoverby,
                published: !!grade.submissionpublished,
                gradinggrade: grade.gradinggrade,
                late: 0,
                reviewedby: this.parseReviewer(grade.reviewedby),
                reviewerof: this.parseReviewer(grade.reviewerof),
            };

            if (workshop.phase == AddonModWorkshopPhase.PHASE_ASSESSMENT) {
                submission.reviewedbydone = grade.reviewedby?.reduce((a, b) => a + (b.grade ? 1 : 0), 0) || 0;
                submission.reviewerofdone = grade.reviewerof?.reduce((a, b) => a + (b.grade ? 1 : 0), 0) || 0;
                submission.reviewedbycount = grade.reviewedby?.length || 0;
                submission.reviewerofcount = grade.reviewerof?.length || 0;
            }

            const offlineData = await AddonModWorkshopHelper.applyOfflineData(submission, this.offlineSubmissions);

            if (offlineData !== undefined) {
                this.grades.push(offlineData);
            }
        }));
    }

    protected parseReviewer(reviewers: AddonModWorkshopReviewer[] = []): AddonModWorkshopSubmissionAssessmentWithFormData[] {
        return reviewers.map((reviewer: AddonModWorkshopReviewer) => {
            const parsed: AddonModWorkshopSubmissionAssessmentWithFormData = {
                grade: reviewer.grade,
                gradinggrade: reviewer.gradinggrade,
                gradinggradeover: reviewer.gradinggradeover,
                id: reviewer.assessmentid,
                reviewerid: reviewer.userid,
                submissionid: reviewer.submissionid,
                weight: reviewer.weight,
                timecreated: 0,
                timemodified: 0,
                feedbackauthor: '',
                gradinggradeoverby: 0,
                feedbackattachmentfiles: [],
                feedbackcontentfiles: [],
                feedbackauthorattachment: 0,
            };

            return parsed;
        });
    }

    /**
     * Open task.
     *
     * @param task Task to be done.
     */
    async runTask(task: AddonModWorkshopPhaseTaskData): Promise<void> {
        if (task.code === 'submit') {
            this.gotoSubmit();
        } else if (task.link) {
            CoreOpener.openInBrowser(task.link);
        }
    }

    /**
     * Go to submit page.
     */
    gotoSubmit(): void {
        if (!this.canSubmit || !this.access) {
            return;
        }

        if ((this.access.creatingsubmissionallowed && !this.submission) ||
            (this.access.modifyingsubmissionallowed && this.submission)) {
            const params: Params = {
                module: this.module,
                access: this.access,
            };

            const submissionId = this.submission?.id || 0;
            CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_WORKSHOP_PAGE_NAME}/${this.courseId}/${this.module.id}/${submissionId}/edit`,
                { params },
            );

        }
    }

    /**
     * View Phase info.
     */
    async viewPhaseInfo(): Promise<void> {
        if (!this.phases || !this.workshop) {
            return;
        }
        const { AddonModWorkshopPhaseInfoModalComponent } =
            await import('@addons/mod/workshop/components/phase-modal/phase-modal');

        const modalData = await CoreModals.openModal<boolean>({
            component: AddonModWorkshopPhaseInfoModalComponent,
            componentProps: {
                phases: CoreObject.toArray(this.phases),
                workshopPhase: this.workshop.phase,
                externalUrl: this.module.url,
                showSubmit: this.showSubmit,
            },
        });

        if (modalData === true) {
            this.gotoSubmit();
        }
    }

    /**
     * Set group to see the workshop.
     *
     * @param groupId Group Id.
     * @returns Promise resolved when done.
     */
    async setGroup(groupId: number): Promise<void> {
        this.group = groupId;

        await this.gotoSubmissionsPage(0);
    }

    /**
     * Convenience function to set current phase information.
     *
     * @returns Promise resolved when done.
     */
    protected async setPhaseInfo(): Promise<void> {
        if (!this.phases || !this.workshop || !this.access) {
            return;
        }

        this.submission = undefined;
        this.canAssess = false;
        this.assessments = [];
        this.userGrades = undefined;
        this.publishedSubmissions = [];

        const workshop = this.workshop;

        this.canSubmit = AddonModWorkshopHelper.canSubmit(
            this.workshop,
            this.access,
            this.phases[AddonModWorkshopPhase.PHASE_SUBMISSION].tasks,
        );

        const promises: Promise<void>[] = [];

        if (this.canSubmit) {
            promises.push(this.loadUserSubmission());
        }

        if (this.access.canviewallsubmissions && this.workshop.phase >= AddonModWorkshopPhase.PHASE_SUBMISSION) {
            promises.push(this.gotoSubmissionsPage(this.page));
        }

        let assessPromise = Promise.resolve();

        if (this.workshop.phase >= AddonModWorkshopPhase.PHASE_ASSESSMENT) {
            this.canAssess = AddonModWorkshopHelper.canAssess(this.workshop, this.access);

            if (this.canAssess) {
                assessPromise = AddonModWorkshopHelper.getReviewerAssessments(this.workshop.id, {
                    cmId: this.module.id,
                    canAssess: AddonModWorkshopHelper.canEditAssessments(this.workshop, this.access),
                }).then(async (assessments) => {
                    await Promise.all(assessments.map(async (assessment) => {
                        assessment.strategy = workshop.strategy;
                        if (!this.hasOffline) {
                            return;
                        }

                        try {
                            const offlineAssessment = await AddonModWorkshopOffline.getAssessment(workshop.id, assessment.id);

                            assessment.offline = true;
                            assessment.timemodified = Math.floor(offlineAssessment.timemodified / 1000);
                        } catch {
                            // Ignore errors.
                        }
                    }));

                    this.assessments = assessments;

                    return;
                });

            }
        }

        if (this.workshop.phase === AddonModWorkshopPhase.PHASE_CLOSED) {
            promises.push(AddonModWorkshop.getGrades(this.workshop.id, { cmId: this.module.id }).then((grades) => {
                this.userGrades = grades.submissionlongstrgrade || grades.assessmentlongstrgrade ? grades : undefined;

                return;
            }));

            if (this.access.canviewpublishedsubmissions) {
                promises.push(assessPromise.then(async () => {
                    const submissions: AddonModWorkshopSubmissionDataWithOfflineData[] =
                        await AddonModWorkshop.getSubmissions(workshop.id, { cmId: this.module.id });

                    this.publishedSubmissions = submissions.filter((submission) => {
                        if (submission.published) {
                            submission.reviewedby =
                                this.assessments.filter((assessment) => assessment.submissionid === submission.id)
                                    .map((assessment => AddonModWorkshopHelper.realGradeValue(workshop, assessment)));

                            return true;
                        }

                        return false;
                    });

                    return;
                }));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Load user submission.
     */
    protected async loadUserSubmission(): Promise<void> {
        if (!this.workshop || !this.access) {
            return;
        }

        const access = this.access;

        const submission = await AddonModWorkshopHelper.getUserSubmission(this.workshop.id, {
            cmId: this.module.id,
            canEdit: this.access.modifyingsubmissionallowed,
        });

        this.showSubmit = (access.creatingsubmissionallowed && !submission) ||
            (access.modifyingsubmissionallowed && !!submission);

        this.submission = await AddonModWorkshopHelper.applyOfflineData(submission, this.offlineSubmissions);
    }

    /**
     * @inheritdoc
     */
    protected sync(): Promise<AddonModWorkshopSyncResult> {
        if (!this.workshop) {
            throw new CoreError('Cannot sync without a workshop.');
        }

        return AddonModWorkshopSync.syncWorkshop(this.workshop.id);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.obsSubmissionChanged?.off();
        this.obsAssessmentSaved?.off();
        this.appResumeSubscription?.unsubscribe();
    }

}
