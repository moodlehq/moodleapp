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

import { Component, Optional, Injector, Input, ViewChild } from '@angular/core';
import { Content, NavController } from 'ionic-angular';
import { CoreGroupsProvider, CoreGroupInfo } from '@providers/groups';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModLessonProvider } from '../../providers/lesson';
import { AddonModLessonOfflineProvider } from '../../providers/lesson-offline';
import { AddonModLessonSyncProvider } from '../../providers/lesson-sync';
import { AddonModLessonPrefetchHandler } from '../../providers/prefetch-handler';
import { CoreConstants } from '@core/constants';
import { CoreTabsComponent } from '@components/tabs/tabs';

/**
 * Component that displays a lesson entry page.
 */
@Component({
    selector: 'addon-mod-lesson-index',
    templateUrl: 'addon-mod-lesson-index.html',
})
export class AddonModLessonIndexComponent extends CoreCourseModuleMainActivityComponent {
    @ViewChild(CoreTabsComponent) tabsComponent: CoreTabsComponent;

    @Input() group: number; // The group to display.
    @Input() action: string; // The "action" to display first.

    component = AddonModLessonProvider.COMPONENT;
    moduleName = 'lesson';

    lesson: any; // The lesson.
    selectedTab: number; // The initial selected tab.
    askPassword: boolean; // Whether to ask the password.
    canManage: boolean; // Whether the user can manage the lesson.
    canViewReports: boolean; // Whether the user can view the lesson reports.
    showSpinner: boolean; // Whether to display a spinner.
    hasOffline: boolean; // Whether there's offline data.
    retakeToReview: any; // A retake to review.
    preventMessages: string[]; // List of messages that prevent the lesson from being seen.
    leftDuringTimed: boolean; // Whether the user has started and left a retake.
    groupInfo: CoreGroupInfo; // The group info.
    reportLoaded: boolean; // Whether the report data has been loaded.
    selectedGroupName: string; // The name of the selected group.
    overview: any; // Reports overview data.
    finishedOffline: boolean; // Whether a retake was finished in offline.

    protected syncEventName = AddonModLessonSyncProvider.AUTO_SYNCED;
    protected accessInfo: any; // Lesson access info.
    protected password: string; // The password for the lesson.
    protected hasPlayed: boolean; // Whether the user has gone to the lesson player (attempted).
    protected dataSentObserver; // To detect data sent to server.
    protected dataSent = false; // Whether some data was sent to server while playing the lesson.

    constructor(injector: Injector, protected lessonProvider: AddonModLessonProvider, @Optional() content: Content,
            protected groupsProvider: CoreGroupsProvider, protected lessonOffline: AddonModLessonOfflineProvider,
            protected lessonSync: AddonModLessonSyncProvider, protected utils: CoreUtilsProvider,
            protected prefetchHandler: AddonModLessonPrefetchHandler, protected navCtrl: NavController,
            protected timeUtils: CoreTimeUtilsProvider, protected userProvider: CoreUserProvider) {
        super(injector, content);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.selectedTab = this.action == 'report' ? 1 : 0;

        this.loadContent(false, true).then(() => {
            if (!this.lesson || (this.preventMessages && this.preventMessages.length)) {
                return;
            }

            this.logView();
        });
    }

