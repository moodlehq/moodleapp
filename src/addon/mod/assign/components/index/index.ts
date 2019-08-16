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

import { Component, Optional, Injector, ViewChild } from '@angular/core';
import { Content, NavController } from 'ionic-angular';
import { CoreGroupsProvider, CoreGroupInfo } from '@providers/groups';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { AddonModAssignProvider } from '../../providers/assign';
import { AddonModAssignHelperProvider } from '../../providers/helper';
import { AddonModAssignOfflineProvider } from '../../providers/assign-offline';
import { AddonModAssignSyncProvider } from '../../providers/assign-sync';
import { AddonModAssignSubmissionComponent } from '../submission/submission';

/**
 * Component that displays an assignment.
 */
@Component({
    selector: 'addon-mod-assign-index',
    templateUrl: 'addon-mod-assign-index.html',
})
export class AddonModAssignIndexComponent extends CoreCourseModuleMainActivityComponent {
    @ViewChild(AddonModAssignSubmissionComponent) submissionComponent: AddonModAssignSubmissionComponent;

    component = AddonModAssignProvider.COMPONENT;
    moduleName = 'assign';

    assign: any; // The assign object.
    canViewAllSubmissions: boolean; // Whether the user can view all submissions.
    canViewOwnSubmission: boolean; // Whether the user can view their own submission.
    timeRemaining: string; // Message about time remaining to submit.
    lateSubmissions: string; // Message about late submissions.
    showNumbers = true; // Whether to show number of submissions with each status.
    summary: any; // The summary.
    needsGradingAvalaible: boolean; // Whether we can see the submissions that need grading.

    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false
    };

    // Status.
    submissionStatusSubmitted = AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED;
    submissionStatusDraft = AddonModAssignProvider.SUBMISSION_STATUS_DRAFT;
    needGrading = AddonModAssignProvider.NEED_GRADING;

    protected userId: number; // Current user ID.
    protected syncEventName = AddonModAssignSyncProvider.AUTO_SYNCED;

    // Observers.
    protected savedObserver;
    protected submittedObserver;
    protected gradedObserver;

    constructor(injector: Injector, protected assignProvider: AddonModAssignProvider, @Optional() content: Content,
            protected assignHelper: AddonModAssignHelperProvider, protected assignOffline: AddonModAssignOfflineProvider,
            protected syncProvider: AddonModAssignSyncProvider, protected timeUtils: CoreTimeUtilsProvider,
            protected groupsProvider: CoreGroupsProvider, protected navCtrl: NavController) {
        super(injector, content);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.userId = this.sitesProvider.getCurrentSiteUserId();

        this.loadContent(false, true).then(() => {
            this.assignProvider.logView(this.assign.id, this.assign.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch(() => {
                // Ignore errors.
            });

            if (this.canViewAllSubmissions) {
                // User can see all submissions, log grading view.
                this.assignProvider.logGradingView(this.assign.id, this.assign.name).catch(() => {
                    // Ignore errors.
                });
            } else if (this.canViewOwnSubmission) {
                // User can only see their own submission, log view the user submission.
                this.assignProvider.logSubmissionView(this.assign.id, this.assign.name).catch(() => {
                    // Ignore errors.
                });
            }
        });

        // Listen to events.
        this.savedObserver = this.eventsProvider.on(AddonModAssignProvider.SUBMISSION_SAVED_EVENT, (data) => {
            if (this.assign && data.assignmentId == this.assign.id && data.userId == this.userId) {
                // Assignment submission saved, refresh data.
                this.showLoadingAndRefresh(true, false);
            }
        }, this.siteId);

        this.submittedObserver = this.eventsProvider.on(AddonModAssignProvider.SUBMITTED_FOR_GRADING_EVENT, (data) => {
            if (this.assign && data.assignmentId == this.assign.id && data.userId == this.userId) {
                // Assignment submitted, check completion.
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);

                // Reload data since it can have offline data now.
                this.showLoadingAndRefresh(true, false);
            }
        }, this.siteId);

        this.gradedObserver = this.eventsProvider.on(AddonModAssignProvider.GRADED_EVENT, (data) => {
            if (this.assign && data.assignmentId == this.assign.id && data.userId == this.userId) {
                // Assignment graded, refresh data.
                this.showLoadingAndRefresh(true, false);
            }
        }, this.siteId);
    }

    /**
     * Expand the description.
     */
    expandDescription(ev?: Event): void {
        ev && ev.preventDefault();
        ev && ev.stopPropagation();

        if (this.assign && (this.description || this.assign.introattachments)) {
            this.textUtils.expandText(this.translate.instant('core.description'), this.description, this.component,
                    this.module.id, this.assign.introattachments);
        }
    }

    /**
     * Get assignment data.
     *
     * @param {boolean} [refresh=false] If it's refreshing content.
     * @param {boolean} [sync=false] If it should try to sync.
     * @param {boolean} [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {

        // Get assignment data.
        return this.assignProvider.getAssignment(this.courseId, this.module.id).then((assignData) => {
            this.assign = assignData;

            this.dataRetrieved.emit(this.assign);
            this.description = this.assign.intro || this.description;

            if (sync) {
                // Try to synchronize the assign.
                return this.syncActivity(showErrors).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Check if there's any offline data for this assign.
            return this.assignOffline.hasAssignOfflineData(this.assign.id);
        }).then((hasOffline) => {
            this.hasOffline = hasOffline;

            // Get assignment submissions.
            return this.assignProvider.getSubmissions(this.assign.id).then((data) => {
                const time = this.timeUtils.timestamp();

                this.canViewAllSubmissions = data.canviewsubmissions;

                if (data.canviewsubmissions) {

                    // Calculate the messages to display about time remaining and late submissions.
                    if (this.assign.duedate > 0) {
                        if (this.assign.duedate - time <= 0) {
                            this.timeRemaining = this.translate.instant('addon.mod_assign.assignmentisdue');
                        } else {
                            this.timeRemaining = this.timeUtils.formatDuration(this.assign.duedate - time, 3);

                            if (this.assign.cutoffdate) {
                                if (this.assign.cutoffdate > time) {
                                    this.lateSubmissions = this.translate.instant('addon.mod_assign.latesubmissionsaccepted',
                                            {$a: this.timeUtils.userDate(this.assign.cutoffdate * 1000)});
                                } else {
                                    this.lateSubmissions = this.translate.instant('addon.mod_assign.nomoresubmissionsaccepted');
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
                    return this.groupsProvider.getActivityGroupInfo(this.assign.cmid, false).then((groupInfo) => {
                        this.groupInfo = groupInfo;
                        this.showNumbers = groupInfo.groups.length == 0 ||
                            this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.5');

                        return this.setGroup(this.group || (groupInfo.groups && groupInfo.groups[0] && groupInfo.groups[0].id) ||
                            0);
                    });
                }

                // Check if the user can view their own submission.
                return this.assignProvider.getSubmissionStatus(this.assign.id).then(() => {
                    this.canViewOwnSubmission = true;
                }).catch((error) => {
                    this.canViewOwnSubmission = false;

                    if (error.errorcode !== 'nopermission') {
                        return Promise.reject(error);
                    }
                });
            });
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Set group to see the summary.
     *
     * @param  {number}       groupId Group ID.
     * @return {Promise<any>}         Resolved when done.
     */
    setGroup(groupId: number): Promise<any> {
        this.group = groupId;

        return this.assignProvider.getSubmissionStatus(this.assign.id, undefined, this.group).then((response) => {
            this.summary = response.gradingsummary;

            this.needsGradingAvalaible = response.gradingsummary && response.gradingsummary.submissionsneedgradingcount > 0 &&
                    this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.2');
        });
    }

    /**
     * Go to view a list of submissions.
     *
     * @param {string} status Status to see.
     * @param {number} count Number of submissions with the status.
     */
    goToSubmissionList(status: string, count: number): void {
        if (typeof status == 'undefined') {
            this.navCtrl.push('AddonModAssignSubmissionListPage', {
                courseId: this.courseId,
                groupId: this.group || 0,
                moduleId: this.module.id,
                moduleName: this.moduleName
            });
        } else if (count || !this.showNumbers) {
            this.navCtrl.push('AddonModAssignSubmissionListPage', {
                status: status,
                courseId: this.courseId,
                groupId: this.group || 0,
                moduleId: this.module.id,
                moduleName: this.moduleName
            });
        }
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param {any} result Data returned by the sync function.
     * @return {boolean} If succeed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        if (result.updated) {
            this.submissionComponent && this.submissionComponent.invalidateAndRefresh();
        }

        return result.updated;
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.assignProvider.invalidateAssignmentData(this.courseId));

        if (this.assign) {
            promises.push(this.assignProvider.invalidateAllSubmissionData(this.assign.id));

            if (this.canViewAllSubmissions) {
                promises.push(this.assignProvider.invalidateSubmissionStatusData(this.assign.id, undefined, this.group));
            }
        }

        return Promise.all(promises).finally(() => {
            this.submissionComponent && this.submissionComponent.invalidateAndRefresh();
        });
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        this.submissionComponent && this.submissionComponent.ionViewDidEnter();
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        this.submissionComponent && this.submissionComponent.ionViewDidLeave();
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param {any} syncEventData Data receiven on sync observer.
     * @return {boolean}          True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        if (this.assign && syncEventData.assignId == this.assign.id) {
            if (syncEventData.warnings && syncEventData.warnings.length) {
                // Show warnings.
                this.domUtils.showErrorModal(syncEventData.warnings[0]);
            }

            return true;
        }

        return false;
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.syncProvider.syncAssign(this.assign.id);
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.savedObserver && this.savedObserver.off();
        this.submittedObserver && this.submittedObserver.off();
        this.gradedObserver && this.gradedObserver.off();
    }
}
