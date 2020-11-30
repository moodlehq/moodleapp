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

import { Component, Optional, Injector } from '@angular/core';
import { Content } from 'ionic-angular';

import { CoreApp } from '@providers/app';
import { CoreEvents } from '@providers/events';
import { CoreFilepool } from '@providers/filepool';
import { CoreWSExternalFile } from '@providers/ws';
import { CoreDomUtils } from '@providers/utils/dom';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { CoreH5P } from '@core/h5p/providers/h5p';
import { CoreH5PDisplayOptions } from '@core/h5p/classes/core';
import { CoreH5PHelper } from '@core/h5p/classes/helper';
import { CoreXAPI } from '@core/xapi/providers/xapi';
import { CoreXAPIOffline } from '@core/xapi/providers/offline';
import { CoreConstants } from '@core/constants';
import { CoreSite } from '@classes/site';

import {
    AddonModH5PActivity, AddonModH5PActivityProvider, AddonModH5PActivityData, AddonModH5PActivityAccessInfo
} from '../../providers/h5pactivity';
import { AddonModH5PActivitySyncProvider, AddonModH5PActivitySync } from '../../providers/sync';

/**
 * Component that displays an H5P activity entry page.
 */
@Component({
    selector: 'addon-mod-h5pactivity-index',
    templateUrl: 'addon-mod-h5pactivity-index.html',
})
export class AddonModH5PActivityIndexComponent extends CoreCourseModuleMainActivityComponent {
    component = AddonModH5PActivityProvider.COMPONENT;
    moduleName = 'h5pactivity';

    h5pActivity: AddonModH5PActivityData; // The H5P activity object.
    accessInfo: AddonModH5PActivityAccessInfo; // Info about the user capabilities.
    deployedFile: CoreWSExternalFile; // The H5P deployed file.

    stateMessage: string; // Message about the file state.
    downloading: boolean; // Whether the H5P file is being downloaded.
    needsDownload: boolean; // Whether the file needs to be downloaded.
    percentage: string; // Download/unzip percentage.
    progressMessage: string; // Message about download/unzip.
    playing: boolean; // Whether the package is being played.
    displayOptions: CoreH5PDisplayOptions; // Display options for the package.
    onlinePlayerUrl: string; // URL to play the package in online.
    fileUrl: string; // The fileUrl to use to play the package.
    state: string; // State of the file.
    siteCanDownload: boolean;
    trackComponent: string; // Component for tracking.
    hasOffline: boolean;
    isOpeningPage: boolean;

    protected fetchContentDefaultError = 'addon.mod_h5pactivity.errorgetactivity';
    protected syncEventName = AddonModH5PActivitySyncProvider.AUTO_SYNCED;
    protected site: CoreSite;
    protected observer;
    protected messageListenerFunction: (event: MessageEvent) => Promise<void>;

    constructor(injector: Injector,
            @Optional() protected content: Content) {
        super(injector, content);

        this.site = this.sitesProvider.getCurrentSite();
        this.siteCanDownload = this.site.canDownloadFiles() && !CoreH5P.instance.isOfflineDisabledInSite();

        // Listen for messages from the iframe.
        this.messageListenerFunction = this.onIframeMessage.bind(this);
        window.addEventListener('message', this.messageListenerFunction);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.loadContent();
    }

    /**
     * Check the completion.
     */
    protected checkCompletion(): void {
        this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
    }

    /**
     * Get the activity data.
     *
     * @param refresh If it's refreshing content.
     * @param sync If it should try to sync.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<void> {
        try {
            this.h5pActivity = await AddonModH5PActivity.instance.getH5PActivity(this.courseId, this.module.id, {
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

            this.trackComponent = this.accessInfo.cansubmit ? AddonModH5PActivityProvider.TRACK_COMPONENT : '';

            if (this.h5pActivity.package && this.h5pActivity.package[0]) {
                // The online player should use the original file, not the trusted one.
                this.onlinePlayerUrl = CoreH5P.instance.h5pPlayer.calculateOnlinePlayerUrl(
                            this.site.getURL(), this.h5pActivity.package[0].fileurl, this.displayOptions, this.trackComponent);
            }

            if (!this.siteCanDownload || this.state == CoreConstants.DOWNLOADED) {
                // Cannot download the file or already downloaded, play the package directly.
                this.play();

            } else if ((this.state == CoreConstants.NOT_DOWNLOADED || this.state == CoreConstants.OUTDATED) &&
                    CoreFilepool.instance.shouldDownload(this.deployedFile.filesize) && CoreApp.instance.isOnline()) {
                // Package is small, download it automatically. Don't block this function for this.
                this.downloadAutomatically();
            }
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Fetch the access info and store it in the right variables.
     *
     * @return Promise resolved when done.
     */
    protected async checkHasOffline(): Promise<void> {
        this.hasOffline = await CoreXAPIOffline.instance.contextHasStatements(this.h5pActivity.context, this.siteId);
    }

