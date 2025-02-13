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
import { CoreError } from '@classes/errors/error';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import CoreCourseContentsPage from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreTimeUtils } from '@services/utils/time';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTime } from '@singletons/time';
import { AddonModAssignListFilterName } from '../../classes/submissions-source';
import {
    AddonModAssign,
    AddonModAssignAssign,
    AddonModAssignSubmissionGradingSummary,
} from '../../services/assign';
import { AddonModAssignOffline } from '../../services/assign-offline';
import {
    AddonModAssignAutoSyncData,
    AddonModAssignSync,
    AddonModAssignSyncResult,
} from '../../services/assign-sync';
import { AddonModAssignSubmissionComponent } from '../submission/submission';
import {
    ADDON_MOD_ASSIGN_AUTO_SYNCED,
    ADDON_MOD_ASSIGN_COMPONENT,
    ADDON_MOD_ASSIGN_GRADED_EVENT,
    ADDON_MOD_ASSIGN_PAGE_NAME,
    ADDON_MOD_ASSIGN_STARTED_EVENT,
    ADDON_MOD_ASSIGN_SUBMISSION_REMOVED_EVENT,
    ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT,
    ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
    ADDON_MOD_ASSIGN_WARN_GROUPS_OPTIONAL,
    ADDON_MOD_ASSIGN_WARN_GROUPS_REQUIRED,
} from '../../constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';

/**
 * Component that displays an assignment.
 */
