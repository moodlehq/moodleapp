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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoreNavigationBarItem } from '@components/navigation-bar/navigation-bar';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreTimeUtils } from '@services/utils/time';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonModScormDataModel12 } from '../../classes/data-model-12';
import {
    AddonModScorm,
    AddonModScormAttemptCountResult,
    AddonModScormGetScormAccessInformationWSResponse,
    AddonModScormScorm,
    AddonModScormScoWithData,
    AddonModScormUserDataMap,
} from '../../services/scorm';
import { AddonModScormHelper, AddonModScormTOCScoWithIcon } from '../../services/scorm-helper';
import { AddonModScormSync } from '../../services/scorm-sync';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import {
    ADDON_MOD_SCORM_COMPONENT,
    AddonModScormMode,
    ADDON_MOD_SCORM_GO_OFFLINE_EVENT,
    ADDON_MOD_SCORM_LAUNCH_NEXT_SCO_EVENT,
    ADDON_MOD_SCORM_LAUNCH_PREV_SCO_EVENT,
    ADDON_MOD_SCORM_UPDATE_TOC_EVENT,
} from '../../constants';
import { CoreWait } from '@singletons/wait';
import { CoreModals } from '@services/overlays/modals';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that allows playing a SCORM.
 */
@Component({
    selector: 'page-addon-mod-scorm-player',
    templateUrl: 'player.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModScormPlayerPage implements OnInit, OnDestroy {

    title?: string; // Title.
    scorm!: AddonModScormScorm; // The SCORM object.
    showToc = false; // Whether to show the table of contents (TOC).
    loadingToc = true; // Whether the TOC is being loaded.
    toc: AddonModScormTOCScoWithIcon[] = []; // List of SCOs.
    loaded = false; // Whether the data has been loaded.
    src?: string; // Iframe src.
    errorMessage?: string; // Error message.
    accessInfo?: AddonModScormGetScormAccessInformationWSResponse; // Access information.
    scormWidth?: number; // Width applied to scorm iframe.
    scormHeight?: number; // Height applied to scorm iframe.
    incomplete = false; // Whether last attempt is incomplete.
    cmId!: number; // Course module ID.
    courseId!: number; // Course ID.
    navigationItems: CoreNavigationBarItem<AddonModScormTOCScoWithIcon>[] = [];

    protected siteId!: string;
    protected mode!: AddonModScormMode; // Mode to play the SCORM.
    protected moduleUrl!: string; // Module URL.
    protected newAttempt = false; // Whether to start a new attempt.
    protected organizationId?: string; // Organization ID to load.
    protected attempt = 0; // The attempt number.
    protected offline = false; // Whether it's offline mode.
    protected userData?: AddonModScormUserDataMap; // User data.
    protected initialScoId?: number; // Initial SCO ID to load.
    protected currentSco?: AddonModScormScoWithData; // Current SCO.
    protected dataModel?: AddonModScormDataModel12; // Data Model.
    protected attemptToContinue?: number; // Attempt to continue (for the popover).

    // Observers.
    protected tocObserver?: CoreEventObserver;
    protected launchNextObserver?: CoreEventObserver;
    protected launchPrevObserver?: CoreEventObserver;
    protected goOfflineObserver?: CoreEventObserver;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.mode = CoreNavigator.getRouteParam('mode') || AddonModScormMode.NORMAL;
            this.moduleUrl = CoreNavigator.getRouteParam('moduleUrl') || '';
            this.newAttempt = !!CoreNavigator.getRouteBooleanParam('newAttempt');
            this.organizationId = CoreNavigator.getRouteParam('organizationId');
            this.initialScoId = CoreNavigator.getRouteNumberParam('scoId');
            this.siteId = CoreSites.getRequiredCurrentSite().getId();
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        try {
            // Fetch the SCORM data.
            await this.fetchData();

            if (!this.currentSco) {
                CoreNavigator.back();

                return;
            }

            // Set start time if it's a new attempt.
            if (this.newAttempt) {
                try {
                    await this.setStartTime(this.currentSco.id);
                } catch (error) {
                    CoreAlerts.showError(error, { default: Translate.instant('addon.mod_scorm.errorgetscorm') });
                }
            }

            // Load SCO.
            this.loadSco(this.currentSco);
        } finally {
            this.loaded = true;
        }

    }

    get canSaveTracks(): boolean {
        return !this.accessInfo || !!this.accessInfo.cansavetrack;
    }

    /**
     * Initialize.
     *
     * @returns Promise resolved when done.
     */
    protected async initialize(): Promise<void> {
        // Get the SCORM instance.
        this.scorm = await AddonModScorm.getScorm(this.courseId, this.cmId, {
            moduleUrl: this.moduleUrl,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
        });

        // Block the SCORM so it cannot be synchronized.
        CoreSync.blockOperation(ADDON_MOD_SCORM_COMPONENT, this.scorm.id, 'player');

        // We use SCORM name at start, later we'll use the SCO title.
        this.title = this.scorm.name;
        this.showToc = AddonModScorm.displayTocInPlayer(this.scorm);

        if (this.scorm.popup) {
            // If we receive a value > 100 we assume it's a fixed pixel size.
            if (this.scorm.width && this.scorm.width > 100) {
                this.scormWidth = this.scorm.width;

                // Only get fixed size on height if width is also fixed.
                if (this.scorm.height && this.scorm.height > 100) {
                    this.scormHeight = this.scorm.height;
                }
            }
        }

        // Listen for events to update the TOC, navigate through SCOs and go offline.
        this.tocObserver = CoreEvents.on(ADDON_MOD_SCORM_UPDATE_TOC_EVENT, (data) => {
            if (data.scormId !== this.scorm.id) {
                return;
            }

            if (this.offline) {
                // Wait a bit to make sure data is stored.
                setTimeout(() => this.refreshToc(), 100);
            } else {
                this.refreshToc();
            }
        }, this.siteId);

        this.launchNextObserver = CoreEvents.on(ADDON_MOD_SCORM_LAUNCH_NEXT_SCO_EVENT, (data) => {
            if (data.scormId === this.scorm.id && this.currentSco) {
                const nextSco = AddonModScormHelper.getNextScoFromToc(this.toc, this.currentSco.id);
                if (nextSco) {
                    this.loadSco(nextSco);
                }
            }
        }, this.siteId);

        this.launchPrevObserver = CoreEvents.on(ADDON_MOD_SCORM_LAUNCH_PREV_SCO_EVENT, (data) => {
            if (data.scormId === this.scorm.id && this.currentSco) {
                const previousSco = AddonModScormHelper.getPreviousScoFromToc(this.toc, this.currentSco.id);
                if (previousSco) {
                    this.loadSco(previousSco);
                }
            }
        }, this.siteId);

        this.goOfflineObserver = CoreEvents.on(ADDON_MOD_SCORM_GO_OFFLINE_EVENT, (data) => {
            if (data.scormId !== this.scorm.id || this.offline) {
                return;
            }
            this.offline = true;

            // Wait a bit to prevent collisions between this store and SCORM API's store.
            setTimeout(async () => {
                try {
                    AddonModScormHelper.convertAttemptToOffline(this.scorm, this.attempt);
                } catch (error) {
                    CoreAlerts.showError(error, { default: Translate.instant('core.error') });
                }

                this.refreshToc();
            }, 200);
        }, this.siteId);
    }

    /**
     * Calculate the next and previous SCO.
     *
     * @param scoId Current SCO ID.
     */
    protected calculateNavigationItems(scoId: number): void {
        this.navigationItems = this.toc
            .filter((item) => item.isvisible)
            .map<CoreNavigationBarItem<AddonModScormTOCScoWithIcon>>((item) =>
            ({
                item: item,
                title: item.title,
                current: item.id == scoId,
                enabled: !!(item.prereq && item.launch),
            }));
    }

    /**
     * Determine the attempt to use, the mode (normal/preview) and if it's offline or online.
     *
     * @param attemptsData Attempts count.
     * @param accessInfo Access info.
     * @returns Promise resolved when done.
     */
    protected async determineAttemptAndMode(
        attemptsData: AddonModScormAttemptCountResult,
        accessInfo: AddonModScormGetScormAccessInformationWSResponse,
    ): Promise<void> {
        const data = await AddonModScormHelper.determineAttemptToContinue(this.scorm, attemptsData);

        let incomplete = false;
        this.attempt = data.num;
        this.offline = data.offline;

        if (this.attempt != attemptsData.lastAttempt.num) {
            this.attemptToContinue = this.attempt;
        }

        // Check if current attempt is incomplete.
        if (this.attempt > 0) {
            incomplete = await AddonModScorm.isAttemptIncomplete(this.scorm.id, this.attempt, {
                offline: this.offline,
                cmId: this.cmId,
            });
        }

        // Determine mode and attempt to use.
        const result = AddonModScorm.determineAttemptAndMode(
            this.scorm,
            this.mode,
            this.attempt,
            this.newAttempt,
            incomplete,
            accessInfo.cansavetrack,
        );

        if (result.attempt > this.attempt) {
            // We're creating a new attempt.
            if (this.offline) {
                // Last attempt was offline, so we'll create a new offline attempt.
                await AddonModScormHelper.createOfflineAttempt(this.scorm, result.attempt, attemptsData.online.length);
            } else {
                try {
                    // Last attempt was online, verify that we can create a new online attempt. We ignore cache.
                    await AddonModScorm.getScormUserData(this.scorm.id, result.attempt, {
                        cmId: this.cmId,
                        readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                    });
                } catch {
                    // Cannot communicate with the server, create an offline attempt.
                    this.offline = true;

                    await AddonModScormHelper.createOfflineAttempt(this.scorm, result.attempt, attemptsData.online.length);
                }
            }
        }

        this.mode = result.mode;
        this.newAttempt = result.newAttempt;
        this.attempt = result.attempt;
    }

    /**
     * Fetch data needed to play the SCORM.
     */
    protected async fetchData(): Promise<void> {
        if (!this.scorm) {
            await this.initialize();
        }

        // Wait for any ongoing sync to finish. We won't sync a SCORM while it's being played.
        await AddonModScormSync.waitForSync(this.scorm.id);

        try {
            // Get attempts data.
            const [attemptsData, accessInfo] = await Promise.all([
                AddonModScorm.getAttemptCount(this.scorm.id, { cmId: this.cmId }),
                AddonModScorm.getAccessInformation(this.scorm.id, {
                    cmId: this.cmId,
                }),
            ]);

            this.accessInfo = accessInfo;

            await this.determineAttemptAndMode(attemptsData, accessInfo);

            const [data] = await Promise.all([
                AddonModScorm.getScormUserData(this.scorm.id, this.attempt, {
                    cmId: this.cmId,
                    offline: this.offline,
                }),
                this.fetchToc(),
            ]);

            this.userData = data;
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_scorm.errorgetscorm') });
        }
    }

    /**
     * Fetch the TOC.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchToc(): Promise<void> {
        this.loadingToc = true;

        try {
            // We need to check incomplete again: attempt number or status might have changed.
            this.incomplete = await AddonModScorm.isAttemptIncomplete(this.scorm.id, this.attempt, {
                offline: this.offline,
                cmId: this.cmId,
            });

            // Get TOC.
            this.toc = await AddonModScormHelper.getToc(this.scorm.id, this.attempt, this.incomplete, {
                organization: this.organizationId,
                offline: this.offline,
                cmId: this.cmId,
            });

            if (this.currentSco) {
                return;
            }

            if (this.newAttempt) {
                // Creating a new attempt, use the first SCO defined by the SCORM.
                this.initialScoId = this.scorm.launch;
            }

            // Determine current SCO if we received an ID.
            if (this.initialScoId && this.initialScoId > 0) {
                // SCO set by parameter, get it from TOC.
                this.currentSco = AddonModScormHelper.getScoFromToc(this.toc, this.initialScoId);
            }

            if (this.currentSco) {
                return;
            }

            // No SCO defined. Get the first valid one.
            const sco = await AddonModScormHelper.getFirstSco(this.scorm.id, this.attempt, {
                toc: this.toc,
                organization: this.organizationId,
                mode: this.mode,
                offline: this.offline,
                cmId: this.cmId,
            });

            if (sco) {
                this.currentSco = sco;
            } else {
                // We couldn't find a SCO to load: they're all inactive or without launch URL.
                this.errorMessage = 'addon.mod_scorm.errornovalidsco';
            }
        } finally {
            this.loadingToc = false;
        }
    }

    /**
     * Load a SCO.
     *
     * @param sco The SCO to load.
     * @returns Promise resolved when done.
     */
    async loadSco(sco: AddonModScormScoWithData): Promise<void> {
        if (!this.dataModel) {
            // Create the model.
            this.dataModel = new AddonModScormDataModel12(
                this.siteId,
                this.scorm,
                sco.id,
                this.attempt,
                this.userData ?? {},
                this.mode,
                this.offline,
                this.canSaveTracks,
            );

            // Add the model to the window so the SCORM can access it.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any> window).API = this.dataModel;
        } else {
            // Changing SCO. First unload the existing SCO to make sure the callback to send the data has been called.
            this.src = '';

            await CoreWait.nextTick();

            // Load the SCO in the existing model.
            this.dataModel.loadSco(sco.id);
        }

        this.currentSco = sco;
        this.title = sco.title || this.scorm.name; // Try to use SCO title.

        this.calculateNavigationItems(sco.id);

        // Load the SCO source.
        this.src = await AddonModScorm.getScoSrc(this.scorm, sco);

        if (sco.scormtype == 'asset') {
            // Mark the asset as completed.
            this.markCompleted(sco);
        }

        this.logEvent(sco.id);
    }

    /**
     * Given an SCO, mark it as completed.
     *
     * @param sco SCO to mark.
     * @returns Promise resolved when done.
     */
    protected async markCompleted(sco: AddonModScormScoWithData): Promise<void> {
        if (!this.canSaveTracks) {
            return;
        }

        const tracks = [{
            element: 'cmi.core.lesson_status',
            value: 'completed',
        }];

        try {
            AddonModScorm.saveTracks(sco.id, this.attempt, tracks, this.scorm, this.offline);
        } catch {
            // Error saving data. Go offline if needed.
            if (this.offline) {
                return;
            }

            const data = await AddonModScorm.getScormUserData(this.scorm.id, this.attempt, {
                cmId: this.cmId,
            });

            if (data[sco.id] && data[sco.id].userdata['cmi.core.lesson_status'] == 'completed') {
                // Already marked as completed.
                return;
            }

            try {
                // Go offline.
                await AddonModScormHelper.convertAttemptToOffline(this.scorm, this.attempt);

                this.offline = true;
                this.dataModel?.setOffline(true);

                await AddonModScorm.saveTracks(sco.id, this.attempt, tracks, this.scorm, true);
            } catch (error) {
                CoreAlerts.showError(error, { default: Translate.instant('core.error') });
            }
        } finally {
            // Refresh TOC, some prerequisites might have changed.
            this.refreshToc();
        }
    }

    /**
     * Show the TOC.
     */
    async openToc(): Promise<void> {
        const { AddonModScormTocComponent } = await import('../../components/toc/toc');

        const modalData = await CoreModals.openSideModal<AddonModScormScoWithData>({
            component: AddonModScormTocComponent,
            componentProps: {
                toc: this.toc,
                attemptToContinue: this.attemptToContinue,
                selected: this.currentSco && this.currentSco.id,
                moduleId: this.cmId,
                courseId: this.courseId,
                accessInfo: this.accessInfo,
                mode: this.mode,
            },
        });

        if (modalData) {
            this.loadSco(modalData);
        }
    }

    /**
     * Refresh the TOC.
     *
     * @returns Promise resolved when done.
     */
    protected async refreshToc(): Promise<void> {
        try {
            await CorePromiseUtils.ignoreErrors(AddonModScorm.invalidateAllScormData(this.scorm.id));

            await this.fetchToc();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_scorm.errorgetscorm') });
        }
    }

    /**
     * Set SCORM start time.
     *
     * @param scoId SCO ID.
     * @returns Promise resolved when done.
     */
    protected async setStartTime(scoId: number): Promise<void> {
        if (!this.canSaveTracks) {
            return;
        }

        const tracks = [{
            element: 'x.start.time',
            value: String(CoreTimeUtils.timestamp()),
        }];

        await AddonModScorm.saveTracks(scoId, this.attempt, tracks, this.scorm, this.offline);

        if (this.offline) {
            return;
        }

        // New online attempt created, update cached data about online attempts.
        await CorePromiseUtils.ignoreErrors(AddonModScorm.getAttemptCount(this.scorm.id, {
            cmId: this.cmId,
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
        }));
    }

    /**
     * Log event.
     */
    protected async logEvent(scoId: number): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonModScorm.logLaunchSco(this.scorm.id, scoId));

        let url = '/mod/scorm/player.php';
        if (this.scorm.popup) {
            url += `?a=${this.scorm.id}&currentorg=${this.organizationId}&scoid=${scoId}` +
                `&display=popup&mode=${this.mode}`;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'mod_scorm_get_scorm_user_data',
            name: this.scorm.name,
            data: { id: this.scorm.id, scoid: scoId, organization: this.organizationId, category: 'scorm' },
            url,
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        // Empty src when leaving the state so unload event is triggered in the iframe.
        this.src = '';
        CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'scorm' });

        // Stop listening for events.
        this.tocObserver?.off();
        this.launchNextObserver?.off();
        this.launchPrevObserver?.off();
        setTimeout(() => {
            this.goOfflineObserver?.off();
        }, 500);

        // Unblock the SCORM so it can be synced.
        CoreSync.unblockOperation(ADDON_MOD_SCORM_COMPONENT, this.scorm.id, 'player');
    }

}
