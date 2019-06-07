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

import { Component, Optional, Injector } from '@angular/core';
import { Content, NavController } from 'ionic-angular';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { AddonModScormProvider, AddonModScormAttemptCountResult } from '../../providers/scorm';
import { AddonModScormHelperProvider } from '../../providers/helper';
import { AddonModScormOfflineProvider } from '../../providers/scorm-offline';
import { AddonModScormSyncProvider } from '../../providers/scorm-sync';
import { AddonModScormPrefetchHandler } from '../../providers/prefetch-handler';
import { CoreConstants } from '@core/constants';

/**
 * Component that displays a SCORM entry page.
 */
@Component({
    selector: 'addon-mod-scorm-index',
    templateUrl: 'addon-mod-scorm-index.html',
})
export class AddonModScormIndexComponent extends CoreCourseModuleMainActivityComponent {
    component = AddonModScormProvider.COMPONENT;
    moduleName = 'scorm';

    scorm: any; // The SCORM object.
    currentOrganization: any = {}; // Selected organization.
    scormOptions: any = { // Options to open the SCORM.
        mode: AddonModScormProvider.MODENORMAL,
        newAttempt: false
    };
    modeNormal = AddonModScormProvider.MODENORMAL; // Normal open mode.
    modeBrowser = AddonModScormProvider.MODEBROWSE; // Browser open mode.
    errorMessage: string; // Error message.
    syncTime: string; // Last sync time.
    hasOffline: boolean; // Whether the SCORM has offline data.
    attemptToContinue: number; // The attempt to continue or review.
    statusMessage: string; // Message about the status.
    downloading: boolean; // Whether the SCORM is being downloaded.
    percentage: string; // Download/unzip percentage.
    progressMessage: string; // Message about download/unzip.
    organizations: any[]; // List of organizations.
    loadingToc: boolean; // Whether the TOC is being loaded.
    toc: any[]; // Table of contents (structure).
    accessInfo: any; // Access information.
    skip: boolean; // Launch immediately.

    protected fetchContentDefaultError = 'addon.mod_scorm.errorgetscorm'; // Default error to show when loading contents.
    protected syncEventName = AddonModScormSyncProvider.AUTO_SYNCED;
    protected attempts: AddonModScormAttemptCountResult; // Data about online and offline attempts.
    protected lastAttempt: number; // Last attempt.
    protected lastIsOffline: boolean; // Whether the last attempt is offline.
    protected hasPlayed = false; // Whether the user has opened the player page.
    protected dataSentObserver; // To detect data sent to server.
    protected dataSent = false; // Whether some data was sent to server while playing the SCORM.

    constructor(injector: Injector, protected scormProvider: AddonModScormProvider, @Optional() protected content: Content,
            protected scormHelper: AddonModScormHelperProvider, protected scormOffline: AddonModScormOfflineProvider,
            protected scormSync: AddonModScormSyncProvider, protected prefetchHandler: AddonModScormPrefetchHandler,
            protected navCtrl: NavController, protected prefetchDelegate: CoreCourseModulePrefetchDelegate,
            protected utils: CoreUtilsProvider) {
        super(injector, content);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.loadContent(false, true).then(() => {
            if (!this.scorm) {
                return;
            }

            if (this.skip) {
                this.open();
            }

            this.scormProvider.logView(this.scorm.id, this.scorm.name).then(() => {
                this.checkCompletion();
            }).catch((error) => {
                // Ignore errors.
            });
        });
    }

    /**
     * Check the completion.
     */
    protected checkCompletion(): void {
        this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
    }

