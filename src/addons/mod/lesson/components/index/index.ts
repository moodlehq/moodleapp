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

import { CoreConstants } from '@/core/constants';
import { Component, Input, ViewChild, ElementRef, OnInit, OnDestroy, Optional } from '@angular/core';

import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreUser } from '@features/user/services/user';
import { IonContent, IonInput } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonModLessonRetakeFinishedInSyncDBRecord } from '../../services/database/lesson';
import { AddonModLessonPrefetchHandler } from '../../services/handlers/prefetch';
import {
    AddonModLesson,
    AddonModLessonAttemptsOverviewsStudentWSData,
    AddonModLessonAttemptsOverviewWSData,
    AddonModLessonDataSentData,
    AddonModLessonGetAccessInformationWSResponse,
    AddonModLessonLessonWSData,
    AddonModLessonPreventAccessReason,
    AddonModLessonProvider,
} from '../../services/lesson';
import { AddonModLessonOffline } from '../../services/lesson-offline';
import {
    AddonModLessonAutoSyncData,
    AddonModLessonSync,
    AddonModLessonSyncProvider,
    AddonModLessonSyncResult,
} from '../../services/lesson-sync';

/**
 * Component that displays a lesson entry page.
 */
@Component({
    selector: 'addon-mod-lesson-index',
    templateUrl: 'addon-mod-lesson-index.html',
})
export class AddonModLessonIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    @ViewChild(CoreTabsComponent) tabsComponent?: CoreTabsComponent;
    @ViewChild('passwordForm') formElement?: ElementRef;

    @Input() group = 0; // The group to display.
    @Input() action?: string; // The "action" to display first.

    component = AddonModLessonProvider.COMPONENT;
    moduleName = 'lesson';

    lesson?: AddonModLessonLessonWSData; // The lesson.
    selectedTab?: number; // The initial selected tab.
    askPassword?: boolean; // Whether to ask the password.
    canManage?: boolean; // Whether the user can manage the lesson.
    canViewReports?: boolean; // Whether the user can view the lesson reports.
    showSpinner?: boolean; // Whether to display a spinner.
    hasOffline?: boolean; // Whether there's offline data.
    retakeToReview?: AddonModLessonRetakeFinishedInSyncDBRecord; // A retake to review.
    preventReasons: AddonModLessonPreventAccessReason[] = []; // List of reasons that prevent the lesson from being seen.
    leftDuringTimed?: boolean; // Whether the user has started and left a retake.
    groupInfo?: CoreGroupInfo; // The group info.
    reportLoaded?: boolean; // Whether the report data has been loaded.
    selectedGroupName?: string; // The name of the selected group.
    overview?: AttemptsOverview; // Reports overview data.
    finishedOffline?: boolean; // Whether a retake was finished in offline.
    avetimeReadable?: string; // Average time in a readable format.
    hightimeReadable?: string; // High time in a readable format.
    lowtimeReadable?: string; // Low time in a readable format.

    protected syncEventName = AddonModLessonSyncProvider.AUTO_SYNCED;
    protected accessInfo?: AddonModLessonGetAccessInformationWSResponse; // Lesson access info.
    protected password?: string; // The password for the lesson.
    protected hasPlayed = false; // Whether the user has gone to the lesson player (attempted).
    protected dataSentObserver?: CoreEventObserver; // To detect data sent to server.
    protected dataSent = false; // Whether some data was sent to server while playing the lesson.

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

        this.selectedTab = this.action == 'report' ? 1 : 0;

        await this.loadContent(false, true);

        if (!this.lesson || this.preventReasons.length) {
            return;
        }

        this.logView();
    }

    /**
     * Change the group displayed.
     *
     * @param groupId Group ID to display.
     * @return Promise resolved when done.
     */
    async changeGroup(groupId: number): Promise<void> {
        this.reportLoaded = false;

        try {
            await this.setGroup(groupId);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error getting report.');
        } finally {
            this.reportLoaded = true;
        }
    }

    /**
     * Get the lesson data.
     *
     * @param refresh If it's refreshing content.
     * @param sync If it should try to sync.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        try {
            let lessonReady = true;
            this.askPassword = false;

            this.lesson = await AddonModLesson.instance.getLesson(this.courseId!, this.module!.id);

            this.dataRetrieved.emit(this.lesson);
            this.description = this.lesson.intro; // Show description only if intro is present.

            if (sync) {
                // Try to synchronize the lesson.
                await this.syncActivity(showErrors);
            }

            this.accessInfo = await AddonModLesson.instance.getAccessInformation(this.lesson.id, { cmId: this.module!.id });
            this.canManage = this.accessInfo.canmanage;
            this.canViewReports = this.accessInfo.canviewreports;
            this.preventReasons = [];
            const promises: Promise<void>[] = [];

            if (AddonModLesson.instance.isLessonOffline(this.lesson)) {
                // Handle status.
                this.setStatusListener();

                promises.push(this.loadOfflineData());
            }

            if (this.accessInfo.preventaccessreasons.length) {
                let preventReason = AddonModLesson.instance.getPreventAccessReason(this.accessInfo, false);
                const askPassword = preventReason?.reason == 'passwordprotectedlesson';

                if (askPassword) {
                    try {
                        // The lesson requires a password. Check if there is one in memory or DB.
                        const password = this.password ?
                            this.password :
                            await AddonModLesson.instance.getStoredPassword(this.lesson.id);

                        await this.validatePassword(password);

                        // Now that we have the password, get the access reason again ignoring the password.
                        preventReason = AddonModLesson.instance.getPreventAccessReason(this.accessInfo, true);
                        if (preventReason) {
                            this.preventReasons = [preventReason];
                        }
                    } catch {
                        // No password or the validation failed. Show password form.
                        this.askPassword = true;
                        this.preventReasons = [preventReason!];
                        lessonReady = false;
                    }
                } else  {
                    // Lesson cannot be started.
                    this.preventReasons = [preventReason!];
                    lessonReady = false;
                }
            }

            if (this.selectedTab == 1 && this.canViewReports) {
                // Only fetch the report data if the tab is selected.
                promises.push(this.fetchReportData());
            }

            await Promise.all(promises);

            if (lessonReady) {
                // Lesson can be started, don't ask the password and don't show prevent messages.
                this.lessonReady();
            }
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Load offline data for the lesson.
     *
     * @return Promise resolved when done.
     */
    protected async loadOfflineData(): Promise<void> {
        if (!this.lesson || !this.accessInfo) {
            return;
        }

        const promises: Promise<unknown>[] = [];
        const options = { cmId: this.module!.id };

        // Check if there is offline data.
        promises.push(AddonModLessonSync.instance.hasDataToSync(this.lesson.id, this.accessInfo.attemptscount).then((hasData) => {
            this.hasOffline = hasData;

            return;
        }));

        // Check if there is a retake finished in a synchronization.
        promises.push(AddonModLessonSync.instance.getRetakeFinishedInSync(this.lesson.id).then((retake) => {
            if (retake && retake.retake == this.accessInfo!.attemptscount - 1) {
                // The retake finished is still the last retake. Allow reviewing it.
                this.retakeToReview = retake;
            } else {
                this.retakeToReview = undefined;
                if (retake) {
                    AddonModLessonSync.instance.deleteRetakeFinishedInSync(this.lesson!.id);
                }
            }

            return;
        }));

        // Check if the ser has a finished retake in offline.
        promises.push(AddonModLessonOffline.instance.hasFinishedRetake(this.lesson.id).then((finished) => {
            this.finishedOffline = finished;

            return;
        }));

        // Update the list of content pages viewed and question attempts.
        promises.push(AddonModLesson.instance.getContentPagesViewedOnline(this.lesson.id, this.accessInfo.attemptscount, options));
        promises.push(AddonModLesson.instance.getQuestionsAttemptsOnline(this.lesson.id, this.accessInfo.attemptscount, options));

        await Promise.all(promises);
    }

    /**
     * Fetch the reports data.
     *
     * @return Promise resolved when done.
     */
    protected async fetchReportData(): Promise<void> {
        if (!this.module) {
            return;
        }

        try {
            this.groupInfo = await CoreGroups.instance.getActivityGroupInfo(this.module.id);

            await this.setGroup(CoreGroups.instance.validateGroupId(this.group, this.groupInfo));
        } finally {
            this.reportLoaded = true;
        }
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param result Data returned on the sync function.
     * @return If suceed or not.
     */
    protected hasSyncSucceed(result: AddonModLessonSyncResult): boolean {
        if (result.updated || this.dataSent) {
            // Check completion status if something was sent.
            CoreCourse.instance.checkModuleCompletion(this.courseId!, this.module!.completiondata);
        }

        this.dataSent = false;

        return result.updated;
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        this.tabsComponent?.ionViewDidEnter();

        if (!this.hasPlayed) {
            return;
        }

        // Update data when we come back from the player since the status could have changed.
        this.hasPlayed = false;
        this.dataSentObserver?.off(); // Stop listening for changes.
        this.dataSentObserver = undefined;

        // Refresh data.
        this.showLoadingAndRefresh(true, false);
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        this.tabsComponent?.ionViewDidLeave();

        // @todo if (this.navCtrl.getActive().component.name != 'AddonModLessonPlayerPage') {
        //     return;
        // }

        // Detect if anything was sent to server.
        this.hasPlayed = true;
        this.dataSentObserver?.off();

        this.dataSentObserver = CoreEvents.on<AddonModLessonDataSentData>(AddonModLessonProvider.DATA_SENT_EVENT, (data) => {
            // Ignore launch sending because it only affects timers.
            if (data.lessonId === this.lesson?.id && data.type != 'launch') {
                this.dataSent = true;
            }
        }, this.siteId);
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Promise resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(AddonModLesson.instance.invalidateLessonData(this.courseId!));

        if (this.lesson) {
            promises.push(AddonModLesson.instance.invalidateAccessInformation(this.lesson.id));
            promises.push(AddonModLesson.instance.invalidatePages(this.lesson.id));
            promises.push(AddonModLesson.instance.invalidateLessonWithPassword(this.lesson.id));
            promises.push(AddonModLesson.instance.invalidateTimers(this.lesson.id));
            promises.push(AddonModLesson.instance.invalidateContentPagesViewed(this.lesson.id));
            promises.push(AddonModLesson.instance.invalidateQuestionsAttempts(this.lesson.id));
            promises.push(AddonModLesson.instance.invalidateRetakesOverview(this.lesson.id));
            if (this.module) {
                promises.push(CoreGroups.instance.invalidateActivityGroupInfo(this.module.id));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @return True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModLessonAutoSyncData): boolean {
        return !!(this.lesson && syncEventData.lessonId == this.lesson.id);
    }

    /**
     * Function called when the lesson is ready to be seen (no pending prevent access reasons).
     */
    protected lessonReady(): void {
        this.askPassword = false;
        this.leftDuringTimed = this.hasOffline || AddonModLesson.instance.leftDuringTimed(this.accessInfo);

        if (this.password) {
            // Store the password in DB.
            AddonModLesson.instance.storePassword(this.lesson!.id, this.password);
        }
    }

    /**
     * Log viewing the lesson.
     *
     * @return Promise resolved when done.
     */
    protected async logView(): Promise<void> {
        if (!this.lesson) {
            return;
        }

        await CoreUtils.instance.ignoreErrors(
            AddonModLesson.instance.logViewLesson(this.lesson.id, this.password, this.lesson.name),
        );

        CoreCourse.instance.checkModuleCompletion(this.courseId!, this.module!.completiondata);
    }

    /**
     * Open the lesson player.
     *
     * @param continueLast Whether to continue the last retake.
     * @return Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async playLesson(continueLast?: boolean): Promise<void> {
        if (!this.lesson || !this.accessInfo) {
            return;
        }

        // @todo
        // Calculate the pageId to load. If there is timelimit, lesson is always restarted from the start.
        // let pageId: number | undefined;

        // if (this.hasOffline) {
        //     if (continueLast) {
        //         pageId = await AddonModLesson.instance.getLastPageSeen(this.lesson.id, this.accessInfo.attemptscount, {
        //             cmId: this.module!.id,
        //         });
        //     } else {
        //         pageId = this.accessInfo.firstpageid;
        //     }
        // } else if (this.leftDuringTimed && !this.lesson.timelimit) {
        //     pageId = continueLast ? this.accessInfo.lastpageseen : this.accessInfo.firstpageid;
        // }

        // this.navCtrl.push('AddonModLessonPlayerPage', {
        //     courseId: this.courseId,
        //     lessonId: this.lesson.id,
        //     pageId: pageId,
        //     password: this.password,
        // });
    }

    /**
     * First tab selected.
     */
    indexSelected(): void {
        this.selectedTab = 0;
    }

    /**
     * Reports tab selected.
     */
    reportsSelected(): void {
        this.selectedTab = 1;

        if (!this.groupInfo) {
            this.fetchReportData().catch((error) => {
                CoreDomUtils.instance.showErrorModalDefault(error, 'Error getting report.');
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

        // @todo this.navCtrl.push('AddonModLessonPlayerPage', {
        //     courseId: this.courseId,
        //     lessonId: this.lesson.id,
        //     pageId: this.retakeToReview.pageid,
        //     password: this.password,
        //     review: true,
        //     retake: this.retakeToReview.retake
        // });
    }

    /**
     * Set a group to view the reports.
     *
     * @param groupId Group ID.
     * @return Promise resolved when done.
     */
    async setGroup(groupId: number): Promise<void> {
        if (!this.lesson) {
            return;
        }

        this.group = groupId;
        this.selectedGroupName = '';

        // Search the name of the group if it isn't all participants.
        if (groupId && this.groupInfo && this.groupInfo.groups) {
            const group = this.groupInfo.groups.find(group => groupId == group.id);
            this.selectedGroupName = group?.name || '';
        }

        // Get the overview of retakes for the group.
        const data = await AddonModLesson.instance.getRetakesOverview(this.lesson.id, {
            groupId,
            cmId: this.lesson.coursemodule,
        });

        if (!data) {
            this.overview = data;

            return;
        }

        const formattedData = <AttemptsOverview> data;

        // Format times and grades.
        if (formattedData.avetime != null && formattedData.numofattempts) {
            formattedData.avetime = Math.floor(formattedData.avetime / formattedData.numofattempts);
            this.avetimeReadable = CoreTimeUtils.instance.formatTime(formattedData.avetime);
        }

        if (formattedData.hightime != null) {
            this.hightimeReadable = CoreTimeUtils.instance.formatTime(formattedData.hightime);
        }

        if (formattedData.lowtime != null) {
            this.lowtimeReadable = CoreTimeUtils.instance.formatTime(formattedData.lowtime);
        }

        if (formattedData.lessonscored) {
            if (formattedData.numofattempts) {
                formattedData.avescore = CoreTextUtils.instance.roundToDecimals(formattedData.avescore, 2);
            }
            if (formattedData.highscore != null) {
                formattedData.highscore = CoreTextUtils.instance.roundToDecimals(formattedData.highscore, 2);
            }
            if (formattedData.lowscore != null) {
                formattedData.lowscore = CoreTextUtils.instance.roundToDecimals(formattedData.lowscore, 2);
            }
        }

        if (formattedData.students) {
            // Get the user data for each student returned.
            await CoreUtils.instance.allPromises(formattedData.students.map(async (student) => {
                student.bestgrade = CoreTextUtils.instance.roundToDecimals(student.bestgrade, 2);

                const user = await CoreUtils.instance.ignoreErrors(CoreUser.instance.getProfile(student.id, this.courseId, true));
                if (user) {
                    student.profileimageurl = user.profileimageurl;
                }
            }));
        }

        this.overview = formattedData;
    }

    /**
     * Displays some data based on the current status.
     *
     * @param status The current status.
     * @param previousStatus The previous status. If not defined, there is no previous status.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected showStatus(status: string, previousStatus?: string): void {
        this.showSpinner = status == CoreConstants.DOWNLOADING;
    }

    /**
     * Start the lesson.
     *
     * @param continueLast Whether to continue the last attempt.
     */
    async start(continueLast?: boolean): Promise<void> {
        if (this.showSpinner || !this.lesson) {
            // Lesson is being downloaded or not retrieved, abort.
            return;
        }

        if (!AddonModLesson.instance.isLessonOffline(this.lesson) || this.currentStatus == CoreConstants.DOWNLOADED) {
            // Not downloadable or already downloaded, open it.
            this.playLesson(continueLast);

            return;
        }

        // Lesson supports offline and isn't downloaded, download it.
        this.showSpinner = true;

        try {
            await AddonModLessonPrefetchHandler.instance.prefetch(this.module!, this.courseId, true);

            // Success downloading, open lesson.
            this.playLesson(continueLast);
        } catch (error) {
            if (this.hasOffline) {
                // Error downloading but there is something offline, allow continuing it.
                this.playLesson(continueLast);
            } else {
                CoreDomUtils.instance.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        } finally {
            this.showSpinner = false;
        }
    }

    /**
     * Submit password for password protected lessons.
     *
     * @param e Event.
     * @param passwordEl The password input.
     */
    async submitPassword(e: Event, passwordEl: IonInput): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const password = passwordEl?.value;
        if (!password) {
            CoreDomUtils.instance.showErrorModal('addon.mod_lesson.emptypassword', true);

            return;
        }

        this.loaded = false;
        this.refreshIcon = 'spinner';
        this.syncIcon = 'spinner';

        try {
            await this.validatePassword(<string> password);

            // Password validated.
            this.lessonReady();

            // Now that we have the password, get the access reason again ignoring the password.
            const preventReason = AddonModLesson.instance.getPreventAccessReason(this.accessInfo!, true);
            this.preventReasons = preventReason ? [preventReason] : [];

            // Log view now that we have the password.
            this.logView();
        } catch (error) {
            CoreDomUtils.instance.showErrorModal(error);
        } finally {
            this.loaded = true;
            this.refreshIcon = 'refresh';
            this.syncIcon = 'sync';

            CoreDomUtils.instance.triggerFormSubmittedEvent(this.formElement, true, this.siteId);
        }
    }

    /**
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected async sync(): Promise<AddonModLessonSyncResult> {
        const result = await AddonModLessonSync.instance.syncLesson(this.lesson!.id, true);

        if (!result.updated && this.dataSent && this.isPrefetched()) {
            // The user sent data to server, but not in the sync process. Check if we need to fetch data.
            await CoreUtils.instance.ignoreErrors(AddonModLessonSync.instance.prefetchAfterUpdate(
                AddonModLessonPrefetchHandler.instance,
                this.module!,
                this.courseId!,
            ));
        }

        return result;
    }

    /**
     * Validate a password and retrieve extra data.
     *
     * @param password The password to validate.
     * @return Promise resolved when done.
     */
    protected async validatePassword(password: string): Promise<void> {
        try {
            this.lesson = await AddonModLesson.instance.getLessonWithPassword(this.lesson!.id, { password, cmId: this.module!.id });

            this.password = password;
        } catch (error) {
            this.password = '';

            throw error;
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.dataSentObserver?.off();
    }

}

/**
 * Overview data including user avatars, calculated in this component.
 */
type AttemptsOverview = Omit<AddonModLessonAttemptsOverviewWSData, 'students'> & {
    students?: StudentWithImage[];
};

/**
 * Overview student data with the avatar, calculated in this component.
 */
type StudentWithImage = AddonModLessonAttemptsOverviewsStudentWSData & {
    profileimageurl?: string;
};