@Component({
    selector: 'addon-mod-assign-index',
    templateUrl: 'addon-mod-assign-index.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        AddonModAssignSubmissionComponent,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModAssignIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    @ViewChild(AddonModAssignSubmissionComponent) submissionComponent?: AddonModAssignSubmissionComponent;

    component = ADDON_MOD_ASSIGN_COMPONENT;
    pluginName = 'assign';

    assign?: AddonModAssignAssign; // The assign object.
    canViewAllSubmissions = false; // Whether the user can view all submissions.
    canViewOwnSubmission = false; // Whether the user can view their own submission.
    timeRemaining?: string; // Message about time remaining to submit.
    lateSubmissions?: string; // Message about late submissions.
    summary?: AddonModAssignSubmissionGradingSummary; // The grading summary.
    needsGradingAvailable = false; // Whether we can see the submissions that need grading.

    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false,
        defaultGroupId: 0,
        canAccessAllGroups: false,
    };

    // Status.
    submissionStatusSubmitted = AddonModAssignListFilterName.SUBMITTED;
    submissionStatusDraft = AddonModAssignListFilterName.DRAFT;
    needGrading = AddonModAssignListFilterName.NEED_GRADING;

    protected currentUserId!: number; // Current user ID.
    protected currentSite!: CoreSite; // Current site.
    protected syncEventName = ADDON_MOD_ASSIGN_AUTO_SYNCED;

    // Observers.
    protected savedObserver?: CoreEventObserver;
    protected submittedObserver?: CoreEventObserver;
    protected gradedObserver?: CoreEventObserver;
    protected startedObserver?: CoreEventObserver;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModLessonIndexComponent', content, courseContentsPage);

        this.currentSite = CoreSites.getRequiredCurrentSite();
        this.currentUserId = this.currentSite.getUserId();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        // Listen to events.
        this.savedObserver = CoreEvents.on(
            ADDON_MOD_ASSIGN_SUBMISSION_SAVED_EVENT,
            (data) => {
                if (this.assign && data.assignmentId == this.assign.id && data.userId == this.currentUserId) {
                    // Assignment submission saved, refresh data.
                    this.showLoadingAndRefresh(true, false);
                }
            },
            this.siteId,
        );

        this.savedObserver = CoreEvents.on(
            ADDON_MOD_ASSIGN_SUBMISSION_REMOVED_EVENT,
            (data) => {
                if (this.assign && data.assignmentId == this.assign.id && data.userId == this.currentUserId) {
                    // Assignment submission removed, refresh data.
                    this.showLoadingAndRefresh(true, false);
                }
            },
            this.siteId,
        );

        this.submittedObserver = CoreEvents.on(
            ADDON_MOD_ASSIGN_SUBMITTED_FOR_GRADING_EVENT,
            (data) => {
                if (this.assign && data.assignmentId == this.assign.id && data.userId == this.currentUserId) {
                    // Assignment submitted, check completion.
                    this.checkCompletion();

                    // Reload data since it can have offline data now.
                    this.showLoadingAndRefresh(true, false);
                }
            },
            this.siteId,
        );

        this.gradedObserver = CoreEvents.on(ADDON_MOD_ASSIGN_GRADED_EVENT, (data) => {
            if (this.assign && data.assignmentId == this.assign.id && data.userId == this.currentUserId) {
                // Assignment graded, refresh data.
                this.showLoadingAndRefresh(true, false);
            }
        }, this.siteId);

        this.startedObserver = CoreEvents.on(ADDON_MOD_ASSIGN_STARTED_EVENT, (data) => {
            if (this.assign && data.assignmentId == this.assign.id) {
                // Assignment submission started, refresh data.
                this.showLoadingAndRefresh(false, false);
            }
        }, this.siteId);

        await this.loadContent(false, true);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {

        // Get assignment data.
        this.assign = await AddonModAssign.getAssignment(this.courseId, this.module.id);

        this.dataRetrieved.emit(this.assign);
        this.description = this.assign.intro;

        if (sync) {
            // Try to synchronize the assign.
            await CorePromiseUtils.ignoreErrors(this.syncActivity(showErrors));
        }

        // Check if there's any offline data for this assign.
        this.hasOffline = await AddonModAssignOffline.hasAssignOfflineData(this.assign.id);

        // Get assignment submissions.
        const submissions = await AddonModAssign.getSubmissions(this.assign.id, { cmId: this.module.id });
        const time = CoreTimeUtils.timestamp();

        this.canViewAllSubmissions = submissions.canviewsubmissions;

        if (submissions.canviewsubmissions) {

            // Calculate the messages to display about time remaining and late submissions.
            this.timeRemaining = '';
            this.lateSubmissions = '';

            if (this.assign.duedate > 0) {
                if (this.assign.duedate - time <= 0) {
                    this.timeRemaining = Translate.instant('addon.mod_assign.assignmentisdue');
                } else {
                    this.timeRemaining = CoreTime.formatTime(this.assign.duedate - time);
                }

                if (this.assign.duedate < time) {
                    if (this.assign.cutoffdate) {
                        if (this.assign.cutoffdate > time) {
                            this.lateSubmissions = Translate.instant(
                                'addon.mod_assign.latesubmissionsaccepted',
                                { $a: CoreTimeUtils.userDate(this.assign.cutoffdate * 1000) },
                            );
                        } else {
                            this.lateSubmissions = Translate.instant('addon.mod_assign.nomoresubmissionsaccepted');
                        }
                    }
                }
            }

            // Check if groupmode is enabled to avoid showing wrong numbers.
            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.assign.cmid, false);

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
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.assign) {
            return; // Shouldn't happen.
        }

        await CorePromiseUtils.ignoreErrors(AddonModAssign.logView(this.assign.id));

        this.analyticsLogEvent('mod_assign_view_assign');

        if (this.canViewAllSubmissions) {
            // User can see all submissions, log grading view.
            await CorePromiseUtils.ignoreErrors(AddonModAssign.logGradingView(this.assign.id));

            this.analyticsLogEvent('mod_assign_view_grading_table', { sendUrl: false });
        } else if (this.canViewOwnSubmission) {
            // User can only see their own submission, log view the user submission.
            await CorePromiseUtils.ignoreErrors(AddonModAssign.logSubmissionView(this.assign.id));

            this.analyticsLogEvent('mod_assign_view_submission_status', { sendUrl: false });
        }
    }

    /**
     * Set group to see the summary.
     *
     * @param groupId Group ID.
     * @returns Resolved when done.
     */
    async setGroup(groupId = 0): Promise<void> {
        this.group = groupId;

        if (!this.assign) {
            return;
        }

        const submissionStatus = await AddonModAssign.getSubmissionStatus(this.assign.id, {
            groupId: this.group,
            cmId: this.module.id,
        });

        this.summary = submissionStatus.gradingsummary;
        if (!this.summary) {
            this.needsGradingAvailable = false;

            return;
        }

        if (this.summary.warnofungroupedusers === true) {
            this.summary.warnofungroupedusers = 'ungroupedusers';
        } else {
            switch (this.summary.warnofungroupedusers) {
                case ADDON_MOD_ASSIGN_WARN_GROUPS_REQUIRED:
                    this.summary.warnofungroupedusers = 'ungroupedusers';
                    break;
                case ADDON_MOD_ASSIGN_WARN_GROUPS_OPTIONAL:
                    this.summary.warnofungroupedusers = 'ungroupedusersoptional';
                    break;
                default:
                    this.summary.warnofungroupedusers = '';
                    break;
            }
        }

        this.needsGradingAvailable = this.summary.submissionsneedgradingcount > 0;
    }

    /**
     * Go to view a list of submissions.
     *
     * @param status Status to see.
     * @param hasSubmissions If the status has any submission.
     */
    goToSubmissionList(status?: AddonModAssignListFilterName, hasSubmissions = false): void {
        if (status !== undefined && !hasSubmissions) {
            return;
        }

        const params: Params = {
            groupId: this.group || 0,
            moduleName: this.moduleName,
        };
        if (status !== undefined) {
            params.status = status;
        }

        CoreNavigator.navigateToSitePath(
            ADDON_MOD_ASSIGN_PAGE_NAME + `/${this.courseId}/${this.module.id}/submission`,
            {
                params,
            },
        );
    }

    /**
     * @inheritdoc
     */
    protected hasSyncSucceed(result: AddonModAssignSyncResult): boolean {
        if (result.updated) {
            this.submissionComponent?.invalidateAndRefresh(false);
        }

        return result.updated;
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModAssign.invalidateAssignmentData(this.courseId));
        // Invalidate before component becomes null.
        promises.push(this.submissionComponent?.invalidateAndRefresh(true) || Promise.resolve());

        if (this.assign) {
            promises.push(AddonModAssign.invalidateAllSubmissionData(this.assign.id));

            if (this.canViewAllSubmissions) {
                promises.push(AddonModAssign.invalidateSubmissionStatusData(this.assign.id, undefined, this.group));
            }
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModAssignAutoSyncData): boolean {
        if (!this.assign || syncEventData.assignId != this.assign.id) {
            return false;
        }

        if (syncEventData.warnings && syncEventData.warnings.length) {
            CoreAlerts.show({ message: syncEventData.warnings[0] });
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    protected async sync(): Promise<AddonModAssignSyncResult> {
        if (!this.assign) {
            throw new CoreError('Cannot sync without a assign.');
        }

        return AddonModAssignSync.syncAssign(this.assign.id);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.savedObserver?.off();
        this.submittedObserver?.off();
        this.gradedObserver?.off();
        this.startedObserver?.off();
    }

}
