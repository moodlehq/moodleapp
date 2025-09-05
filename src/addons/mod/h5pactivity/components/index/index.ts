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

import { Component, OnInit, OnDestroy, Output, EventEmitter, effect } from '@angular/core';
import { DownloadStatus } from '@/core/constants';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreH5PDisplayOptions } from '@features/h5p/classes/core';
import { CoreH5PHelper } from '@features/h5p/classes/helper';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreXAPIOffline } from '@features/xapi/services/offline';
import { CoreXAPI } from '@features/xapi/services/xapi';
import { CoreNetwork } from '@services/network';
import { CoreFilepool } from '@services/filepool';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreWSFile } from '@services/ws';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    AddonModH5PActivity,
    AddonModH5PActivityAccessInfo,
    AddonModH5PActivityData,
    AddonModH5PActivityXAPIPostStateData,
    AddonModH5PActivityXAPIStateData,
    AddonModH5PActivityXAPIStatementsData,
} from '../../services/h5pactivity';
import {
    AddonModH5PActivitySync,
    AddonModH5PActivitySyncResult,
} from '../../services/h5pactivity-sync';
import { CoreFileHelper } from '@services/file-helper';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import {
    ADDON_MOD_H5PACTIVITY_AUTO_SYNCED,
    ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
    ADDON_MOD_H5PACTIVITY_PAGE_NAME,
    ADDON_MOD_H5PACTIVITY_STATE_ID,
    ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT,
} from '../../constants';
import { CoreH5PMissingDependenciesError } from '@features/h5p/classes/errors/missing-dependencies-error';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreH5PIframeComponent } from '@features/h5p/components/h5p-iframe/h5p-iframe';

/**
 * Component that displays an H5P activity entry page.
 */