    /**
     * Download a SCORM package or restores an ongoing download.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected downloadScormPackage(): Promise<any> {
        this.downloading = true;

        return this.prefetchHandler.download(this.module, this.courseId, undefined, (data) => {
            if (!data) {
                return;
            }

            if (data.downloading) {
                // Downloading package.
                if (this.scorm.packagesize && data.progress) {
                    this.percentage = (Number(data.progress.loaded / this.scorm.packagesize) * 100).toFixed(1);
                }
            } else if (data.message) {
                // Show a message.
                this.progressMessage = data.message;
                this.percentage = undefined;
            } else if (data.progress && data.progress.loaded && data.progress.total) {
                // Unzipping package.
                this.percentage = (Number(data.progress.loaded / data.progress.total) * 100).toFixed(1);
            } else {
                this.percentage = undefined;
            }

        }).finally(() => {
            this.progressMessage = undefined;
            this.percentage = undefined;
            this.downloading = false;
        });
    }

    /**
     * Get the SCORM data.
     *
     * @param {boolean} [refresh=false] If it's refreshing content.
     * @param {boolean} [sync=false] If it should try to sync.
     * @param {boolean} [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {

        // Get the SCORM instance.
        return this.scormProvider.getScorm(this.courseId, this.module.id, this.module.url).then((scormData) => {
            this.scorm = scormData;

            this.dataRetrieved.emit(this.scorm);
            this.description = this.scorm.intro || this.description;

            const result = this.scormProvider.isScormUnsupported(this.scorm);
            if (result) {
                this.errorMessage = result;
            } else {
                this.errorMessage = '';
            }

            if (this.scorm.warningMessage) {
                return; // SCORM is closed or not open yet, we can't get more data.
            }

            let promise;
            if (sync) {
                // Try to synchronize the assign.
                promise = this.syncActivity(showErrors).catch(() => {
                    // Ignore errors.
                });
            } else {
                promise = Promise.resolve();
            }

            return promise.catch(() => {
                // Ignore errors, keep getting data even if sync fails.
            }).then(() => {

                // No need to return this promise, it should be faster than the rest.
                this.scormSync.getReadableSyncTime(this.scorm.id).then((syncTime) => {
                    this.syncTime = syncTime;
                });

                const promises = [];

                // Get access information.
                promises.push(this.scormProvider.getAccessInformation(this.scorm.id).then((accessInfo) => {
                    this.accessInfo = accessInfo;
                }));

                // Get the number of attempts.
                promises.push(this.scormProvider.getAttemptCount(this.scorm.id).then((attemptsData) => {
                    this.attempts = attemptsData;
                    this.hasOffline = !!this.attempts.offline.length;

                    // Determine the attempt that will be continued or reviewed.
                    return this.scormHelper.determineAttemptToContinue(this.scorm, this.attempts);
                }).then((attempt) => {
                    this.lastAttempt = attempt.number;
                    this.lastIsOffline = attempt.offline;

                    if (this.lastAttempt != this.attempts.lastAttempt.number) {
                        this.attemptToContinue = this.lastAttempt;
                    } else {
                        this.attemptToContinue = undefined;
                    }

                    // Check if the last attempt is incomplete.
                    return this.scormProvider.isAttemptIncomplete(this.scorm.id, this.lastAttempt, this.lastIsOffline);
                }).then((incomplete) => {
                    const promises = [];

                    this.scorm.incomplete = incomplete;
                    this.scorm.numAttempts = this.attempts.total;
                    this.scorm.gradeMethodReadable = this.scormProvider.getScormGradeMethod(this.scorm);
                    this.scorm.attemptsLeft = this.scormProvider.countAttemptsLeft(this.scorm, this.attempts.lastAttempt.number);

                    if (this.scorm.forcenewattempt == AddonModScormProvider.SCORM_FORCEATTEMPT_ALWAYS ||
                            (this.scorm.forcenewattempt && !this.scorm.incomplete)) {
                        this.scormOptions.newAttempt = true;
                    }

                    promises.push(this.getReportedGrades());

                    promises.push(this.fetchStructure());

                    if (!this.scorm.packagesize && this.errorMessage === '') {
                        // SCORM is supported but we don't have package size. Try to calculate it.
                        promises.push(this.scormProvider.calculateScormSize(this.scorm).then((size) => {
                            this.scorm.packagesize = size;
                        }));
                    }

                    // Handle status.
                    promises.push(this.setStatusListener());

                    return Promise.all(promises);
                }));

                return Promise.all(promises).then(() => {
                    // Check whether to launch the SCORM immediately.
                    if (typeof this.skip == 'undefined') {
                        this.skip = !this.hasOffline && !this.errorMessage &&
                            (!this.scorm.lastattemptlock || this.scorm.attemptsLeft > 0) &&
                            this.accessInfo.canskipview && !this.accessInfo.canviewreport &&
                            this.scorm.skipview >= AddonModScormProvider.SKIPVIEW_FIRST &&
                            (this.scorm.skipview == AddonModScormProvider.SKIPVIEW_ALWAYS || this.lastAttempt == 0);
                    }
                });
            });
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Fetch the structure of the SCORM (TOC).
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchStructure(): Promise<any> {
        return this.scormProvider.getOrganizations(this.scorm.id).then((organizations) => {
            this.organizations = organizations;

            if (!this.currentOrganization.identifier) {
                // Load first organization (if any).
                if (organizations.length) {
                    this.currentOrganization.identifier = organizations[0].identifier;
                } else {
                    this.currentOrganization.identifier = '';
                }
            }

            return this.loadOrganizationToc(this.currentOrganization.identifier);
        });
    }

    /**
     * Get the grade of an attempt and add it to the scorm attempts list.
     *
     * @param {number} attempt The attempt number.
     * @param {boolean} offline Whether it's an offline attempt.
     * @param {any} attempts Object where to add the attempt.
     * @return {Promise<void>} Promise resolved when done.
     */
    protected getAttemptGrade(attempt: number, offline: boolean, attempts: any): Promise<void> {
        return this.scormProvider.getAttemptGrade(this.scorm, attempt, offline).then((grade) => {
            attempts[attempt] = {
                number: attempt,
                grade: grade
            };
        });
    }