    /**
     * Fetch the access info and store it in the right variables.
     *
     * @return Promise resolved when done.
     */
    protected async fetchAccessInfo(): Promise<void> {
        this.accessInfo = await AddonModH5PActivity.instance.getAccessInformation(this.h5pActivity.id, {
            cmId: this.module.id,
            siteId: this.siteId,
        });
    }

    /**
     * Fetch the deployed file data if needed and store it in the right variables.
     *
     * @return Promise resolved when done.
     */
    protected async fetchDeployedFileData(): Promise<void> {
        if (!this.siteCanDownload) {
            // Cannot download the file, no need to fetch the file data.
            return;
        }

        this.deployedFile = await AddonModH5PActivity.instance.getDeployedFile(this.h5pActivity, {
            displayOptions: this.displayOptions,
            siteId: this.siteId,
        });

        this.fileUrl = this.deployedFile.fileurl;

        // Listen for changes in the state.
        const eventName = await CoreFilepool.instance.getFileEventNameByUrl(this.siteId, this.deployedFile.fileurl);

        if (!this.observer) {
            this.observer = CoreEvents.instance.on(eventName, () => {
                this.calculateFileState();
            });
        }

        await this.calculateFileState();
    }

    /**
     * Calculate the state of the deployed file.
     *
     * @return Promise resolved when done.
     */
    protected async calculateFileState(): Promise<void> {
        this.state = await CoreFilepool.instance.getFileStateByUrl(this.siteId, this.deployedFile.fileurl,
                this.deployedFile.timemodified);

        this.showFileState();
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
       return AddonModH5PActivity.instance.invalidateActivityData(this.courseId);
    }

    /**
     * Displays some data based on the state of the main file.
     */
    protected showFileState(): void {

        if (this.state == CoreConstants.OUTDATED) {
            this.stateMessage = 'addon.mod_h5pactivity.filestateoutdated';
            this.needsDownload = true;
        } else if (this.state == CoreConstants.NOT_DOWNLOADED) {
            this.stateMessage = 'addon.mod_h5pactivity.filestatenotdownloaded';
            this.needsDownload = true;
        } else if (this.state == CoreConstants.DOWNLOADING) {
            this.stateMessage = '';

            if (!this.downloading) {
                // It's being downloaded right now but the view isn't tracking it. "Restore" the download.
                this.downloadDeployedFile().then(() => {
                    this.play();
                });
            }
        } else {
            this.stateMessage = '';
            this.needsDownload = false;
        }
    }

    /**
     * Download the file and play it.
     *
     * @param e Click event.
     * @return Promise resolved when done.
     */
    async downloadAndPlay(e: MouseEvent): Promise<void> {
        e && e.preventDefault();
        e && e.stopPropagation();

        if (!CoreApp.instance.isOnline()) {
            CoreDomUtils.instance.showErrorModal('core.networkerrormsg', true);

            return;
        }

        try {
            // Confirm the download if needed.
            await CoreDomUtils.instance.confirmDownloadSize({ size: this.deployedFile.filesize, total: true });

            await this.downloadDeployedFile();

            if (!this.isDestroyed) {
                this.play();
            }

        } catch (error) {
            if (CoreDomUtils.instance.isCanceledError(error) || this.isDestroyed) {
                // User cancelled or view destroyed, stop.
                return;
            }

            CoreDomUtils.instance.showErrorModalDefault(error, 'core.errordownloading', true);
        }
    }