@Component({
    selector: 'addon-mod-h5pactivity-index',
    templateUrl: 'addon-mod-h5pactivity-index.html',
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
        CoreH5PIframeComponent,
    ],
})
export class AddonModH5PActivityIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    @Output() onActivityFinish = new EventEmitter<boolean>();

    component = ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY;
    pluginName = 'h5pactivity';

    h5pActivity?: AddonModH5PActivityData; // The H5P activity object.
    accessInfo?: AddonModH5PActivityAccessInfo; // Info about the user capabilities.
    deployedFile?: CoreWSFile; // The H5P deployed file.

    stateMessage?: string; // Message about the file state.
    downloading = false; // Whether the H5P file is being downloaded.
    needsDownload = false; // Whether the file needs to be downloaded.
    percentage?: string; // Download/unzip percentage.
    showPercentage = false; // Whether to show the percentage.
    progressMessage?: string; // Message about download/unzip.
    playing = false; // Whether the package is being played.
    displayOptions?: CoreH5PDisplayOptions; // Display options for the package.
    onlinePlayerUrl?: string; // URL to play the package in online.
    fileUrl?: string; // The fileUrl to use to play the package.
    state?: string; // State of the file.
    siteCanDownload = false;
    trackComponent?: string; // Component for tracking.
    hasOffline = false;
    isOpeningPage = false;
    canViewAllAttempts = false;
    saveStateEnabled = false;
    hasMissingDependencies = false;
    saveFreq?: number;
    contentState?: string;
    readonly isOnline = CoreNetwork.onlineSignal();
    triedToPlay = false;

    protected fetchContentDefaultError = 'addon.mod_h5pactivity.errorgetactivity';
    protected syncEventName = ADDON_MOD_H5PACTIVITY_AUTO_SYNCED;
    protected site: CoreSite;
    protected observer?: CoreEventObserver;
    protected messageListenerFunction: (event: MessageEvent) => Promise<void>;
    protected checkCompletionAfterLog = false; // It's called later, when the user plays the package.
    protected offlineErrorAlert: HTMLIonAlertElement | null = null;

    constructor() {
        super();

        this.site = CoreSites.getRequiredCurrentSite();
        this.siteCanDownload = this.site.canDownloadFiles() && !CoreH5P.isOfflineDisabledInSite();

        // Listen for messages from the iframe.
        this.messageListenerFunction = (event) => this.onIframeMessage(event);
        window.addEventListener('message', this.messageListenerFunction);

        // React to a network status change.
        effect(async () => {
            const online = this.isOnline();

            if (online) {
                if (this.offlineErrorAlert) {
                    // Back online, dismiss the offline error alert.
                    this.offlineErrorAlert.dismiss();
                    this.offlineErrorAlert = null;
                }

                if (this.triedToPlay) {
                    // User couldn't play the package because he was offline, but he reconnected. Try again.
                    this.triedToPlay = false;
                    this.play();
                }

            } else if (this.playing && !this.fileUrl && this.trackComponent) {
                // User lost connection while playing an online package with tracking. Show an error.
                this.offlineErrorAlert = await CoreAlerts.showError(
                    new CoreError(Translate.instant('core.course.changesofflinemaybelost'), {
                        title: Translate.instant('core.youreoffline'),
                    }),
                );
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.loadContent(false, true);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        // Always show loading and stop playing, the package needs to be reloaded with the latest data.
        this.showLoading = true;
        this.playing = false;

        this.h5pActivity = await AddonModH5PActivity.getH5PActivity(this.courseId, this.module.id, {
            siteId: this.siteId,
        });

        this.dataRetrieved.emit(this.h5pActivity);
        this.description = this.h5pActivity.intro;
        this.displayOptions = CoreH5PHelper.decodeDisplayOptions(this.h5pActivity.displayoptions);

        if (sync) {
            await this.syncActivity(showErrors);
        }

        await Promise.all([
            this.checkHasOffline(),
            this.fetchAccessInfo(),
            this.fetchDeployedFileData(),
        ]);

        await this.loadContentState(); // Loading the state requires the access info.

        this.trackComponent = this.h5pActivity.enabletracking && this.accessInfo?.cansubmit ?
            ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT : '';
        this.canViewAllAttempts = !!this.h5pActivity.enabletracking && !!this.accessInfo?.canreviewattempts &&
                AddonModH5PActivity.canGetUsersAttemptsInSite();

        if (this.h5pActivity.package && this.h5pActivity.package[0]) {
            // The online player should use the original file, not the trusted one.
            this.onlinePlayerUrl = CoreH5P.h5pPlayer.calculateOnlinePlayerUrl(
                this.site.getURL(),
                this.h5pActivity.package[0].fileurl,
                this.displayOptions,
                this.trackComponent,
            );
        }

        if (!this.siteCanDownload || this.state === DownloadStatus.DOWNLOADED || this.hasMissingDependencies) {
            // Cannot download the file or already downloaded, play the package directly.
            this.play();

        } else if (
            (this.state == DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED || this.state == DownloadStatus.OUTDATED) &&
            this.isOnline() &&
            this.deployedFile?.filesize &&
            CoreFilepool.shouldDownload(this.deployedFile.filesize)
        ) {
            // Package is small, download and play it automatically. Don't block this function for this.
            this.downloadAndPlay();
        }
    }

    /**
     * Fetch the access info and store it in the right variables.
     *
     * @returns Promise resolved when done.
     */
    protected async checkHasOffline(): Promise<void> {
        if (!this.h5pActivity) {
            return;
        }

        this.hasOffline = await CoreXAPIOffline.contextHasData(this.h5pActivity.context, this.siteId);
    }

    /**
     * Fetch the access info and store it in the right variables.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchAccessInfo(): Promise<void> {
        if (!this.h5pActivity) {
            return;
        }

        this.accessInfo = await AddonModH5PActivity.getAccessInformation(this.h5pActivity.id, {
            cmId: this.module.id,
            siteId: this.siteId,
        });
    }

    /**
     * Fetch the deployed file data if needed and store it in the right variables.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchDeployedFileData(): Promise<void> {
        if (!this.siteCanDownload || !this.h5pActivity) {
            // Cannot download the file, no need to fetch the file data.
            return;
        }

        const deployedFile = await AddonModH5PActivity.getDeployedFile(this.h5pActivity, {
            displayOptions: this.displayOptions,
            siteId: this.siteId,
        });

        this.hasMissingDependencies = await AddonModH5PActivity.hasMissingDependencies(this.module.id, deployedFile);
        if (this.hasMissingDependencies) {
            return;
        }

        this.deployedFile = deployedFile;
        this.fileUrl = CoreFileHelper.getFileUrl(deployedFile);

        // Listen for changes in the state.
        const eventName = await CoreFilepool.getFileEventNameByUrl(this.site.getId(), this.fileUrl);

        if (!this.observer) {
            this.observer = CoreEvents.on(eventName, () => {
                this.calculateFileState();
            });
        }

        await this.calculateFileState();
    }

    /**
     * Load the content's state (if enabled and there's any).
     */
    protected async loadContentState(): Promise<void> {
        if (!this.h5pActivity || !this.accessInfo || !AddonModH5PActivity.isSaveStateEnabled(this.h5pActivity, this.accessInfo)) {
            this.saveStateEnabled = false;
            this.contentState = undefined;

            return;
        }

        this.saveStateEnabled = true;
        this.saveFreq = this.h5pActivity.savestatefreq;

        const contentState = await CoreXAPI.getState(
            ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT,
            this.h5pActivity.context,
            ADDON_MOD_H5PACTIVITY_STATE_ID,
            {
                appComponent: ADDON_MOD_H5PACTIVITY_COMPONENT_LEGACY,
                appComponentId: this.h5pActivity.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
            },
        );

        if (contentState === null) {
            this.contentState = undefined;

            return;
        }

        const contentStateObj = CoreText.parseJSON<{h5p: string}>(contentState, { h5p: '{}' });

        // The H5P state doesn't always use JSON, so an h5p property was added to jsonize it.
        this.contentState = contentStateObj.h5p ?? '{}';
    }

    /**
     * Calculate the state of the deployed file.
     *
     * @returns Promise resolved when done.
     */
    protected async calculateFileState(): Promise<void> {
        if (!this.fileUrl || !this.deployedFile) {
            return;
        }

        this.state = await CoreFilepool.getFileStateByUrl(
            this.site.getId(),
            this.fileUrl,
            this.deployedFile.timemodified,
        );

        this.showFileState();
    }

    /**
     * @inheritdoc
     */
    protected invalidateContent(): Promise<void> {
        return AddonModH5PActivity.invalidateActivityData(this.courseId);
    }

    /**
     * Displays some data based on the state of the main file.
     */
    protected async showFileState(): Promise<void> {
        if (this.state === DownloadStatus.OUTDATED) {
            this.stateMessage = 'addon.mod_h5pactivity.filestateoutdated';
            this.needsDownload = true;
        } else if (this.state === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
            this.stateMessage = 'addon.mod_h5pactivity.filestatenotdownloaded';
            this.needsDownload = true;
        } else if (this.state === DownloadStatus.DOWNLOADING) {
            this.stateMessage = '';

            if (!this.downloading) {
                // It's being downloaded right now but the view isn't tracking it. "Restore" the download.
                await this.downloadDeployedFile();

                this.play();
            }
        } else {
            this.stateMessage = '';
            this.needsDownload = false;
        }
    }

    /**
     * Download the file and play it.
     *
     * @param event Click event.
     */
    async downloadAndPlayManually(event?: MouseEvent): Promise<void> {
        event?.preventDefault();
        event?.stopPropagation();

        if (!this.deployedFile) {
            return;
        }

        if (!this.isOnline()) {
            CoreAlerts.showError(Translate.instant('core.networkerrormsg'));

            return;
        }

        try {
            // Confirm the download if needed.
            await CoreAlerts.confirmDownloadSize({ size: this.deployedFile.filesize || 0, total: true });
        } catch {
            return;
        }

        await this.downloadAndPlay();
    }

    /**
     * Download the file and play it.
     */
    protected async downloadAndPlay(): Promise<void> {
        try {
            await this.downloadDeployedFile();

            if (!this.isDestroyed) {
                this.play();
            }
        } catch (error) {
            if (CoreErrorHelper.isCanceledError(error) || this.isDestroyed) {
                // User cancelled or view destroyed, stop.
                return;
            }

            if (CoreErrorHelper.isNetworkError(error)) {
                CoreAlerts.showError(error, { default: Translate.instant('core.errordownloading') });

                return;
            }

            // Cannot download the file, use online player.
            this.hasMissingDependencies = error instanceof CoreH5PMissingDependenciesError;
            this.fileUrl = undefined;
            this.play();

            CoreToasts.show({
                message: Translate.instant('core.course.activityrequiresconnection'),
                duration: ToastDuration.LONG,
            });
        }
    }

    /**
     * Download athe H5P deployed file or restores an ongoing download.
     *
     * @returns Promise resolved when done.
     */
    protected async downloadDeployedFile(): Promise<void> {
        if (!this.fileUrl || !this.deployedFile) {
            return;
        }

        const deployedFile = this.deployedFile;
        this.downloading = true;
        this.progressMessage = 'core.downloading';

        // Delete offline states when downloading the package because it means the package has changed or user deleted it.
        this.deleteOfflineStates();

        try {
            await CoreFilepool.downloadUrl(
                this.site.getId(),
                this.fileUrl,
                false,
                this.component,
                this.componentId,
                deployedFile.timemodified,
                (data: DownloadProgressData) => {
                    if (!data) {
                        return;
                    }

                    this.percentage = undefined;
                    this.showPercentage = false;

                    if (data.message) {
                        // Show a message.
                        this.progressMessage = data.message;
                    } else if (data.loaded !== undefined) {
                        // Downloading or unzipping.
                        const totalSize = this.progressMessage == 'core.downloading' ? deployedFile.filesize : data.total;

                        if (totalSize !== undefined) {
                            const percentageNumber = (Number(data.loaded / totalSize) * 100);
                            this.percentage = percentageNumber.toFixed(1);
                            this.showPercentage = percentageNumber >= 0 && percentageNumber <= 100;
                        }
                    }
                },
            );

        } finally {
            this.progressMessage = undefined;
            this.percentage = undefined;
            this.showPercentage = false;
            this.downloading = false;
        }
    }

    /**
     * Play the package.
     */
    async play(): Promise<void> {
        if (!this.h5pActivity) {
            return;
        }

        if (!this.fileUrl && !this.isOnline()) {
            this.triedToPlay = true;

            CoreAlerts.showError(new CoreError(Translate.instant('core.connectandtryagain'), {
                title: Translate.instant('core.course.activitynotavailableoffline'),
            }));

            return;
        }

        this.playing = true;

        // Mark the activity as viewed.
        await AddonModH5PActivity.logView(this.h5pActivity.id, this.siteId);

        this.checkCompletion();

        this.analyticsLogEvent('mod_h5pactivity_view_h5pactivity');

        if (!this.fileUrl && this.trackComponent) {
            // User is playing the package in online, invalidate attempts to fetch latest data.
            AddonModH5PActivity.invalidateUserAttempts(this.h5pActivity.id, CoreSites.getCurrentSiteUserId());
        }
    }

    /**
     * Go to view user attempts.
     */
    async viewMyAttempts(): Promise<void> {
        this.isOpeningPage = true;
        const userId = CoreSites.getCurrentSiteUserId();

        try {
            if (!this.fileUrl && this.trackComponent && this.h5pActivity) {
                // User is playing the package in online, invalidate attempts to fetch latest data.
                await AddonModH5PActivity.invalidateUserAttempts(this.h5pActivity.id, CoreSites.getCurrentSiteUserId());
            }

            await CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_H5PACTIVITY_PAGE_NAME}/${this.courseId}/${this.module.id}/userattempts/${userId}`,
            );
        } finally {
            this.isOpeningPage = false;
        }
    }

    /**
     * Go to view all user attempts.
     */
    async viewAllAttempts(): Promise<void> {
        this.isOpeningPage = true;

        try {
            await CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_H5PACTIVITY_PAGE_NAME}/${this.courseId}/${this.module.id}/users`,
            );
        } finally {
            this.isOpeningPage = false;
        }
    }

    /**
     * Treat an iframe message event.
     *
     * @param event Event.
     * @returns Promise resolved when done.
     */
    protected async onIframeMessage(event: MessageEvent): Promise<void> {
        const data = event.data;
        if (!data || !this.h5pActivity) {
            return;
        }

        if (CoreXAPI.canPostStatementsInSite(this.site) && this.isCurrentXAPIPostStatement(data)) {
            this.postStatements(data);
        } else if (this.saveStateEnabled && this.isCurrentXAPIState(data, 'xapi_post_state') && this.isXAPIPostState(data)) {
            this.postState(data);
        } else if (this.saveStateEnabled && this.isCurrentXAPIState(data, 'xapi_delete_state')) {
            this.deleteState(data);
        }
    }

    /**
     * Check if an event is an H5P event meant for this app.
     *
     * @param data Event data.
     * @returns Whether it's an H5P event meant for this app.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected isH5PEventForApp(data: any): boolean {
        return data.environment === 'moodleapp' && data.context === 'h5p';
    }

    /**
     * Check if an activity ID (an IRI) belongs to the current activity.
     *
     * @param activityId Activity ID (IRI).
     * @returns Whether it belongs to the current activity.
     */
    protected activityIdIsCurrentActivity(activityId?: string): boolean {
        if (!activityId || !this.h5pActivity) {
            return false;
        }

        if (!this.site.containsUrl(activityId)) {
            // The event belongs to another site, weird scenario. Maybe some JS running in background.
            return false;
        }

        const match = activityId.match(/xapi\/activity\/(\d+)/);

        return !!match && Number(match[1]) === this.h5pActivity.context;
    }

    /**
     * Check if an event is an XAPI post statement of the current activity.
     *
     * @param data Event data.
     * @returns Whether it's an XAPI post statement of the current activity.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected isCurrentXAPIPostStatement(data: any): data is AddonModH5PActivityXAPIStatementsData {
        if (!this.h5pActivity) {
            return false;
        }

        if (!this.isH5PEventForApp(data) || data.action !== 'xapi_post_statement' || !data.statements) {
            return false;
        }

        // Check the event belongs to this activity.
        return this.activityIdIsCurrentActivity(data.statements[0] && data.statements[0].object && data.statements[0].object.id);
    }

    /**
     * Post statements.
     *
     * @param data Event data.
     */
    protected async postStatements(data: AddonModH5PActivityXAPIStatementsData): Promise<void> {
        if (!this.h5pActivity) {
            return;
        }

        try {
            const options = {
                offline: this.hasOffline,
                courseId: this.courseId,
                extra: this.h5pActivity.name,
                siteId: this.site.getId(),
            };

            const sent = await CoreXAPI.postStatements(
                this.h5pActivity.context,
                data.component,
                JSON.stringify(data.statements),
                options,
            );

            this.hasOffline = !sent;
            this.deleteOfflineStates(); // Posting statements means attempt has finished, delete any offline state.

            if (sent) {
                try {
                    // Invalidate attempts.
                    await AddonModH5PActivity.invalidateUserAttempts(this.h5pActivity.id, undefined, this.siteId);
                } catch {
                    // Ignore errors.
                }

                // Check if the H5P has ended. Final statements don't include a subContentId.
                const hasEnded = data.statements.some(statement => !statement.object.id.includes('subContentId='));
                if (hasEnded) {
                    this.onActivityFinish.emit(hasEnded);
                    this.checkCompletion();
                }
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error sending tracking data.' });
        }
    }

    /**
     * Check if an event is an XAPI state event of the current activity.
     *
     * @param data Event data.
     * @param action Action to check.
     * @returns Whether it's an XAPI state event of the current activity.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected isCurrentXAPIState(data: any, action: string): data is AddonModH5PActivityXAPIStateData {
        if (!this.h5pActivity) {
            return false;
        }

        if (!this.isH5PEventForApp(data) || data.action !== action) {
            return false;
        }

        // Check the event belongs to this activity.
        return this.activityIdIsCurrentActivity(data.activityId);
    }

    /**
     * Check if an xAPI state event data is a post state event.
     *
     * @param data Event data.
     * @returns Whether it's an XAPI post state.
     */
    protected isXAPIPostState(data: AddonModH5PActivityXAPIStateData): data is AddonModH5PActivityXAPIPostStateData {
        return 'stateData' in data;
    }

    /**
     * Post state.
     *
     * @param data Event data.
     */
    protected async postState(data: AddonModH5PActivityXAPIPostStateData): Promise<void> {
        try {
            const options = {
                offline: this.hasOffline,
                courseId: this.courseId,
                extra: this.h5pActivity?.name,
                siteId: this.site.getId(),
            };

            const sent = await CoreXAPI.postState(
                data.component,
                data.activityId,
                data.agent,
                data.stateId,
                data.stateData,
                options,
            );

            this.hasOffline = !sent;
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error sending tracking data.' });
        }
    }

    /**
     * Delete state.
     *
     * @param data Event data.
     */
    protected async deleteState(data: AddonModH5PActivityXAPIStateData): Promise<void> {
        try {
            await CoreXAPI.deleteState(
                data.component,
                data.activityId,
                data.agent,
                data.stateId,
                {
                    siteId: this.site.getId(),
                },
            );
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error sending tracking data.' });
        }
    }

    /**
     * Delete offline states for current activity.
     */
    protected async deleteOfflineStates(): Promise<void> {
        if (!this.h5pActivity) {
            return;
        }

        await CorePromiseUtils.ignoreErrors(CoreXAPIOffline.deleteStates(ADDON_MOD_H5PACTIVITY_TRACK_COMPONENT, {
            itemId: this.h5pActivity.context,
        }));
    }

    /**
     * @inheritdoc
     */
    protected async sync(): Promise<AddonModH5PActivitySyncResult> {
        if (!this.h5pActivity) {
            return {
                updated: false,
                warnings: [],
            };
        }

        return AddonModH5PActivitySync.syncActivity(this.h5pActivity.context, this.site.getId());
    }

    /**
     * @inheritdoc
     */
    protected autoSyncEventReceived(): void {
        this.checkHasOffline();
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.observer?.off();

        // Wait a bit to make sure all messages have been received.
        setTimeout(() => {
            window.removeEventListener('message', this.messageListenerFunction);
        }, 2000);
    }

}

type DownloadProgressData = {
    message?: string;
    loaded?: number;
    total?: number;
};