    /**
     * Get the grades of each attempt and the grade of the SCORM.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected getReportedGrades(): Promise<any> {
        const promises = [],
            onlineAttempts = {},
            offlineAttempts = {};

        // Calculate the grade for each attempt.
        this.attempts.online.forEach((attempt) => {
            // Check that attempt isn't in offline to prevent showing the same attempt twice. Offline should be more recent.
            if (this.attempts.offline.indexOf(attempt) == -1) {
                promises.push(this.getAttemptGrade(attempt, false, onlineAttempts));
            }
        });

        this.attempts.offline.forEach((attempt) => {
            promises.push(this.getAttemptGrade(attempt, true, offlineAttempts));
        });

        return Promise.all(promises).then(() => {

            // Calculate the grade of the whole SCORM. We only use online attempts to calculate this data.
            this.scorm.grade = this.scormProvider.calculateScormGrade(this.scorm, onlineAttempts);

            // Add the attempts to the SCORM in array format in ASC order, and format the grades.
            this.scorm.onlineAttempts = this.utils.objectToArray(onlineAttempts);
            this.scorm.offlineAttempts = this.utils.objectToArray(offlineAttempts);
            this.scorm.onlineAttempts.sort((a, b) => {
                return a.number - b.number;
            });
            this.scorm.offlineAttempts.sort((a, b) => {
                return a.number - b.number;
            });

            // Now format the grades.
            this.scorm.onlineAttempts.forEach((attempt) => {
                attempt.grade = this.scormProvider.formatGrade(this.scorm, attempt.grade);
            });
            this.scorm.offlineAttempts.forEach((attempt) => {
                attempt.grade = this.scormProvider.formatGrade(this.scorm, attempt.grade);
            });

            this.scorm.grade = this.scormProvider.formatGrade(this.scorm, this.scorm.grade);
        });
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param  {any}     result Data returned on the sync function.
     * @return {boolean}        If suceed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        if (result.updated || this.dataSent) {
            // Check completion status if something was sent.
            this.checkCompletion();
        }

        this.dataSent = false;

        return true;
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        if (this.hasPlayed) {
            this.hasPlayed = false;
            this.scormOptions.newAttempt = false; // Uncheck new attempt.

            // Add a delay to make sure the player has started the last writing calls so we can detect conflicts.
            setTimeout(() => {
                this.dataSentObserver && this.dataSentObserver.off(); // Stop listening for changes.
                this.dataSentObserver = undefined;

                // Refresh data.
                this.showLoadingAndRefresh(true, false);
            }, 500);
        }
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        super.ionViewDidLeave();

        // Display the full page when returning to the page.
        this.skip = false;

        if (this.navCtrl.getActive().component.name == 'AddonModScormPlayerPage') {
            this.hasPlayed = true;

            // Detect if anything was sent to server.
            this.dataSentObserver && this.dataSentObserver.off();

            this.dataSentObserver = this.eventsProvider.on(AddonModScormProvider.DATA_SENT_EVENT, (data) => {
                if (data.scormId === this.scorm.id) {
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

        promises.push(this.scormProvider.invalidateScormData(this.courseId));

        if (this.scorm) {
            promises.push(this.scormProvider.invalidateAllScormData(this.scorm.id));
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
    loadOrganization(): void {
        this.loadOrganizationToc(this.currentOrganization.identifier).catch((error) => {
            this.domUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        });
    }

    /**
     * Load the TOC of a certain organization.
     *
     * @param {string} organizationId The organization id.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadOrganizationToc(organizationId: string): Promise<any> {
        if (!this.scorm.displaycoursestructure) {
            // TOC is not displayed, no need to load it.
            return Promise.resolve();
        }

        this.loadingToc = true;

        return this.scormProvider.getOrganizationToc(this.scorm.id, this.lastAttempt, organizationId, this.lastIsOffline)
                .then((toc) => {

            this.toc = this.scormProvider.formatTocToArray(toc);

            // Get images for each SCO.
            this.toc.forEach((sco) => {
                sco.image = this.scormProvider.getScoStatusIcon(sco, this.scorm.incomplete);
            });

            // Search organization title.
            this.organizations.forEach((org) => {
                if (org.identifier == organizationId) {
                    this.currentOrganization.title = org.title;
                }
            });
        }).finally(() => {
            this.loadingToc = false;
        });
    }

    /**
     * Open a SCORM. It will download the SCORM package if it's not downloaded or it has changed.
     *
     * @param {Event} [event] Event.
     * @param {string} [scoId] SCO that needs to be loaded when the SCORM is opened. If not defined, load first SCO.
     */
    open(event?: Event, scoId?: number): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (this.downloading) {
            // Scope is being downloaded, abort.
            return;
        }

