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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicPage, NavParams, ModalController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreIonTabsComponent } from '@components/ion-tabs/ion-tabs';
import { AddonModScormProvider, AddonModScormAttemptCountResult } from '../../providers/scorm';
import { AddonModScormHelperProvider } from '../../providers/helper';
import { AddonModScormSyncProvider } from '../../providers/scorm-sync';
import { AddonModScormDataModel12 } from '../../classes/data-model-12';

/**
 * Page that allows playing a SCORM.
 */
@IonicPage({ segment: 'addon-mod-scorm-player' })
@Component({
    selector: 'page-addon-mod-scorm-player',
    templateUrl: 'player.html',
})
export class AddonModScormPlayerPage implements OnInit, OnDestroy {

    title: string; // Title.
    scorm: any; // The SCORM object.
    showToc: boolean; // Whether to show the table of contents (TOC).
    loadingToc = true; // Whether the TOC is being loaded.
    toc: any[]; // List of SCOs.
    loaded: boolean; // Whether the data has been loaded.
    previousSco: any; // Previous SCO.
    nextSco: any; // Next SCO.
    src: string; // Iframe src.
    errorMessage: string; // Error message.

    protected siteId: string;
    protected mode: string; // Mode to play the SCORM.
    protected newAttempt: boolean; // Whether to start a new attempt.
    protected organizationId: string; // Organization ID to load.
    protected attempt: number; // The attempt number.
    protected offline = false; // Whether it's offline mode.
    protected userData: any; // User data.
    protected initialScoId: number; // Initial SCO ID to load.
    protected currentSco: any; // Current SCO.
    protected dataModel: AddonModScormDataModel12; // Data Model.
    protected attemptToContinue: number; // Attempt to continue (for the popover).

    // Observers.
    protected tocObserver: any;
    protected launchNextObserver: any;
    protected launchPrevObserver: any;
    protected goOfflineObserver: any;

