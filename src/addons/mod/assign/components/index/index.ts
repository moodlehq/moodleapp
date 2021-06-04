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

import { Component, Optional, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Params } from '@angular/router';
import { CoreSite } from '@classes/site';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { IonContent } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    AddonModAssign,
    AddonModAssignAssign,
    AddonModAssignProvider,
    AddonModAssignSubmissionGradingSummary,
} from '../../services/assign';
import { AddonModAssignOffline } from '../../services/assign-offline';
import {
    AddonModAssignAutoSyncData,
    AddonModAssignSync,
    AddonModAssignSyncProvider,
    AddonModAssignSyncResult,
} from '../../services/assign-sync';
import { AddonModAssignModuleHandlerService } from '../../services/handlers/module';
import { AddonModAssignSubmissionComponent } from '../submission/submission';

/**
 * Component that displays an assignment.
 */
@Component({
    selector: 'addon-mod-assign-index',
    templateUrl: 'addon-mod-assign-index.html',
})
export class AddonModAssignIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

   @ViewChild(AddonModAssignSubmissionComponent) submissionComponent?: AddonModAssignSubmissionComponent;

    component = AddonModAssignProvider.COMPONENT;
    moduleName = 'assign';

    assign?: AddonModAssignAssign; // The assign object.
    canViewAllSubmissions = false; // Whether the user can view all submissions.
    canViewOwnSubmission = false; // Whether the user can view their own submission.
    timeRemaining?: string; // Message about time remaining to submit.
    lateSubmissions?: string; // Message about late submissions.
    showNumbers = true; // Whether to show number of submissions with each status.
    summary?: AddonModAssignSubmissionGradingSummary; // The grading summary.
    needsGradingAvailable = false; // Whether we can see the submissions that need grading.

    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false,
        defaultGroupId: 0,
    };

    // Status.
    submissionStatusSubmitted = AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED;
    submissionStatusDraft = AddonModAssignProvider.SUBMISSION_STATUS_DRAFT;
    needGrading = AddonModAssignProvider.NEED_GRADING;

    protected currentUserId?: number; // Current user ID.
    protected currentSite?: CoreSite; // Current user ID.
    protected syncEventName = AddonModAssignSyncProvider.AUTO_SYNCED;

    // Observers.
    protected savedObserver?: CoreEventObserver;
    protected submittedObserver?: CoreEventObserver;
    protected gradedObserver?: CoreEventObserver;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModLessonIndexComponent', content, courseContentsPage);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.currentSite = CoreSites.getCurrentSite();

        // Listen to events.
        this.savedObserver = CoreEvents.on(
            AddonModAssignProvider.SUBMISSION_SAVED_EVENT,
            (data) => {
                if (this.assign && data.assignmentId == this.assign.id && data.userId == this.currentUserId) {
                // Assignment submission saved, refresh data.
                    this.showLoadingAndRefresh(true, false);
                }
            },
            this.siteId,
        );

        this.submittedObserver = CoreEvents.on(
            AddonModAssignProvider.SUBMITTED_FOR_GRADING_EVENT,
            (data) => {
                if (this.assign && data.assignmentId == this.assign.id && data.userId == this.currentUserId) {
                    // Assignment submitted, check completion.
                    CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);

                    // Reload data since it can have offline data now.
                    this.showLoadingAndRefresh(true, false);
                }
            },
            this.siteId,
        );

        this.gradedObserver = CoreEvents.on(AddonModAssignProvider.GRADED_EVENT, (data) => {
            if (this.assign && data.assignmentId == this.assign.id && data.userId == this.currentUserId) {
                // Assignment graded, refresh data.
                this.showLoadingAndRefresh(true, false);
            }
        }, this.siteId);

        await this.loadContent(false, true);

        try {
            await AddonModAssign.logView(this.assign!.id, this.assign!.name);
            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
        } catch {
            // Ignore errors. Just don't check Module completion.
        }

        if (this.canViewAllSubmissions) {
            // User can see all submissions, log grading view.
            CoreUtils.ignoreErrors(AddonModAssign.logGradingView(this.assign!.id, this.assign!.name));
        } else if (this.canViewOwnSubmission) {
            // User can only see their own submission, log view the user submission.
            CoreUtils.ignoreErrors(AddonModAssign.logSubmissionView(this.assign!.id, this.assign!.name));
        }
    }

    /**
     * Expand the description.
     */
    expandDescription(ev?: Event): void {
        ev?.preventDefault();
        ev?.stopPropagation();

        if (this.assign && (this.description || this.assign.introattachments)) {
            CoreTextUtils.viewText(Translate.instant('core.description'), this.description || '', {
                component: this.component,
                componentId: this.module.id,
                files: this.assign.introattachments,
                filter: true,
                contextLevel: 'module',
                instanceId: this.module.id,
                courseId: this.courseId,
            });
        }
    }

    /**
     * Get assignment data.
     *
     * @param refresh If it's refreshing content.
     * @param sync If it should try to sync.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh = false, sync = false, showErrors = false): Promise<void> {

        // Get assignment data.
        try {
            this.assign = await AddonModAssign.getAssignment(this.courseId, this.module.id);

            this.dataRetrieved.emit(this.assign);
            this.description = this.assign.intro;

            if (sync) {
                // Try to synchronize the assign.
                await CoreUtils.ignoreErrors(this.syncActivity(showErrors));
            }

            // Check if there's any offline data for this assign.
            this.hasOffline = await AddonModAssignOffline.hasAssignOfflineData(this.assign.id);

            // Get assignment submissions.
            const submissions = await AddonModAssign.getSubmissions(this.assign.id, { cmId: this.module.id });
            const time = CoreTimeUtils.timestamp();

            this.canViewAllSubmissions = submissions.canviewsubmissions;

            if (submissions.canviewsubmissions) {

                // Calculate the messages to display about time remaining and late submissions.
                if (this.assign.duedate > 0) {
                    if (this.assign.duedate - time <= 0) {
                        this.timeRemaining = Translate.instant('addon.mod_assign.assignmentisdue');
                    } else {
                        this.timeRemaining = CoreTimeUtils.formatDuration(this.assign.duedate - time, 3);

                        if (this.assign.cutoffdate) {
                            if (this.assign.cutoffdate > time) {
                                this.lateSubmissions = Translate.instant(
                                    'addon.mod_assign.latesubmissionsaccepted',
                                    { $a: CoreTimeUtils.userDate(this.assign.cutoffdate * 1000) },
                                );
                            } else {
                                this.lateSubmissions = Translate.instant('addon.mod_assign.nomoresubmissionsaccepted');
                            }
                        } else {
                            this.lateSubmissions = '';
                        }
                    }
                } else {
                    this.timeRemaining = '';
                    this.lateSubmissions = '';
                }

                // Check if groupmode is enabled to avoid showing wrong numbers.
                this.groupInfo = await CoreGroups.getActivityGroupInfo(this.assign.cmid, false);
                this.showNumbers = (this.groupInfo.groups && this.groupInfo.groups.length == 0) ||
                    this.currentSite!.isVersionGreaterEqualThan('3.5');

                await this.setGroup(CoreGroups.validateGroupId(this.group, this.groupInfo));

                return;
            }

            try {
                // Check if the user can view their own submission.
                await AddonModAssign.getSubmissionStatus(this.assign.id, { cmId: this.module.id });
                this.canViewOwnSubmission = true;
            } catch (error) {
                this.canViewOwnSubmission = false;

                if (error.errorcode !== 'nopermission') {
                    throw error;
                }
            }
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Set group to see the summary.
     *
     * @param groupId Group ID.
     * @return Resolved when done.
     */
    async setGroup(groupId = 0): Promise<void> {
        this.group = groupId;

        const submissionStatus = await AddonModAssign.getSubmissionStatus(this.assign!.id, {
            groupId: this.group,
            cmId: this.module.id,
        });

        this.summary = submissionStatus.gradingsummary;
        if (!this.summary) {
            this.needsGradingAvailable = false;

            return;
        }

        if (this.summary?.warnofungroupedusers === true) {
            this.summary.warnofungroupedusers = 'ungroupedusers';
        } else {
            switch (this.summary?.warnofungroupedusers) {
                case AddonModAssignProvider.WARN_GROUPS_REQUIRED:
                    this.summary.warnofungroupedusers = 'ungroupedusers';
                    break;
                case AddonModAssignProvider.WARN_GROUPS_OPTIONAL:
                    this.summary.warnofungroupedusers = 'ungroupedusersoptional';
                    break;
                default:
                    this.summary.warnofungroupedusers = '';
                    break;
            }
        }

        this.needsGradingAvailable =
            (submissionStatus.gradingsummary?.submissionsneedgradingcount || 0) > 0 &&
            this.currentSite!.isVersionGreaterEqualThan('3.2');
    }

    /**
     * Go to view a list of submissions.
     *
     * @param status Status to see.
     * @param hasSubmissions If the status has any submission.
     */
    goToSubmissionList(status?: string, hasSubmissions = false): void {
        if (typeof status != 'undefined' && !hasSubmissions && this.showNumbers) {
            return;
        }

        const params: Params = {
            groupId: this.group || 0,
            moduleName: this.moduleName,
        };
        if (typeof status != 'undefined') {
            params.status = status;
        }

        CoreNavigator.navigateToSitePath(
            AddonModAssignModuleHandlerService.PAGE_NAME + `/${this.courseId}/${this.module.id}/submission`,
            {
                params,
            },
        );
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned by the sync function.
     * @return If succeed or not.
     */
    protected hasSyncSucceed(result: AddonModAssignSyncResult): boolean {
        if (result.updated) {
            this.submissionComponent?.invalidateAndRefresh(false);
        }

        return result.updated;
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModAssign.invalidateAssignmentData(this.courseId));

        if (this.assign) {
            promises.push(AddonModAssign.invalidateAllSubmissionData(this.assign.id));

            if (this.canViewAllSubmissions) {
                promises.push(AddonModAssign.invalidateSubmissionStatusData(this.assign.id, undefined, this.group));
            }
        }

        await Promise.all(promises).finally(() => {
            this.submissionComponent?.invalidateAndRefresh(true);
        });
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        this.submissionComponent?.ionViewDidEnter();
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        this.submissionComponent?.ionViewDidLeave();
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @return True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModAssignAutoSyncData): boolean {
        if (this.assign && syncEventData.assignId == this.assign.id) {
            if (syncEventData.warnings && syncEventData.warnings.length) {
                // Show warnings.
                CoreDomUtils.showErrorModal(syncEventData.warnings[0]);
            }

            return true;
        }

        return false;
    }

    /**
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected sync(): Promise<AddonModAssignSyncResult> {
        return AddonModAssignSync.syncAssign(this.assign!.id);
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.savedObserver?.off();
        this.submittedObserver?.off();
        this.gradedObserver?.off();
    }

}