    /**
     * Download the file automatically.
     *
     * @return Promise resolved when done.
     */
    protected async downloadAutomatically(): Promise<void> {
        try {
            await this.downloadDeployedFile();

            if (!this.isDestroyed) {
                this.play();
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.errordownloading', true);
        }
    }

    /**
     * Download athe H5P deployed file or restores an ongoing download.
     *
     * @return Promise resolved when done.
     */
    protected async downloadDeployedFile(): Promise<void> {
        this.downloading = true;
        this.progressMessage = 'core.downloading';

        try {
            await CoreFilepool.instance.downloadUrl(this.siteId, this.deployedFile.fileurl, false, this.component, this.componentId,
                    this.deployedFile.timemodified, (data) => {

                if (!data) {
                    return;
                }

                if (data.message) {
                    // Show a message.
                    this.progressMessage = data.message;
                    this.percentage = undefined;
                } else if (typeof data.loaded != 'undefined') {
                    if (this.progressMessage == 'core.downloading') {
                        // Downloading package.
                        this.percentage = (Number(data.loaded / this.deployedFile.filesize) * 100).toFixed(1);
                    } else if (typeof data.total != 'undefined') {
                        // Unzipping package.
                        this.percentage = (Number(data.loaded / data.total) * 100).toFixed(1);
                    } else {
                        this.percentage = undefined;
                    }
                } else {
                    this.percentage = undefined;
                }
            });

        } finally {
            this.progressMessage = undefined;
            this.percentage = undefined;
            this.downloading = false;
        }
    }

    /**
     * Play the package.
     */
    play(): void {
        this.playing = true;

        // Mark the activity as viewed.
        AddonModH5PActivity.instance.logView(this.h5pActivity.id, this.h5pActivity.name, this.siteId);
    }

    /**
     * Go to view user events.
     */
    async viewMyAttempts(): Promise<void> {
        this.isOpeningPage = true;

        try {
            await this.navCtrl.push('AddonModH5PActivityUserAttemptsPage', {
                courseId: this.courseId,
                h5pActivityId: this.h5pActivity.id,
            });
        } finally {
            this.isOpeningPage = false;
        }
    }

    /**
     * Treat an iframe message event.
     *
     * @param event Event.
     * @return Promise resolved when done.
     */
    protected async onIframeMessage(event: MessageEvent): Promise<void> {
        if (!event.data || !CoreXAPI.instance.canPostStatementsInSite(this.site) || !this.isCurrentXAPIPost(event.data)) {
            return;
        }

        try {
            const options = {
                offline: this.hasOffline,
                courseId: this.courseId,
                extra: this.h5pActivity.name,
                siteId: this.site.getId(),
            };

            const sent = await CoreXAPI.instance.postStatements(this.h5pActivity.context, event.data.component,
                    JSON.stringify(event.data.statements), options);

            this.hasOffline = !sent;

            if (sent) {
                try {
                    // Invalidate attempts.
                    await AddonModH5PActivity.instance.invalidateUserAttempts(this.h5pActivity.id, undefined, this.siteId);
                } catch (error) {
                    // Ignore errors.
                }
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error sending tracking data.');
        }
    }

    /**
     * Check if an event is an XAPI post statement of the current activity.
     *
     * @param data Event data.
     * @return Whether it's an XAPI post statement of the current activity.
     */
    protected isCurrentXAPIPost(data: any): boolean {
        if (data.environment != 'moodleapp' || data.context != 'h5p' || data.action != 'xapi_post_statement' || !data.statements) {
            return false;
        }

        // Check the event belongs to this activity.
        const trackingUrl = data.statements[0] && data.statements[0].object && data.statements[0].object.id;
        if (!trackingUrl) {
            return false;
        }

        if (!this.site.containsUrl(trackingUrl)) {
            // The event belongs to another site, weird scenario. Maybe some JS running in background.
            return false;
        }

        const match = trackingUrl.match(/xapi\/activity\/(\d+)/);

        return match && match[1] == this.h5pActivity.context;
    }

    /**
     * Performs the sync of the activity.
     *
     * @return Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return AddonModH5PActivitySync.instance.syncActivity(this.h5pActivity.context, this.site.getId());
    }

    /**
     * An autosync event has been received.
     *
     * @param syncEventData Data receiven on sync observer.
     */
    protected autoSyncEventReceived(syncEventData: any): void {
        this.checkHasOffline();
    }

    /**
     * Go to blog posts.
     *
     * @param event Event.
     */
    async gotoBlog(event: any): Promise<void> {
        this.isOpeningPage = true;

        try {
            await super.gotoBlog(event);
        } finally {
            this.isOpeningPage = false;
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.observer && this.observer.off();
        window.removeEventListener('message', this.messageListenerFunction);
    }
}