    /**
     * Change the group displayed.
     *
     * @param {number} groupId Group ID to display.
     */
    changeGroup(groupId: number): void {
        this.reportLoaded = false;

        this.setGroup(groupId).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting report.');
        }).finally(() => {
            this.reportLoaded = true;
        });
    }

    /**
     * Get the lesson data.
     *
     * @param {boolean} [refresh=false] If it's refreshing content.
     * @param {boolean} [sync=false] If it should try to sync.
     * @param {boolean} [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {

        let lessonReady = true;
        this.askPassword = false;

        return this.lessonProvider.getLesson(this.courseId, this.module.id).then((lessonData) => {
            this.lesson = lessonData;

            this.dataRetrieved.emit(this.lesson);
            this.description = this.lesson.intro; // Show description only if intro is present.

            if (sync) {
                // Try to synchronize the lesson.
                return this.syncActivity(showErrors);
            }
        }).then(() => {
            return this.lessonProvider.getAccessInformation(this.lesson.id);
        }).then((info) => {
            const promises = [];

            this.accessInfo = info;
            this.canManage = info.canmanage;
            this.canViewReports = info.canviewreports;
            this.preventMessages = [];

            if (this.lessonProvider.isLessonOffline(this.lesson)) {
                // Handle status.
                this.setStatusListener();

                // Check if there is offline data.
                promises.push(this.lessonSync.hasDataToSync(this.lesson.id, info.attemptscount).then((hasOffline) => {
                    this.hasOffline = hasOffline;
                }));

                // Check if there is a retake finished in a synchronization.
                promises.push(this.lessonSync.getRetakeFinishedInSync(this.lesson.id).then((retake) => {
                    if (retake && retake.retake == info.attemptscount - 1) {
                        // The retake finished is still the last retake. Allow reviewing it.
                        this.retakeToReview = retake;
                    } else {
                        this.retakeToReview = undefined;
                        if (retake) {
                            this.lessonSync.deleteRetakeFinishedInSync(this.lesson.id);
                        }
                    }
                }));

                // Check if the ser has a finished retake in offline.
                promises.push(this.lessonOffline.hasFinishedRetake(this.lesson.id).then((finished) => {
                    this.finishedOffline = finished;
                }));

                // Update the list of content pages viewed and question attempts.
                promises.push(this.lessonProvider.getContentPagesViewedOnline(this.lesson.id, info.attemptscount));
                promises.push(this.lessonProvider.getQuestionsAttemptsOnline(this.lesson.id, info.attemptscount));
            }

            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                let preventReason = this.lessonProvider.getPreventAccessReason(info, false);
                const askPassword = preventReason.reason == 'passwordprotectedlesson';

                if (askPassword) {
                    // The lesson requires a password. Check if there is one in memory or DB.
                    const promise = this.password ? Promise.resolve(this.password) :
                            this.lessonProvider.getStoredPassword(this.lesson.id);

                    promises.push(promise.then((password) => {
                        return this.validatePassword(password);
                    }).then(() => {
                        // Now that we have the password, get the access reason again ignoring the password.
                        preventReason = this.lessonProvider.getPreventAccessReason(info, true);
                        if (preventReason) {
                            this.preventMessages = [preventReason];
                        }
                    }).catch(() => {
                        // No password or the validation failed. Show password form.
                        this.askPassword = true;
                        this.preventMessages = [preventReason];
                        lessonReady = false;
                    }));
                } else  {
                    // Lesson cannot be started.
                    this.preventMessages = [preventReason];
                    lessonReady = false;
                }
            }

            if (this.selectedTab == 1 && this.canViewReports) {
                // Only fetch the report data if the tab is selected.
                promises.push(this.fetchReportData());
            }

            return Promise.all(promises).then(() => {
                if (lessonReady) {
                    // Lesson can be started, don't ask the password and don't show prevent messages.
                    this.lessonReady(refresh);
                }
            });
        });
    }

    /**
     * Fetch the reports data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchReportData(): Promise<any> {
        return this.groupsProvider.getActivityGroupInfo(this.module.id).then((groupInfo) => {
            this.groupInfo = groupInfo;

            return this.setGroup(this.group || 0);
        }).finally(() => {
            this.reportLoaded = true;
        });
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param {any} result Data returned on the sync function.
     * @return {boolean} If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        if (result.updated || this.dataSent) {
            // Check completion status if something was sent.
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }

        this.dataSent = false;

        return result.updated;
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        this.tabsComponent && this.tabsComponent.ionViewDidEnter();

        // Update data when we come back from the player since the status could have changed.
        if (this.hasPlayed) {
            this.hasPlayed = false;

            this.dataSentObserver && this.dataSentObserver.off(); // Stop listening for changes.
            this.dataSentObserver = undefined;

            // Refresh data.
            this.showLoadingAndRefresh(true, false);
        }
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        this.tabsComponent && this.tabsComponent.ionViewDidLeave();

        if (this.navCtrl.getActive().component.name == 'AddonModLessonPlayerPage') {
            this.hasPlayed = true;

            // Detect if anything was sent to server.
            this.dataSentObserver && this.dataSentObserver.off();

            this.dataSentObserver = this.eventsProvider.on(AddonModLessonProvider.DATA_SENT_EVENT, (data) => {
                // Ignore launch sending because it only affects timers.
                if (data.lessonId === this.lesson.id && data.type != 'launch') {
                    this.dataSent = true;
                }
            }, this.siteId);
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.lessonProvider.invalidateLessonData(this.courseId));

        if (this.lesson) {
            promises.push(this.lessonProvider.invalidateAccessInformation(this.lesson.id));
            promises.push(this.lessonProvider.invalidatePages(this.lesson.id));
            promises.push(this.lessonProvider.invalidateLessonWithPassword(this.lesson.id));
            promises.push(this.lessonProvider.invalidateTimers(this.lesson.id));
            promises.push(this.lessonProvider.invalidateContentPagesViewed(this.lesson.id));
            promises.push(this.lessonProvider.invalidateQuestionsAttempts(this.lesson.id));
            promises.push(this.lessonProvider.invalidateRetakesOverview(this.lesson.id));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.module.id));
        }

        return Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param {any} syncEventData Data receiven on sync observer.
     * @return {boolean} True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        return this.lesson && syncEventData.lessonId == this.lesson.id;
    }

    /**
     * Function called when the lesson is ready to be seen (no pending prevent access reasons).
     *
     * @param {boolean} [refresh=false] If it's refreshing content.
     */
    protected lessonReady(refresh?: boolean): void {
        this.askPassword = false;
        this.leftDuringTimed = this.hasOffline || this.lessonProvider.leftDuringTimed(this.accessInfo);

        if (this.password) {
            // Store the password in DB.
            this.lessonProvider.storePassword(this.lesson.id, this.password);
        }

        // All data obtained, now fill the context menu.
        this.fillContextMenu(refresh);
    }

    /**
     * Log viewing the lesson.
     */
    protected logView(): void {
        this.lessonProvider.logViewLesson(this.lesson.id, this.password, this.lesson.name).then(() => {
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }).catch((error) => {
            // Ignore errors.
        });
    }

    /**
     * Open the lesson player.
     *
     * @param  {boolean} continueLast Whether to continue the last retake.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected playLesson(continueLast: boolean): Promise<any> {
        // Calculate the pageId to load. If there is timelimit, lesson is always restarted from the start.
        let promise;

        if (this.hasOffline) {
            if (continueLast) {
                promise = this.lessonProvider.getLastPageSeen(this.lesson.id, this.accessInfo.attemptscount);
            } else {
                promise = Promise.resolve(this.accessInfo.firstpageid);
            }
        } else if (this.leftDuringTimed && !this.lesson.timelimit) {
            promise = Promise.resolve(continueLast ? this.accessInfo.lastpageseen : this.accessInfo.firstpageid);
        } else {
            promise = Promise.resolve();
        }

        return promise.then((pageId) => {
            this.navCtrl.push('AddonModLessonPlayerPage', {
                courseId: this.courseId,
                lessonId: this.lesson.id,
                pageId: pageId,
                password: this.password
            });
        });
    }

    /**
     * Reports tab selected.
     */
    reportsSelected(): void {
        if (!this.groupInfo) {
            this.fetchReportData().catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'Error getting report.');
            });
        }
    }

    /**
     * Review the lesson.
     */
    review(): void {
        if (!this.retakeToReview) {
            // No retake to review, stop.
            return;
        }

        this.navCtrl.push('AddonModLessonPlayerPage', {
            courseId: this.courseId,
            lessonId: this.lesson.id,
            pageId: this.retakeToReview.pageid,
            password: this.password,
            review: true,
            retake: this.retakeToReview.retake
        });
    }

    /**
     * Set a group to view the reports.
     *
     * @param  {number} groupId Group ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected setGroup(groupId: number): Promise<any> {
        this.group = groupId;
        this.selectedGroupName = '';

        // Search the name of the group if it isn't all participants.
        if (groupId && this.groupInfo && this.groupInfo.groups) {
            for (let i = 0; i < this.groupInfo.groups.length; i++) {
                const group = this.groupInfo.groups[i];
                if (groupId == group.id) {
                    this.selectedGroupName = group.name;
                    break;
                }
            }
        }

        // Get the overview of retakes for the group.
        return this.lessonProvider.getRetakesOverview(this.lesson.id, groupId).then((data) => {
            const promises = [];

            // Format times and grades.
            if (data && data.avetime != null && data.numofattempts) {
                data.avetime = Math.floor(data.avetime / data.numofattempts);
                data.avetimeReadable = this.timeUtils.formatTime(data.avetime);
            }

            if (data && data.hightime != null) {
                data.hightimeReadable = this.timeUtils.formatTime(data.hightime);
            }

            if (data && data.lowtime != null) {
                data.lowtimeReadable = this.timeUtils.formatTime(data.lowtime);
            }

            if (data && data.lessonscored) {
                if (data.numofattempts) {
                    data.avescore = this.textUtils.roundToDecimals(data.avescore, 2);
                }
                if (data.highscore != null) {
                    data.highscore = this.textUtils.roundToDecimals(data.highscore, 2);
                }
                if (data.lowscore != null) {
                    data.lowscore = this.textUtils.roundToDecimals(data.lowscore, 2);
                }
            }

            if (data && data.students) {
                // Get the user data for each student returned.
                data.students.forEach((student) => {
                    student.bestgrade = this.textUtils.roundToDecimals(student.bestgrade, 2);

                    promises.push(this.userProvider.getProfile(student.id, this.courseId, true).then((user) => {
                        student.profileimageurl = user.profileimageurl;
                    }).catch(() => {
                        // Error getting profile, resolve promise without adding any extra data.
                    }));
                });
            }

            return this.utils.allPromises(promises).catch(() => {
                // Shouldn't happen.
            }).then(() => {
                this.overview = data;
            });
        });
    }

    /**
     * Displays some data based on the current status.
     *
     * @param {string} status The current status.
     * @param {string} [previousStatus] The previous status. If not defined, there is no previous status.
     */
    protected showStatus(status: string, previousStatus?: string): void {
        this.showSpinner = status == CoreConstants.DOWNLOADING;
    }

    /**
     * Start the lesson.
     *
     * @param {boolean} [continueLast] Whether to continue the last attempt.
     */
    start(continueLast?: boolean): void {
        if (this.showSpinner) {
            // Lesson is being downloaded, abort.
            return;
        }

        if (this.lessonProvider.isLessonOffline(this.lesson)) {
            // Lesson supports offline, check if it needs to be downloaded.
            if (this.currentStatus != CoreConstants.DOWNLOADED) {
                // Prefetch the lesson.
                this.showSpinner = true;

                this.prefetchHandler.prefetch(this.module, this.courseId, true).then(() => {
                    // Success downloading, open lesson.
                    this.playLesson(continueLast);
                }).catch((error) => {
                    if (this.hasOffline) {
                        // Error downloading but there is something offline, allow continuing it.
                        this.playLesson(continueLast);
                    } else {
                        this.domUtils.showErrorModalDefault(error, 'core.errordownloading', true);
                    }
                }).finally(() => {
                    this.showSpinner = false;
                });
            } else {
                // Already downloaded, open it.
                this.playLesson(continueLast);
            }
        } else {
            this.playLesson(continueLast);
        }
    }

    /**
     * Submit password for password protected lessons.
     *
     * @param {Event} e Event.
     * @param {HTMLInputElement} passwordEl The password input.
     */
    submitPassword(e: Event, passwordEl: HTMLInputElement): void {
        e.preventDefault();
        e.stopPropagation();

        const password = passwordEl && passwordEl.value;
        if (!password) {
            this.domUtils.showErrorModal('addon.mod_lesson.emptypassword', true);

            return;
        }

        this.loaded = false;
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';

        this.validatePassword(password).then(() => {
            // Password validated.
            this.lessonReady(false);

            // Now that we have the password, get the access reason again ignoring the password.
            const preventReason = this.lessonProvider.getPreventAccessReason(this.accessInfo, true);
            if (preventReason) {
                this.preventMessages = [preventReason];
            } else {
                this.preventMessages = [];
            }

            // Log view now that we have the password.
            this.logView();
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';
        });
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.lessonSync.syncLesson(this.lesson.id, true).then((result) => {
            if (!result.updated && this.dataSent && this.isPrefetched()) {
                // The user sent data to server, but not in the sync process. Check if we need to fetch data.
                return this.lessonSync.prefetchAfterUpdate(this.module, this.courseId).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return result;
                });
            }

            return result;
        });
    }

    /**
     * Validate a password and retrieve extra data.
     *
     * @param {string} password The password to validate.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected validatePassword(password: string): Promise<any> {
        return this.lessonProvider.getLessonWithPassword(this.lesson.id, password).then((lessonData) => {
            this.lesson = lessonData;
            this.password = password;
        }).catch((error) => {
            this.password = '';

            return Promise.reject(error);
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.dataSentObserver && this.dataSentObserver.off();
    }
}
