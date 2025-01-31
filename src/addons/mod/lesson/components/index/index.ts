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

import { DownloadStatus } from '@/core/constants';
import { Component, Input, ViewChild, ElementRef, OnInit, OnDestroy, Optional } from '@angular/core';

import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreUser } from '@features/user/services/user';
import { IonContent, IonInput } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreForms } from '@singletons/form';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonModLessonRetakeFinishedInSyncDBRecord } from '../../services/database/lesson';
import { AddonModLessonPrefetchHandler } from '../../services/handlers/prefetch';
import {
    AddonModLesson,
    AddonModLessonAttemptsOverviewsStudentWSData,
    AddonModLessonAttemptsOverviewWSData,
    AddonModLessonGetAccessInformationWSResponse,
    AddonModLessonLessonWSData,
    AddonModLessonPreventAccessReason,
} from '../../services/lesson';
import { AddonModLessonOffline } from '../../services/lesson-offline';
import {
    AddonModLessonAutoSyncData,
    AddonModLessonSync,
    AddonModLessonSyncResult,
} from '../../services/lesson-sync';
import { CoreTime } from '@singletons/time';
import { CoreError } from '@classes/errors/error';
import { Translate } from '@singletons';
import {
    ADDON_MOD_LESSON_AUTO_SYNCED,
    ADDON_MOD_LESSON_COMPONENT,
    ADDON_MOD_LESSON_DATA_SENT_EVENT,
    ADDON_MOD_LESSON_PAGE_NAME,
} from '../../constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays a lesson entry page.
 */