        const isOutdated = this.currentStatus == CoreConstants.OUTDATED;

        if (isOutdated || this.currentStatus == CoreConstants.NOT_DOWNLOADED) {
            // SCORM needs to be downloaded.
            this.scormHelper.confirmDownload(this.scorm, isOutdated).then(() => {
                // Invalidate WS data if SCORM is outdated.
                const promise = isOutdated ? this.scormProvider.invalidateAllScormData(this.scorm.id) : Promise.resolve();

                promise.finally(() => {
                    this.downloadScormPackage().then(() => {
                        // Success downloading, open SCORM if user hasn't left the view.
                        if (!this.isDestroyed) {
                            this.openScorm(scoId);
                        }
                    }).catch((error) => {
                        if (!this.isDestroyed) {
                            this.domUtils.showErrorModalDefault(error, this.translate.instant(
                                    'addon.mod_scorm.errordownloadscorm', {name: this.scorm.name}));
                        }
                    });
                });
            });
        } else {
            this.openScorm(scoId);
        }
    }

    /**
     * Open a SCORM package.
     *
     * @param {number} scoId SCO ID.
     */
    protected openScorm(scoId: number): void {
        this.navCtrl.push('AddonModScormPlayerPage', {
            scorm: this.scorm,
            mode: this.scormOptions.mode,
            newAttempt: !!this.scormOptions.newAttempt,
            organizationId: this.currentOrganization.identifier,
            scoId: scoId
        });
    }

    /**
     * Displays some data based on the current status.
     *
     * @param {string} status The current status.
     * @param {string} [previousStatus] The previous status. If not defined, there is no previous status.
     */
    protected showStatus(status: string, previousStatus?: string): void {

        if (status == CoreConstants.OUTDATED && this.scorm) {
            // Only show the outdated message if the file should be downloaded.
            this.scormProvider.shouldDownloadMainFile(this.scorm, true).then((download) => {
                this.statusMessage = download ? 'addon.mod_scorm.scormstatusoutdated' : '';
            });
        } else if (status == CoreConstants.NOT_DOWNLOADED) {
            this.statusMessage = 'addon.mod_scorm.scormstatusnotdownloaded';
        } else if (status == CoreConstants.DOWNLOADING) {
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
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.scormSync.syncScorm(this.scorm).then((result) => {
            if (!result.updated && this.dataSent) {
                // The user sent data to server, but not in the sync process. Check if we need to fetch data.
                return this.scormSync.prefetchAfterUpdate(this.module, this.courseId).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return result;
                });
            }

            return result;
        });
    }
}
