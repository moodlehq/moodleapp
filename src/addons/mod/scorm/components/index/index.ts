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
import { Component, Input, OnInit, Optional } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { IonContent } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonModScormPrefetchHandler } from '../../services/handlers/prefetch';
import {
    AddonModScorm,
    AddonModScormAttemptCountResult,
    AddonModScormGetScormAccessInformationWSResponse,
    AddonModScormAttemptGrade,
    AddonModScormOrganization,
    AddonModScormScorm,
} from '../../services/scorm';
import { AddonModScormHelper, AddonModScormTOCScoWithIcon } from '../../services/scorm-helper';
import {
    AddonModScormAutoSyncEventData,
    AddonModScormSync,
    AddonModScormSyncResult,
} from '../../services/scorm-sync';
import {
    ADDON_MOD_SCORM_COMPONENT,
    AddonModScormForceAttempt,
    AddonModScormMode,
    AddonModScormSkipView,
    ADDON_MOD_SCORM_DATA_SENT_EVENT,
    ADDON_MOD_SCORM_DATA_AUTO_SYNCED,
    ADDON_MOD_SCORM_PAGE_NAME,
} from '../../constants';
import { CoreWait } from '@singletons/wait';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Component that displays a SCORM entry page.
 */
@Component({
    selector: 'addon-mod-scorm-index',
    templateUrl: 'addon-mod-scorm-index.html',
    styleUrl: 'index.scss',
})
export class AddonModScormIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    @Input() autoPlayData?: AddonModScormAutoPlayData; // Data to use to play the SCORM automatically.

    component = ADDON_MOD_SCORM_COMPONENT;
    pluginName = 'scorm';

    scorm?: AddonModScormScorm; // The SCORM object.
    currentOrganization: Partial<AddonModScormOrganization> & { identifier: string} = {
        identifier: '',
    }; // Selected organization.

    startNewAttempt = false;
    errorMessage?: string; // Error message.
    syncTime?: string; // Last sync time.
    hasOffline = false; // Whether the SCORM has offline data.
    attemptToContinue?: number; // The attempt to continue or review.
    statusMessage?: string; // Message about the status.
    downloading = false; // Whether the SCORM is being downloaded.
    percentage?: string; // Download/unzip percentage.
    showPercentage = false; // Whether to show the percentage.
    progressMessage?: string; // Message about download/unzip.
    organizations: AddonModScormOrganization[] = []; // List of organizations.
    loadingToc = false; // Whether the TOC is being loaded.
    toc?: AddonModScormTOCScoWithIcon[]; // Table of contents (structure).
    accessInfo?: AddonModScormGetScormAccessInformationWSResponse; // Access information.
    skip?: boolean; // Launch immediately.
    incomplete = false; // Whether last attempt is incomplete.
    numAttempts = -1; // Number of attempts.
    grade?: number; // Grade.
    gradeFormatted?: string; // Grade formatted.
    gradeMethodReadable?: string; // Grade method in a readable format.
    attemptsLeft = -1; // Number of attempts left.
    onlineAttempts: AttemptGrade[] = []; // Grades for online attempts.
    offlineAttempts: AttemptGrade[] = []; // Grades for offline attempts.
    gradesExpanded = false;

    protected fetchContentDefaultError = 'addon.mod_scorm.errorgetscorm'; // Default error to show when loading contents.
    protected syncEventName = ADDON_MOD_SCORM_DATA_AUTO_SYNCED;
    protected attempts?: AddonModScormAttemptCountResult; // Data about online and offline attempts.
    protected lastAttempt?: number; // Last attempt.
    protected lastIsOffline = false; // Whether the last attempt is offline.
    protected hasPlayed = false; // Whether the user has opened the player page.
    protected dataSentObserver?: CoreEventObserver; // To detect data sent to server.
    protected dataSent = false; // Whether some data was sent to server while playing the SCORM.

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModScormIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent(false, true);

        if (!this.scorm) {
            return;
        }

        if (this.skip) {
            this.open();
        }
    }

    /**
     * Download a SCORM package or restores an ongoing download.
     *
     * @returns Promise resolved when done.
     */
    protected async downloadScormPackage(): Promise<void> {
        this.downloading = true;

        try {
            await AddonModScormPrefetchHandler.download(this.module, this.courseId, undefined, (data) => {
                if (!data || !this.scorm) {
                    return;
                }

                this.percentage = undefined;
                this.showPercentage = false;

                if (data.downloading) {
                    // Downloading package.
                    if (this.scorm.packagesize && data.progress) {
                        const percentageNumber = Number(data.progress.loaded / this.scorm.packagesize) * 100;
                        this.percentage = percentageNumber.toFixed(1);
                        this.showPercentage = percentageNumber >= 0 && percentageNumber <= 100;
                    }
                } else if (data.message) {
                    // Show a message.
                    this.progressMessage = data.message;
                } else if (data.progress && data.progress.loaded && data.progress.total) {
                    // Unzipping package.
                    const percentageNumber = Number(data.progress.loaded / data.progress.total) * 100;
                    this.percentage = percentageNumber.toFixed(1);
                    this.showPercentage = percentageNumber >= 0 && percentageNumber <= 100;
                }
            });

        } finally {
            this.progressMessage = undefined;
            this.percentage = undefined;
            this.downloading = false;
        }
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        // Get the SCORM instance.
        this.scorm = await AddonModScorm.getScorm(this.courseId, this.module.id, { moduleUrl: this.module.url });

        this.dataRetrieved.emit(this.scorm);
        this.description = this.scorm.intro || this.description;
        this.errorMessage = AddonModScorm.isScormUnsupported(this.scorm);

        if (this.scorm.warningMessage) {
            return; // SCORM is closed or not open yet, we can't get more data.
        }

        if (sync) {
            // Try to synchronize the SCORM.
            await CorePromiseUtils.ignoreErrors(this.syncActivity(showErrors));
        }

        const [syncTime, accessInfo] = await Promise.all([
            AddonModScormSync.getReadableSyncTime(this.scorm.id),
            AddonModScorm.getAccessInformation(this.scorm.id, { cmId: this.module.id }),
            this.fetchAttemptData(this.scorm),
        ]);

        this.syncTime = syncTime;
        this.accessInfo = accessInfo;

        // Check whether to launch the SCORM immediately.
        if (this.skip === undefined) {
            this.skip = !this.hasOffline && !this.errorMessage && (!this.scorm.lastattemptlock || this.attemptsLeft > 0) &&
                (
                    !!this.autoPlayData
                    ||
                    (
                        this.accessInfo.canskipview && !this.accessInfo.canviewreport &&
                        (this.scorm.skipview ?? 0) >= AddonModScormSkipView.FIRST &&
                        (this.scorm.skipview === AddonModScormSkipView.ALWAYS || this.lastAttempt === 0)
                    )
                );
        }
    }

    /**
     * Fetch attempt data.
     *
     * @param scorm Scorm.
     * @returns Promise resolved when done.
     */
    protected async fetchAttemptData(scorm: AddonModScormScorm): Promise<void> {
        // Get the number of attempts.
        this.attempts = await AddonModScorm.getAttemptCount(scorm.id, { cmId: this.module.id });
        this.hasOffline = !!this.attempts.offline.length;

        // Determine the attempt that will be continued or reviewed.
        const attempt = await AddonModScormHelper.determineAttemptToContinue(scorm, this.attempts);

        this.lastAttempt = attempt.num;
        this.lastIsOffline = attempt.offline;

        if (this.lastAttempt !== this.attempts.lastAttempt.num) {
            this.attemptToContinue = this.lastAttempt;
        } else {
            this.attemptToContinue = undefined;
        }

        // Check if the last attempt is incomplete.
        this.incomplete = await AddonModScorm.isAttemptIncomplete(scorm.id, this.lastAttempt, {
            offline: this.lastIsOffline,
            cmId: this.module.id,
        });

        this.numAttempts = this.attempts.total;
        this.gradeMethodReadable = AddonModScorm.getScormGradeMethod(scorm);
        this.attemptsLeft = AddonModScorm.countAttemptsLeft(scorm, this.attempts.lastAttempt.num);

        if (scorm.forcenewattempt === AddonModScormForceAttempt.ALWAYS ||
                (scorm.forcenewattempt && !this.incomplete)) {
            this.startNewAttempt = true;
        }

        await Promise.all([
            this.getReportedGrades(scorm, this.attempts),
            this.fetchStructure(scorm),
            this.loadPackageSize(scorm),
            this.setStatusListener(),
        ]);
    }

    /**
     * Load SCORM package size if needed.
     *
     * @returns Promise resolved when done.
     */
    protected async loadPackageSize(scorm: AddonModScormScorm): Promise<void> {
        if (scorm.packagesize || this.errorMessage) {
            return;
        }

        // SCORM is supported but we don't have package size. Try to calculate it.
        scorm.packagesize = await AddonModScorm.calculateScormSize(scorm);
    }

    /**
     * Fetch the structure of the SCORM (TOC).
     *
     * @returns Promise resolved when done.
     */
    protected async fetchStructure(scorm: AddonModScormScorm): Promise<void> {
        this.organizations = await AddonModScorm.getOrganizations(scorm.id, { cmId: this.module.id });

        if (this.currentOrganization.identifier === '' && this.organizations[0]?.identifier) {
            // Load first organization (if any).
            this.currentOrganization.identifier = this.organizations[0].identifier;
        }

        return this.loadOrganizationToc(scorm, this.currentOrganization.identifier);
    }

    /**
     * Get the grade of an attempt and add it to the scorm attempts list.
     *
     * @param attempt The attempt number.
     * @param offline Whether it's an offline attempt.
     * @param attempts Object where to add the attempt.
     * @returns Promise resolved when done.
     */
    protected async getAttemptGrade(
        attempt: number,
        offline: boolean,
        attempts: Record<number, AddonModScormAttemptGrade>,
    ): Promise<void> {
        if (!this.scorm) {
            return;
        }

        attempts[attempt] = await AddonModScorm.getAttemptGrade(this.scorm, attempt, offline);
    }

    /**
     * Get the grades of each attempt and the grade of the SCORM.
     *
     * @returns Promise resolved when done.
     */
    protected async getReportedGrades(scorm: AddonModScormScorm, attempts: AddonModScormAttemptCountResult): Promise<void> {
        const promises: Promise<void>[] = [];
        const onlineAttempts: Record<number, AttemptGrade> = {};
        const offlineAttempts: Record<number, AttemptGrade> = {};

        // Calculate the grade for each attempt.
        attempts.online.forEach((attempt) => {
            // Check that attempt isn't in offline to prevent showing the same attempt twice. Offline should be more recent.
            if (attempts.offline.indexOf(attempt) == -1) {
                promises.push(this.getAttemptGrade(attempt, false, onlineAttempts));
            }
        });

        attempts.offline.forEach((attempt) => {
            promises.push(this.getAttemptGrade(attempt, true, offlineAttempts));
        });

        await Promise.all(promises);

        // Calculate the grade of the whole SCORM. We only use online attempts to calculate this data.
        this.grade = AddonModScorm.calculateScormGrade(scorm, onlineAttempts);

        // Add the attempts to the SCORM in array format in ASC order, and format the grades.
        this.onlineAttempts = CoreUtils.objectToArray(onlineAttempts);
        this.offlineAttempts = CoreUtils.objectToArray(offlineAttempts);
        this.onlineAttempts.sort((a, b) => a.num - b.num);
        this.offlineAttempts.sort((a, b) => a.num - b.num);

        // Now format the grades.
        this.onlineAttempts.forEach((attempt) => {
            attempt.gradeFormatted = AddonModScorm.formatGrade(scorm, attempt.score);
        });
        this.offlineAttempts.forEach((attempt) => {
            attempt.gradeFormatted = AddonModScorm.formatGrade(scorm, attempt.score);
        });

        this.gradeFormatted = AddonModScorm.formatGrade(scorm, this.grade);
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.scorm) {
            return; // Shouldn't happen.
        }

        await CorePromiseUtils.ignoreErrors(AddonModScorm.logView(this.scorm.id));

        this.analyticsLogEvent('mod_scorm_view_scorm');
    }

    /**
     * @inheritdoc
     */
    protected hasSyncSucceed(result: AddonModScormSyncResult): boolean {
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

        if (!this.hasPlayed) {
            return;
        }

        this.hasPlayed = false;
        this.startNewAttempt = false; // Uncheck new attempt.

        // Add a delay to make sure the player has started the last writing calls so we can detect conflicts.
        setTimeout(() => {
            this.dataSentObserver?.off(); // Stop listening for changes.
            this.dataSentObserver = undefined;

            // Refresh data.
            this.showLoadingAndRefresh(true, false);
        }, 500);
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModScorm.invalidateScormData(this.courseId));

        if (this.scorm) {
            promises.push(AddonModScorm.invalidateAllScormData(this.scorm.id));
        }

        await Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param syncEventData Data receiven on sync observer.
     * @returns True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModScormAutoSyncEventData): boolean {
        if (syncEventData.updated && this.scorm && syncEventData.scormId == this.scorm.id) {
            // Check completion status.
            this.checkCompletion();

            return true;
        }

        return false;
    }

    /**
     * Load a organization's TOC.
     */
    async loadOrganization(): Promise<void> {
        if (!this.scorm) {
            return;
        }

        try {
            await this.loadOrganizationToc(this.scorm, this.currentOrganization.identifier);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        }
    }

    /**
     * Load the TOC of a certain organization.
     *
     * @param scorm Scorm object.
     * @param organizationId The organization id.
     * @returns Promise resolved when done.
     */
    protected async loadOrganizationToc(scorm: AddonModScormScorm, organizationId: string): Promise<void> {
        if (!scorm.displaycoursestructure || this.lastAttempt === undefined) {
            // TOC is not displayed, no need to load it.
            return;
        }

        this.loadingToc = true;

        try {
            this.toc = await AddonModScormHelper.getToc(scorm.id, this.lastAttempt, this.incomplete, {
                organization: organizationId,
                offline: this.lastIsOffline,
                cmId: this.module.id,
            });

            // Search organization title.
            const organization = this.organizations.find((org) => org.identifier === organizationId);
            if (organization) {
                this.currentOrganization.title = organization.title;
            }
        } finally {
            this.loadingToc = false;
        }
    }

    /**
     * Open a SCORM. It will download the SCORM package if it's not downloaded or it has changed.
     *
     * @param event Event.
     * @param preview Wether open screen in preview mode or not.
     * @param scoId SCO that needs to be loaded when the SCORM is opened. If not defined, load first SCO.
     */
    async open(event?: Event, preview: boolean = false, scoId?: number): Promise<void> {
        event?.preventDefault();
        event?.stopPropagation();

        if (this.downloading || !this.scorm) {
            // Scope is being downloaded, abort.
            return;
        }

        const isOutdated = this.currentStatus === DownloadStatus.OUTDATED;
        const scorm = this.scorm;

        if (!isOutdated && this.currentStatus !== DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
            // Already downloaded, open it.
            this.openScorm(scoId, preview);

            return;
        }

        // SCORM needs to be downloaded.
        await AddonModScormHelper.confirmDownload(scorm, isOutdated);
        // Invalidate WS data if SCORM is outdated.
        if (isOutdated) {
            await CorePromiseUtils.ignoreErrors(AddonModScorm.invalidateAllScormData(scorm.id));
        }

        try {
            await this.downloadScormPackage();
            // Success downloading, open SCORM if user hasn't left the view.
            if (!this.isDestroyed) {
                this.openScorm(scoId, preview);
            }
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(
                    error,
                    Translate.instant('addon.mod_scorm.errordownloadscorm', { name: scorm.name }),
                );
            }
        }
    }

    /**
     * Toggle list of grades.
     */
    toggleGrades(): void {
        this.gradesExpanded = !this.gradesExpanded;
    }

    /**
     * Open a SCORM package.
     *
     * @param scoId SCO ID.
     */
    protected openScorm(scoId?: number, preview: boolean = false): void {
        const autoPlayData = this.autoPlayData;

        this.autoPlayData = undefined;
        this.skip = false;
        this.hasPlayed = true;

        // Detect if anything was sent to server.
        this.dataSentObserver?.off();

        this.dataSentObserver = CoreEvents.on(ADDON_MOD_SCORM_DATA_SENT_EVENT, (data) => {
            if (data.scormId === this.scorm?.id) {
                this.dataSent = true;

                if (this.module.completiondata && CoreCourse.isIncompleteAutomaticCompletion(this.module.completiondata)) {
                    // Always invalidate section data when data is sent, the SCORM could have a link to a section.
                    CoreCourse.invalidateSections(this.courseId);
                }
            }
        }, this.siteId);

        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_SCORM_PAGE_NAME}/${this.courseId}/${this.module.id}/player`,
            {
                params: {
                    mode: autoPlayData?.mode ?? (preview ? AddonModScormMode.BROWSE : AddonModScormMode.NORMAL),
                    moduleUrl: this.module.url,
                    newAttempt: autoPlayData?.newAttempt ?? this.startNewAttempt,
                    organizationId: autoPlayData?.organizationId ?? this.currentOrganization.identifier,
                    scoId: autoPlayData?.scoId ?? scoId,
                },
            },
        );
    }

    /**
     * @inheritdoc
     */
    protected async showStatus(status: DownloadStatus): Promise<void> {

        if (status === DownloadStatus.OUTDATED && this.scorm) {
            // Only show the outdated message if the file should be downloaded.
            const download = await AddonModScorm.shouldDownloadMainFile(this.scorm, true);

            this.statusMessage = download ? 'addon.mod_scorm.scormstatusoutdated' : '';
        } else if (status === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
            this.statusMessage = 'addon.mod_scorm.scormstatusnotdownloaded';
        } else if (status === DownloadStatus.DOWNLOADING) {
            if (!this.downloading) {
                // It's being downloaded right now but the view isn't tracking it. "Restore" the download.
                this.downloadScormPackage();
            }
        } else {
            this.statusMessage = '';
        }
    }

    /**
     * Performs the sync of the activity.
     *
     * @param retries Number of retries done.
     * @returns Promise resolved when done.
     */
    protected async sync(retries = 0): Promise<AddonModScormSyncResult> {
        if (!this.scorm) {
            throw new CoreError('Cannot sync without a scorm.');
        }

        if (CoreSync.isBlocked(ADDON_MOD_SCORM_COMPONENT, this.scorm.id) && retries < 5) {
            // Sync is currently blocked, this can happen when SCORM player is left. Retry in a bit.
            await CoreWait.wait(400);

            return this.sync(retries + 1);
        }

        const result = await AddonModScormSync.syncScorm(this.scorm);

        if (!result.updated && this.dataSent) {
            // The user sent data to server, but not in the sync process. Check if we need to fetch data.
            await CorePromiseUtils.ignoreErrors(
                AddonModScormSync.prefetchAfterUpdate(AddonModScormPrefetchHandler.instance, this.module, this.courseId),
            );
        }

        return result;
    }

}

/**
 * Grade for an online attempt.
 */
export type AttemptGrade = AddonModScormAttemptGrade & {
    gradeFormatted?: string;
};

/**
 * Data to use to auto-play the SCORM.
 */
export type AddonModScormAutoPlayData = {
    mode?: string;
    newAttempt?: boolean;
    organizationId?: string;
    scoId?: number;
};