@Component({
    selector: 'addon-mod-lesson-index',
    templateUrl: 'addon-mod-lesson-index.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModLessonIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    @ViewChild(CoreTabsComponent) tabsComponent?: CoreTabsComponent;
    @ViewChild('passwordForm') formElement?: ElementRef;

    @Input() group = 0; // The group to display.
    @Input() action?: string; // The "action" to display first.

    component = ADDON_MOD_LESSON_COMPONENT;
    pluginName = 'lesson';

    lesson?: AddonModLessonLessonWSData; // The lesson.
    selectedTab?: number; // The initial selected tab.
    askPassword?: boolean; // Whether to ask the password.
    canManage?: boolean; // Whether the user can manage the lesson.
    canViewReports?: boolean; // Whether the user can view the lesson reports.
    showSpinner?: boolean; // Whether to display a spinner.
    retakeToReview?: AddonModLessonRetakeFinishedInSyncDBRecord; // A retake to review.
    preventReasons: AddonModLessonPreventAccessReason[] = []; // List of reasons that prevent the lesson from being seen.
    leftDuringTimed?: boolean; // Whether the user has started and left a retake.
    groupInfo?: CoreGroupInfo; // The group info.
    reportLoaded?: boolean; // Whether the report data has been loaded.
    selectedGroupEmptyMessage?: string; // The message to show if the selected group is empty.
    overview?: AttemptsOverview; // Reports overview data.
    finishedOffline?: boolean; // Whether a retake was finished in offline.
    avetimeReadable?: string; // Average time in a readable format.
    hightimeReadable?: string; // High time in a readable format.
    lowtimeReadable?: string; // Low time in a readable format.

    protected syncEventName = ADDON_MOD_LESSON_AUTO_SYNCED;
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
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.selectedTab = this.action == 'report' ? 1 : 0;

        await this.loadContent(false, true);
    }

    /**
     * Change the group displayed.
     *
     * @param groupId Group ID to display.
     * @returns Promise resolved when done.
     */
    async changeGroup(groupId: number): Promise<void> {
        this.reportLoaded = false;

        try {
            await this.setGroup(groupId);
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting report.' });
        } finally {
            this.reportLoaded = true;
        }
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        let lessonReady = true;
        this.askPassword = false;

        this.lesson = await AddonModLesson.getLesson(this.courseId, this.module.id);

        this.dataRetrieved.emit(this.lesson);
        this.description = this.lesson.intro; // Show description only if intro is present.

        if (sync) {
            // Try to synchronize the lesson.
            await this.syncActivity(showErrors);
        }

        this.accessInfo = await AddonModLesson.getAccessInformation(this.lesson.id, { cmId: this.module.id });
        this.canManage = this.accessInfo.canmanage;
        this.canViewReports = this.accessInfo.canviewreports;
        this.preventReasons = [];
        const promises: Promise<void>[] = [];

        if (AddonModLesson.isLessonOffline(this.lesson)) {
            // Handle status.
            this.setStatusListener();

            promises.push(this.loadOfflineData());
        }

        if (this.accessInfo.preventaccessreasons.length) {
            let preventReason = AddonModLesson.getPreventAccessReason(this.accessInfo, false);
            const askPassword = preventReason?.reason == 'passwordprotectedlesson';

            if (askPassword) {
                try {
                    // The lesson requires a password. Check if there is one in memory or DB.
                    const password = this.password ?
                        this.password :
                        await AddonModLesson.getStoredPassword(this.lesson.id);

                    await this.validatePassword(password);

                    // Now that we have the password, get the access reason again ignoring the password.
                    preventReason = AddonModLesson.getPreventAccessReason(this.accessInfo, true);
                    if (preventReason) {
                        this.preventReasons = [preventReason];
                    }
                } catch {
                    // No password or the validation failed. Show password form.
                    this.askPassword = true;
                    this.preventReasons = [preventReason!];
                    lessonReady = false;
                }
            } else {
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
    }

    /**
     * Load offline data for the lesson.
     *
     * @returns Promise resolved when done.
     */
    protected async loadOfflineData(): Promise<void> {
        if (!this.lesson || !this.accessInfo) {
            return;
        }

        const promises: Promise<unknown>[] = [];
        const options = { cmId: this.module.id };

        // Check if there is offline data.
        promises.push(AddonModLessonSync.hasDataToSync(this.lesson.id, this.accessInfo.attemptscount).then((hasData) => {
            this.hasOffline = hasData;

            return;
        }));

        // Check if there is a retake finished in a synchronization.
        promises.push(AddonModLessonSync.getRetakeFinishedInSync(this.lesson.id).then((retake) => {
            if (retake && retake.retake == this.accessInfo!.attemptscount - 1) {
                // The retake finished is still the last retake. Allow reviewing it.
                this.retakeToReview = retake;
            } else {
                this.retakeToReview = undefined;
                if (retake) {
                    AddonModLessonSync.deleteRetakeFinishedInSync(this.lesson!.id);
                }
            }

            return;
        }));

        // Check if the ser has a finished retake in offline.
        promises.push(AddonModLessonOffline.hasFinishedRetake(this.lesson.id).then((finished) => {
            this.finishedOffline = finished;

            return;
        }));

        // Update the list of content pages viewed and question attempts.
        promises.push(AddonModLesson.getContentPagesViewedOnline(this.lesson.id, this.accessInfo.attemptscount, options));
        promises.push(AddonModLesson.getQuestionsAttemptsOnline(this.lesson.id, this.accessInfo.attemptscount, options));

        await Promise.all(promises);
    }

    /**
     * Fetch the reports data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchReportData(): Promise<void> {
        if (!this.module) {
            return;
        }

        try {
            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.module.id);

            await this.setGroup(CoreGroups.validateGroupId(this.group, this.groupInfo));
        } finally {
            this.reportLoaded = true;
        }
    }

    /**
     * @inheritdoc
     */
    protected hasSyncSucceed(result: AddonModLessonSyncResult): boolean {
        if (result.updated || this.dataSent) {
            // Check completion status if something was sent.
            this.checkCompletion();
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
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Promise resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(AddonModLesson.invalidateLessonData(this.courseId));

        if (this.lesson) {
            promises.push(AddonModLesson.invalidateAccessInformation(this.lesson.id));
            promises.push(AddonModLesson.invalidatePages(this.lesson.id));
            promises.push(AddonModLesson.invalidateLessonWithPassword(this.lesson.id));
            promises.push(AddonModLesson.invalidateTimers(this.lesson.id));
            promises.push(AddonModLesson.invalidateContentPagesViewed(this.lesson.id));
            promises.push(AddonModLesson.invalidateQuestionsAttempts(this.lesson.id));
            promises.push(AddonModLesson.invalidateRetakesOverview(this.lesson.id));
            if (this.module) {
                promises.push(CoreGroups.invalidateActivityGroupInfo(this.module.id));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @returns True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModLessonAutoSyncData): boolean {
        return !!(this.lesson && syncEventData.lessonId == this.lesson.id);
    }

    /**
     * Function called when the lesson is ready to be seen (no pending prevent access reasons).
     */
    protected lessonReady(): void {
        this.askPassword = false;
        this.leftDuringTimed = this.hasOffline || AddonModLesson.leftDuringTimed(this.accessInfo);

        if (this.password) {
            // Store the password in DB.
            AddonModLesson.storePassword(this.lesson!.id, this.password);
        }
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.lesson || this.preventReasons.length) {
            return;
        }

        await CorePromiseUtils.ignoreErrors(AddonModLesson.logViewLesson(this.lesson.id, this.password));
    }

    /**
     * Call analytics.
     */
    protected callAnalyticsLogEvent(): void {
        this.analyticsLogEvent('mod_lesson_view_lesson', {
            url: this.selectedTab === 1 ? `/mod/lesson/report.php?id=${this.module.id}&action=reportoverview` : undefined,
        });
    }

    /**
     * Open the lesson player.
     *
     * @param continueLast Whether to continue the last retake.
     * @returns Promise resolved when done.
     */
    protected async playLesson(continueLast?: boolean): Promise<void> {
        if (!this.lesson || !this.accessInfo) {
            return;
        }

        // Calculate the pageId to load. If there is timelimit, lesson is always restarted from the start.
        let pageId: number | undefined;

        if (this.hasOffline) {
            if (continueLast) {
                pageId = await AddonModLesson.getLastPageSeen(this.lesson.id, this.accessInfo.attemptscount, {
                    cmId: this.module.id,
                });
            } else {
                pageId = this.accessInfo.firstpageid;
            }
        } else if (this.leftDuringTimed && !this.lesson.timelimit) {
            pageId = continueLast ? this.accessInfo.lastpageseen : this.accessInfo.firstpageid;
        }

        await CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_LESSON_PAGE_NAME}/${this.courseId}/${this.module.id}/player`,
            {
                params: {
                    pageId: pageId,
                    password: this.password,
                },
            },
        );

        // Detect if anything was sent to server.
        this.hasPlayed = true;
        this.dataSentObserver?.off();

        this.dataSentObserver = CoreEvents.on(ADDON_MOD_LESSON_DATA_SENT_EVENT, (data) => {
            if (data.lessonId !== this.lesson?.id || data.type === 'launch') {
                // Ignore launch sending because it only affects timers.
                return;
            }

            if (data.type === 'finish') {
                // Lesson finished, check completion now.
                this.dataSent = false;
                this.checkCompletion();
            } else {
                this.dataSent = true;
            }
        }, this.siteId);
    }

    /**
     * First tab selected.
     */
    indexSelected(): void {
        const tabHasChanged = this.selectedTab !== 0;
        this.selectedTab = 0;

        if (tabHasChanged) {
            this.callAnalyticsLogEvent();
        }
    }

    /**
     * Reports tab selected.
     */
    reportsSelected(): void {
        const tabHasChanged = this.selectedTab !== 1;
        this.selectedTab = 1;

        if (!this.groupInfo) {
            this.fetchReportData().catch((error) => {
                CoreAlerts.showError(error, { default: 'Error getting report.' });
            });
        }

        if (tabHasChanged) {
            this.callAnalyticsLogEvent();
        }
    }

    /**
     * Review the lesson.
     */
    async review(): Promise<void> {
        if (!this.retakeToReview || !this.lesson) {
            // No retake to review, stop.
            return;
        }

        await CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_LESSON_PAGE_NAME}/${this.courseId}/${this.module.id}/player`,
            {
                params: {
                    pageId: this.retakeToReview.pageid,
                    password: this.password,
                    review: true,
                    retake: this.retakeToReview.retake,
                },
            },
        );

        this.retakeToReview = undefined;
    }

    /**
     * Set a group to view the reports.
     *
     * @param groupId Group ID.
     * @returns Promise resolved when done.
     */
    async setGroup(groupId: number): Promise<void> {
        if (!this.lesson) {
            return;
        }

        this.group = groupId;
        this.selectedGroupEmptyMessage = '';

        // Search the name of the group if it isn't all participants.
        if (groupId && this.groupInfo && this.groupInfo.groups) {
            const group = this.groupInfo.groups.find(group => groupId == group.id);

            this.selectedGroupEmptyMessage = group
                ? Translate.instant('addon.mod_lesson.nolessonattemptsgroup', { $a: group.name })
                : '';
        }

        // Get the overview of retakes for the group.
        const data = await AddonModLesson.getRetakesOverview(this.lesson.id, {
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
            this.avetimeReadable = CoreTime.formatTime(formattedData.avetime);
        }

        if (formattedData.hightime != null) {
            this.hightimeReadable = CoreTime.formatTime(formattedData.hightime);
        }

        if (formattedData.lowtime != null) {
            this.lowtimeReadable = CoreTime.formatTime(formattedData.lowtime);
        }

        if (formattedData.lessonscored) {
            if (formattedData.numofattempts && formattedData.avescore != null) {
                formattedData.avescore = CoreText.roundToDecimals(formattedData.avescore, 2);
            }
            if (formattedData.highscore != null) {
                formattedData.highscore = CoreText.roundToDecimals(formattedData.highscore, 2);
            }
            if (formattedData.lowscore != null) {
                formattedData.lowscore = CoreText.roundToDecimals(formattedData.lowscore, 2);
            }
        }

        if (formattedData.students) {
            // Get the user data for each student returned.
            await CorePromiseUtils.allPromises(formattedData.students.map(async (student) => {
                student.bestgrade = CoreText.roundToDecimals(student.bestgrade, 2);

                const user = await CorePromiseUtils.ignoreErrors(CoreUser.getProfile(student.id, this.courseId, true));
                if (user) {
                    student.profileimageurl = user.profileimageurl;
                }
            }));
        }

        this.overview = formattedData;
    }

    /**
     * @inheritdoc
     */
    protected showStatus(status: DownloadStatus): void {
        this.showSpinner = status === DownloadStatus.DOWNLOADING;
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

        if (!AddonModLesson.isLessonOffline(this.lesson) || this.currentStatus == DownloadStatus.DOWNLOADED) {
            // Not downloadable or already downloaded, open it.
            this.playLesson(continueLast);

            return;
        }

        // Lesson supports offline and isn't downloaded, download it.
        this.showSpinner = true;

        try {
            await AddonModLessonPrefetchHandler.prefetch(this.module, this.courseId, true);

            // Success downloading, open lesson.
            this.playLesson(continueLast);
        } catch (error) {
            if (this.hasOffline) {
                // Error downloading but there is something offline, allow continuing it.
                this.playLesson(continueLast);
            } else {
                CoreAlerts.showError(error, { default: Translate.instant('core.errordownloading') });
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
            CoreAlerts.showError(Translate.instant('addon.mod_lesson.emptypassword'));

            return;
        }

        this.showLoading = true;

        try {
            await this.validatePassword(<string> password);

            // Password validated.
            this.lessonReady();

            // Now that we have the password, get the access reason again ignoring the password.
            const preventReason = AddonModLesson.getPreventAccessReason(this.accessInfo!, true);
            this.preventReasons = preventReason ? [preventReason] : [];

            // Log view now that we have the password.
            this.logActivity();
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            this.showLoading = false;

            CoreForms.triggerFormSubmittedEvent(this.formElement, true, this.siteId);
        }
    }

    /**
     * @inheritdoc
     */
    protected async sync(): Promise<AddonModLessonSyncResult> {
        if (!this.lesson) {
            throw new CoreError('Cannot sync without a lesson.');
        }

        const result = await AddonModLessonSync.syncLesson(this.lesson.id, true);

        if (!result.updated && this.dataSent && this.isPrefetched()) {
            // The user sent data to server, but not in the sync process. Check if we need to fetch data.
            await CorePromiseUtils.ignoreErrors(AddonModLessonSync.prefetchAfterUpdate(
                AddonModLessonPrefetchHandler.instance,
                this.module,
                this.courseId,
            ));
        }

        return result;
    }

    /**
     * Validate a password and retrieve extra data.
     *
     * @param password The password to validate.
     * @returns Promise resolved when done.
     */
    protected async validatePassword(password: string): Promise<void> {
        try {
            this.lesson = await AddonModLesson.getLessonWithPassword(this.lesson!.id, { password, cmId: this.module.id });

            this.password = password;
        } catch (error) {
            this.password = '';

            throw error;
        }
    }

    /**
     * Open a certain user retake.
     *
     * @param userId User ID to view.
     * @returns Promise resolved when done.
     */
    async openRetake(userId: number): Promise<void> {
        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_LESSON_PAGE_NAME}/${this.courseId}/${this.module.id}/user-retake/${userId}`,
        );
    }

    /**
     * @inheritdoc
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