    constructor(navParams: NavParams, protected modalCtrl: ModalController, protected eventsProvider: CoreEventsProvider,
            protected sitesProvider: CoreSitesProvider, protected syncProvider: CoreSyncProvider,
            protected domUtils: CoreDomUtilsProvider, protected timeUtils: CoreTimeUtilsProvider,
            protected scormProvider: AddonModScormProvider, protected scormHelper: AddonModScormHelperProvider,
            protected scormSyncProvider: AddonModScormSyncProvider, protected tabs: CoreIonTabsComponent) {

        this.scorm = navParams.get('scorm') || {};
        this.mode = navParams.get('mode') || AddonModScormProvider.MODENORMAL;
        this.newAttempt = !!navParams.get('newAttempt');
        this.organizationId = navParams.get('organizationId');
        this.initialScoId = navParams.get('scoId');
        this.siteId = this.sitesProvider.getCurrentSiteId();

        // We use SCORM name at start, later we'll use the SCO title.
        this.title = this.scorm.name;

        // Block the SCORM so it cannot be synchronized.
        this.syncProvider.blockOperation(AddonModScormProvider.COMPONENT, this.scorm.id, 'player');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {

        this.showToc = this.scormProvider.displayTocInPlayer(this.scorm);

        if (this.scorm.popup) {
            this.tabs.changeVisibility(false);

            // If we receive a value <= 100 we need to assume it's a percentage.
            if (this.scorm.width <= 100) {
                this.scorm.width = this.scorm.width + '%';
            }
            if (this.scorm.height <= 100) {
                this.scorm.height = this.scorm.height + '%';
            }
        }

        // Fetch the SCORM data.
        this.fetchData().then(() => {
            if (this.currentSco) {
                // Set start time if it's a new attempt.
                const promise = this.newAttempt ? this.setStartTime(this.currentSco.id) : Promise.resolve();

                return promise.catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'addon.mod_scorm.errorgetscorm', true);
                }).finally(() => {
                    // Load SCO.
                    this.loadSco(this.currentSco);
                });
            }
        }).finally(() => {
            this.loaded = true;
        });

        // Listen for events to update the TOC, navigate through SCOs and go offline.
        this.tocObserver = this.eventsProvider.on(AddonModScormProvider.UPDATE_TOC_EVENT, (data) => {
            if (data.scormId === this.scorm.id) {
                if (this.offline) {
                    // Wait a bit to make sure data is stored.
                    setTimeout(this.refreshToc.bind(this), 100);
                } else {
                    this.refreshToc();
                }
            }
        }, this.siteId);

        this.launchNextObserver = this.eventsProvider.on(AddonModScormProvider.LAUNCH_NEXT_SCO_EVENT, (data) => {
            if (data.scormId === this.scorm.id && this.nextSco) {
                this.loadSco(this.nextSco);
            }
        }, this.siteId);

        this.launchPrevObserver = this.eventsProvider.on(AddonModScormProvider.LAUNCH_PREV_SCO_EVENT, (data) => {
            if (data.scormId === this.scorm.id && this.previousSco) {
                this.loadSco(this.previousSco);
            }
        }, this.siteId);

        this.goOfflineObserver = this.eventsProvider.on(AddonModScormProvider.GO_OFFLINE_EVENT, (data) => {
            if (data.scormId === this.scorm.id && !this.offline) {
                this.offline = true;

                // Wait a bit to prevent collisions between this store and SCORM API's store.
                setTimeout(() => {
                    this.scormHelper.convertAttemptToOffline(this.scorm, this.attempt).catch((error) => {
                        this.domUtils.showErrorModalDefault(error, 'core.error', true);
                    }).then(() => {
                        this.refreshToc();
                    });
                }, 200);
            }
        }, this.siteId);
    }

    /**
     * Calculate the next and previous SCO.
     *
     * @param {number} scoId Current SCO ID.
     */
    protected calculateNextAndPreviousSco(scoId: number): void {
        this.previousSco = this.scormHelper.getPreviousScoFromToc(this.toc, scoId);
        this.nextSco = this.scormHelper.getNextScoFromToc(this.toc, scoId);
    }

    /**
     * Determine the attempt to use, the mode (normal/preview) and if it's offline or online.
     *
     * @param {AddonModScormAttemptCountResult} attemptsData Attempts count.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected determineAttemptAndMode(attemptsData: AddonModScormAttemptCountResult): Promise<any> {
        let result;

        return this.scormHelper.determineAttemptToContinue(this.scorm, attemptsData).then((data) => {
            this.attempt = data.number;
            this.offline = data.offline;

            if (this.attempt != attemptsData.lastAttempt.number) {
                this.attemptToContinue = this.attempt;
            }

            // Check if current attempt is incomplete.
            if (this.attempt > 0) {
                return this.scormProvider.isAttemptIncomplete(this.scorm.id, this.attempt, this.offline);
            } else {
                // User doesn't have attempts. Last attempt is not incomplete (since he doesn't have any).
                return false;
            }
        }).then((incomplete) => {
            // Determine mode and attempt to use.
            result = this.scormProvider.determineAttemptAndMode(this.scorm, this.mode, this.attempt, this.newAttempt, incomplete);

            if (result.attempt > this.attempt) {
                // We're creating a new attempt.
                if (this.offline) {
                    // Last attempt was offline, so we'll create a new offline attempt.
                    return this.scormHelper.createOfflineAttempt(this.scorm, result.attempt, attemptsData.online.length);
                } else {
                    // Last attempt was online, verify that we can create a new online attempt. We ignore cache.
                    return this.scormProvider.getScormUserData(this.scorm.id, result.attempt, undefined, false, true).catch(() => {
                        // Cannot communicate with the server, create an offline attempt.
                        this.offline = true;

                        return this.scormHelper.createOfflineAttempt(this.scorm, result.attempt, attemptsData.online.length);
                    });
                }
            }
        }).then(() => {
            this.mode = result.mode;
            this.newAttempt = result.newAttempt;
            this.attempt = result.attempt;
        });
    }

    /**
     * Fetch data needed to play the SCORM.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchData(): Promise<any> {
        // Wait for any ongoing sync to finish. We won't sync a SCORM while it's being played.
        return this.scormSyncProvider.waitForSync(this.scorm.id).then(() => {
            // Get attempts data.
            return this.scormProvider.getAttemptCount(this.scorm.id).then((attemptsData) => {
                return this.determineAttemptAndMode(attemptsData).then(() => {
                    // Fetch TOC and get user data.
                    const promises = [];

                    promises.push(this.fetchToc());
                    promises.push(this.scormProvider.getScormUserData(this.scorm.id, this.attempt, undefined, this.offline)
                            .then((data) => {
                        this.userData = data;
                    }));

                    return Promise.all(promises);
                });
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'addon.mod_scorm.errorgetscorm', true);
            });
        });
    }

    /**
     * Fetch the TOC.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchToc(): Promise<any> {
        this.loadingToc = true;

        // We need to check incomplete again: attempt number or status might have changed.
        return this.scormProvider.isAttemptIncomplete(this.scorm.id, this.attempt, this.offline).then((incomplete) => {
            this.scorm.incomplete = incomplete;

            // Get TOC.
            return this.scormProvider.getOrganizationToc(this.scorm.id, this.attempt, this.organizationId, this.offline);
        }).then((toc) => {
            this.toc = this.scormProvider.formatTocToArray(toc);

            // Get images for each SCO.
            this.toc.forEach((sco) => {
                sco.image = this.scormProvider.getScoStatusIcon(sco, this.scorm.incomplete);
            });

            // Determine current SCO if we received an ID..
            if (this.initialScoId > 0) {
                // SCO set by parameter, get it from TOC.
                this.currentSco = this.scormHelper.getScoFromToc(this.toc, this.initialScoId);
            }

            if (!this.currentSco) {
                // No SCO defined. Get the first valid one.
                return this.scormHelper.getFirstSco(this.scorm.id, this.attempt, this.toc, this.organizationId, this.offline)
                        .then((sco) => {

                    if (sco) {
                        this.currentSco = sco;
                    } else {
                        // We couldn't find a SCO to load: they're all inactive or without launch URL.
                        this.errorMessage = 'addon.mod_scorm.errornovalidsco';
                    }
                });
            }
        }).finally(() => {
            this.loadingToc = false;
        });
    }

    /**
     * Page will leave.
     */
    ionViewWillUnload(): void {
        // Empty src when leaving the state so unload event is triggered in the iframe.
        this.src = '';
    }

    /**
     * Load a SCO.
     *
     * @param {any} sco The SCO to load.
     */
    protected loadSco(sco: any): void {
        if (!this.dataModel) {
            // Create the model.
            this.dataModel = new AddonModScormDataModel12(this.eventsProvider, this.scormProvider, this.siteId, this.scorm, sco.id,
                    this.attempt, this.userData, this.mode, this.offline);

            // Add the model to the window so the SCORM can access it.
            (<any> window).API = this.dataModel;
        } else {
            // Load the SCO in the existing model.
            this.dataModel.loadSco(sco.id);
        }

        this.currentSco = sco;
        this.title = sco.title || this.scorm.name; // Try to use SCO title.

        this.calculateNextAndPreviousSco(sco.id);

        // Load the SCO source.
        this.scormProvider.getScoSrc(this.scorm, sco).then((src) => {
            if (src == this.src) {
                // Re-loading same page. Set it to empty and then re-set the src in the next digest so it detects it has changed.
                this.src = '';

                setTimeout(() => {
                    this.src = src;
                });
            } else {
                this.src = src;
            }
        });

        if (sco.scormtype == 'asset') {
            // Mark the asset as completed.
            const tracks = [{
                element: 'cmi.core.lesson_status',
                value: 'completed'
            }];

            this.scormProvider.saveTracks(sco.id, this.attempt, tracks, this.scorm, this.offline).catch(() => {
                // Error saving data. We'll go offline if we're online and the asset is not marked as completed already.
                if (!this.offline) {
                    return this.scormProvider.getScormUserData(this.scorm.id, this.attempt, undefined, false).then((data) => {
                        if (!data[sco.id] || data[sco.id].userdata['cmi.core.lesson_status'] != 'completed') {
                            // Go offline.
                            return this.scormHelper.convertAttemptToOffline(this.scorm, this.attempt).then(() => {
                                this.offline = true;
                                this.dataModel.setOffline(true);

                                return this.scormProvider.saveTracks(sco.id, this.attempt, tracks, this.scorm, true);
                            }).catch((error) => {
                                this.domUtils.showErrorModalDefault(error, 'core.error', true);
                            });
                        }
                    });
                }
            }).then(() => {
                // Refresh TOC, some prerequisites might have changed.
                this.refreshToc();
            });
        }

        // Trigger SCO launch event.
        this.scormProvider.logLaunchSco(this.scorm.id, sco.id, this.scorm.name).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Show the TOC.
     *
     * @param {MouseEvent} event Event.
     */
    openToc(event: MouseEvent): void {
        const modal = this.modalCtrl.create('AddonModScormTocPage', {
            toc: this.toc,
            attemptToContinue: this.attemptToContinue,
            mode: this.mode,
            selected: this.currentSco && this.currentSco.id
        }, { cssClass: 'core-modal-lateral',
            showBackdrop: true,
            enableBackdropDismiss: true,
            enterAnimation: 'core-modal-lateral-transition',
            leaveAnimation: 'core-modal-lateral-transition' });

        // If the modal sends back a SCO, load it.
        modal.onDidDismiss((sco) => {
            if (sco) {
                this.loadSco(sco);
            }
        });

        modal.present({
            ev: event
        });
    }

    /**
     * Refresh the TOC.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected refreshToc(): Promise<any> {
        return this.scormProvider.invalidateAllScormData(this.scorm.id).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fetchToc();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_scorm.errorgetscorm', true);
        });
    }

    /**
     * Set SCORM start time.
     *
     * @param {number} scoId SCO ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected setStartTime(scoId: number): Promise<any> {
        const tracks = [{
            element: 'x.start.time',
            value: this.timeUtils.timestamp()
        }];

        return this.scormProvider.saveTracks(scoId, this.attempt, tracks, this.scorm, this.offline).then(() => {
            if (!this.offline) {
                // New online attempt created, update cached data about online attempts.
                this.scormProvider.getAttemptCount(this.scorm.id, false, true).catch(() => {
                    // Ignore errors.
                });
            }
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        // Stop listening for events.
        this.tocObserver && this.tocObserver.off();
        this.launchNextObserver && this.launchNextObserver.off();
        this.launchPrevObserver && this.launchPrevObserver.off();
        setTimeout(() => {
            this.goOfflineObserver && this.goOfflineObserver.off();
        }, 500);

        // Unblock the SCORM so it can be synced.
        this.syncProvider.unblockOperation(AddonModScormProvider.COMPONENT, this.scorm.id, 'player');
        this.tabs.changeVisibility(true);
    }
}
