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

import { Component, Input, Optional, Injector } from '@angular/core';
import { Content, ModalController, NavController, Platform } from 'ionic-angular';
import { CoreGroupInfo, CoreGroupsProvider } from '@providers/groups';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { AddonModWorkshopProvider } from '../../providers/workshop';
import { AddonModWorkshopHelperProvider } from '../../providers/helper';
import { AddonModWorkshopSyncProvider } from '../../providers/sync';
import { AddonModWorkshopOfflineProvider } from '../../providers/offline';

/**
 * Component that displays a workshop index page.
 */
@Component({
    selector: 'addon-mod-workshop-index',
    templateUrl: 'addon-mod-workshop-index.html',
})
export class AddonModWorkshopIndexComponent extends CoreCourseModuleMainActivityComponent {
    @Input() group = 0;

    component = AddonModWorkshopProvider.COMPONENT;
    moduleName = 'workshop';
    workshop: any;
    page = 0;
    access: any;
    phases: any;
    grades: any;
    assessments: any;
    userGrades: any;
    publishedSubmissions: any;
    submission: any;
    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false
    };
    canSubmit = false;
    canAssess = false;
    hasNextPage = false;

    workshopPhases = {
        PHASE_SETUP: AddonModWorkshopProvider.PHASE_SETUP,
        PHASE_SUBMISSION: AddonModWorkshopProvider.PHASE_SUBMISSION,
        PHASE_ASSESSMENT: AddonModWorkshopProvider.PHASE_ASSESSMENT,
        PHASE_EVALUATION: AddonModWorkshopProvider.PHASE_EVALUATION,
        PHASE_CLOSED: AddonModWorkshopProvider.PHASE_CLOSED
    };

    protected offlineSubmissions = [];
    protected obsSubmissionChanged: any;
    protected obsAssessmentSaved: any;
    protected appResumeSubscription: any;
    protected syncObserver: any;
    protected syncEventName = AddonModWorkshopSyncProvider.AUTO_SYNCED;

    constructor(injector: Injector, private workshopProvider: AddonModWorkshopProvider, @Optional() content: Content,
            private workshopOffline: AddonModWorkshopOfflineProvider, private groupsProvider: CoreGroupsProvider,
            protected navCtrl: NavController, private modalCtrl: ModalController, private utils: CoreUtilsProvider,
            platform: Platform, private workshopHelper: AddonModWorkshopHelperProvider,
            private workshopSync: AddonModWorkshopSyncProvider) {
        super(injector, content);

        // Listen to submission and assessment changes.
        this.obsSubmissionChanged = this.eventsProvider.on(AddonModWorkshopProvider.SUBMISSION_CHANGED, (data) => {
            this.eventReceived(data);
        }, this.siteId);

        // Listen to submission and assessment changes.
        this.obsAssessmentSaved = this.eventsProvider.on(AddonModWorkshopProvider.ASSESSMENT_SAVED, (data) => {
            this.eventReceived(data);
        }, this.siteId);

        // Since most actions will take the user out of the app, we should refresh the view when the app is resumed.
        this.appResumeSubscription = platform.resume.subscribe(() => {
            this.showLoadingAndRefresh(true);
        });

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
        super.ngOnInit();

        this.loadContent(false, true).then(() => {
            if (!this.workshop) {
                return;
            }

            this.workshopProvider.logView(this.workshop.id, this.workshop.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch((error) => {
                // Ignore errors.
            });
        });
    }

    /**
     * Function called when we receive an event of submission changes.
     *
     * @param {any} data Data received by the event.
     */
    protected eventReceived(data: any): void {
        if ((this.workshop && this.workshop.id === data.workshopId) || data.cmId === this.module.id) {
            this.showLoadingAndRefresh(true);

            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.workshopProvider.invalidateWorkshopData(this.courseId));
        if (this.workshop) {
            promises.push(this.workshopProvider.invalidateWorkshopAccessInformationData(this.workshop.id));
            promises.push(this.workshopProvider.invalidateUserPlanPhasesData(this.workshop.id));
            if (this.canSubmit) {
                promises.push(this.workshopProvider.invalidateSubmissionsData(this.workshop.id));
            }
            if (this.access.canviewallsubmissions) {
                promises.push(this.workshopProvider.invalidateGradeReportData(this.workshop.id));
                promises.push(this.groupsProvider.invalidateActivityAllowedGroups(this.workshop.coursemodule));
                promises.push(this.groupsProvider.invalidateActivityGroupMode(this.workshop.coursemodule));
            }
            if (this.canAssess) {
                promises.push(this.workshopProvider.invalidateReviewerAssesmentsData(this.workshop.id));
            }
            promises.push(this.workshopProvider.invalidateGradesData(this.workshop.id));
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
        if (this.workshop && syncEventData.workshopId == this.workshop.id) {
            // Refresh the data.
            this.domUtils.scrollToTop(this.content);

            return true;
        }

        return false;
    }

    /**
     * Download feedback contents.
     *
     * @param  {boolean}      [refresh=false]    If it's refreshing content.
     * @param  {boolean}      [sync=false]       If it should try to sync.
     * @param  {boolean}      [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        return this.workshopProvider.getWorkshop(this.courseId, this.module.id).then((workshop) => {
            this.workshop = workshop;

            this.description = workshop.intro || workshop.description;
            this.dataRetrieved.emit(workshop);

            if (sync) {
                // Try to synchronize the feedback.
                return this.syncActivity(showErrors);
            }
        }).then(() => {
            // Check if there are answers stored in offline.
            return this.workshopProvider.getWorkshopAccessInformation(this.workshop.id);
        }).then((accessData) => {
            this.access = accessData;

            if (accessData.canviewallsubmissions) {
                return this.groupsProvider.getActivityGroupInfo(this.workshop.coursemodule).then((groupInfo) => {
                    this.groupInfo = groupInfo;
                    this.group = this.groupsProvider.validateGroupId(this.group, groupInfo);
                });
            }
        }).then(() => {
            return this.workshopProvider.getUserPlanPhases(this.workshop.id);
        }).then((phases) => {
            this.phases = phases;

            phases[this.workshop.phase].tasks.forEach((task) => {
                if (!task.link && (task.code == 'examples' || task.code == 'prepareexamples')) {
                    // Add links to manage examples.
                    task.link = this.externalUrl;
                }
            });

            // Check if there are info stored in offline.
            return this.workshopOffline.hasWorkshopOfflineData(this.workshop.id).then((hasOffline) => {
                this.hasOffline = hasOffline;
                if (hasOffline) {
                    return this.workshopOffline.getSubmissions(this.workshop.id).then((submissionsActions) => {
                        this.offlineSubmissions = submissionsActions;
                    });
                } else {
                    this.offlineSubmissions = [];
                }
            });
        }).then(() => {
            return this.setPhaseInfo();
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Retrieves and shows submissions grade page.
     *
     * @param  {number}       page Page number to be retrieved.
     * @return {Promise<any>}      Resolved when done.
     */
    gotoSubmissionsPage(page: number): Promise<any> {
        return this.workshopProvider.getGradesReport(this.workshop.id, this.group, page).then((report) => {
            const numEntries = (report && report.grades && report.grades.length) || 0;

            this.page = page;

            this.hasNextPage = numEntries >= AddonModWorkshopProvider.PER_PAGE && ((this.page  + 1) *
                AddonModWorkshopProvider.PER_PAGE) < report.totalcount;

            this.grades =  report.grades || [];

            this.grades.forEach((submission) => {
                const actions = this.workshopHelper.filterSubmissionActions(this.offlineSubmissions, submission.submissionid
                    || false);
                submission = this.workshopHelper.applyOfflineData(submission, actions);

                return this.workshopHelper.applyOfflineData(submission, actions).then((offlineSubmission) => {
                    submission = offlineSubmission;
                });
            });
        });
    }

    /**
     * Open task.
     *
     * @param {any} task Task to be done.
     */
    runTask(task: any): void {
        if (task.code == 'submit') {
            this.gotoSubmit();
        } else if (task.link) {
            this.utils.openInBrowser(task.link);
        }
    }

    /**
     * Go to submit page.
     */
    gotoSubmit(): void {
        if (this.canSubmit && ((this.access.creatingsubmissionallowed && !this.submission) ||
                (this.access.modifyingsubmissionallowed && this.submission))) {
            const params = {
                module: this.module,
                access: this.access,
                courseId: this.courseId,
                submissionId: this.submission && this.submission.id
            };

            this.navCtrl.push('AddonModWorkshopEditSubmissionPage', params);
        }
    }

    /**
     * View Phase info.
     */
    viewPhaseInfo(): void {
        if (this.phases) {
            const modal = this.modalCtrl.create('AddonModWorkshopPhaseInfoPage', {
                    phases: this.utils.objectToArray(this.phases),
                    workshopPhase: this.workshop.phase,
                    externalUrl: this.externalUrl
                });
            modal.onDidDismiss((goSubmit) => {
                goSubmit && this.gotoSubmit();
            });
            modal.present();
        }
    }

    /**
     * Set group to see the workshop.
     * @param {number} groupId Group Id.
     * @return {Promise<any>}  Promise resolved when done.
     */
    setGroup(groupId: number): Promise<any> {
        this.group = groupId;

        return this.gotoSubmissionsPage(0);
    }

    /**
     * Convenience function to set current phase information.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected setPhaseInfo(): Promise<any> {
        this.submission = false;
        this.canAssess = false;
        this.assessments = false;
        this.userGrades = false;
        this.publishedSubmissions = false;

        this.canSubmit = this.workshopHelper.canSubmit(this.workshop, this.access,
            this.phases[AddonModWorkshopProvider.PHASE_SUBMISSION].tasks);

        const promises = [];

        if (this.canSubmit) {
            promises.push(this.workshopHelper.getUserSubmission(this.workshop.id).then((submission) => {
                const actions = this.workshopHelper.filterSubmissionActions(this.offlineSubmissions, submission.id || false);

                return this.workshopHelper.applyOfflineData(submission, actions).then((submission) => {
                    this.submission = submission;
                });
            }));
        }

        if (this.access.canviewallsubmissions && this.workshop.phase >= AddonModWorkshopProvider.PHASE_SUBMISSION) {
            promises.push(this.gotoSubmissionsPage(this.page));
        }

        let assessPromise = Promise.resolve();

        if (this.workshop.phase >= AddonModWorkshopProvider.PHASE_ASSESSMENT) {
            this.canAssess = this.workshopHelper.canAssess(this.workshop, this.access);
            if (this.canAssess) {
                assessPromise = this.workshopHelper.getReviewerAssessments(this.workshop.id).then((assessments) => {
                    const p2 = [];

                    assessments.forEach((assessment) => {
                        assessment.strategy = this.workshop.strategy;
                        if (this.hasOffline) {
                            p2.push(this.workshopOffline.getAssessment(this.workshop.id, assessment.id)
                                .then((offlineAssessment) => {
                                    assessment.offline = true;
                                    assessment.timemodified = Math.floor(offlineAssessment.timemodified / 1000);
                            }).catch(() => {
                                // Ignore errors.
                            }));
                        }
                    });

                    return Promise.all(p2).then(() => {
                        this.assessments = assessments;
                    });
                });
                promises.push(assessPromise);
            }
        }

        if (this.workshop.phase == AddonModWorkshopProvider.PHASE_CLOSED) {
            promises.push(this.workshopProvider.getGrades(this.workshop.id).then((grades) => {
                this.userGrades = grades.submissionlongstrgrade || grades.assessmentlongstrgrade ? grades : false;
            }));

            if (this.access.canviewpublishedsubmissions) {
                promises.push(assessPromise.then(() => {
                    return this.workshopProvider.getSubmissions(this.workshop.id).then((submissions) => {
                        this.publishedSubmissions = submissions.filter((submission) => {
                            if (submission.published) {
                                this.assessments.forEach((assessment) => {
                                    submission.reviewedby = [];
                                    if (assessment.submissionid == submission.id) {
                                        submission.reviewedby.push(this.workshopHelper.realGradeValue(this.workshop, assessment));
                                    }
                                });

                                return true;
                            }

                            return false;
                        });
                    });
                }));
            }
        }

        return Promise.all(promises);
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.workshopSync.syncWorkshop(this.workshop.id);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param  {any}     result Data returned on the sync function.
     * @return {boolean}        If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return result.updated;
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
        this.obsSubmissionChanged && this.obsSubmissionChanged.off();
        this.obsAssessmentSaved && this.obsAssessmentSaved.off();
        this.appResumeSubscription && this.appResumeSubscription.unsubscribe();
    }
}
