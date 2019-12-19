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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreCourseActivitySyncBaseProvider } from '@core/course/classes/activity-sync';
import { AddonModScormProvider, AddonModScormAttemptCountResult } from './scorm';
import { AddonModScormOfflineProvider } from './scorm-offline';
import { AddonModScormPrefetchHandler } from './prefetch-handler';

/**
 * Data returned by a SCORM sync.
 */
export interface AddonModScormSyncResult {
    /**
     * List of warnings.
     */
    warnings: string[];

    /**
     * Whether an attempt was finished in the site due to the sync,
     */
    attemptFinished: boolean;

    /**
     * Whether some data was sent to the site.
     */
    updated: boolean;
}

/**
 * Service to sync SCORMs.
 */
@Injectable()
export class AddonModScormSyncProvider extends CoreCourseActivitySyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_scorm_autom_synced';

    protected componentTranslate: string;

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider, translate: TranslateService,
            private eventsProvider: CoreEventsProvider, timeUtils: CoreTimeUtilsProvider,
            private scormProvider: AddonModScormProvider, private scormOfflineProvider: AddonModScormOfflineProvider,
            prefetchHandler: AddonModScormPrefetchHandler, private utils: CoreUtilsProvider,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, private courseProvider: CoreCourseProvider,
            private logHelper: CoreCourseLogHelperProvider) {

        super('AddonModScormSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils, prefetchDelegate, prefetchHandler);

        this.componentTranslate = courseProvider.translateModuleName('scorm');
    }

    /**
     * Add an offline attempt to the right of the new attempts array if possible.
     * If the attempt cannot be created as a new attempt then it will be deleted.
     *
     * @param scormId SCORM ID.
     * @param attempt The offline attempt to treat.
     * @param lastOffline Last offline attempt number.
     * @param newAttemptsSameOrder Attempts that'll be created as new attempts but keeping the current order.
     * @param newAttemptsAtEnd Object with attempts that'll be created at the end of the list of attempts (should be max 1).
     * @param lastOfflineCreated Time when the last offline attempt was created.
     * @param lastOfflineIncomplete Whether the last offline attempt is incomplete.
     * @param warnings Array where to add the warnings.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected addToNewOrDelete(scormId: number, attempt: number, lastOffline: number, newAttemptsSameOrder: number[],
            newAttemptsAtEnd: any, lastOfflineCreated: number, lastOfflineIncomplete: boolean, warnings: string[],
            siteId: string): Promise<any> {

        if (attempt == lastOffline) {
            newAttemptsSameOrder.push(attempt);

            return Promise.resolve();
        }

        // Check if the attempt can be created.
        return this.scormOfflineProvider.getAttemptCreationTime(scormId, attempt, siteId).then((time) => {
            if (time > lastOfflineCreated) {
                // This attempt was created after the last offline attempt, we'll add it to the end of the list if possible.
                if (lastOfflineIncomplete) {
                    // It can't be added because the last offline attempt is incomplete, delete it.
                    this.logger.debug('Try to delete attempt ' + attempt + ' because it cannot be created as a new attempt.');

                    return this.scormOfflineProvider.deleteAttempt(scormId, attempt, siteId).then(() => {
                        warnings.push(this.translate.instant('addon.mod_scorm.warningofflinedatadeleted', {number: attempt}));
                    }).catch(() => {
                        // Maybe there's something wrong with the data or the storage implementation.
                    });
                } else {
                    // Add the attempt at the end.
                    newAttemptsAtEnd[time] = attempt;
                }

            } else {
                newAttemptsSameOrder.push(attempt);
            }
        });
    }

    /**
     * Check if can retry an attempt synchronization.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param lastOnline Last online attempt number.
     * @param siteId Site ID.
     * @return Promise resolved if can retry the synchronization, rejected otherwise.
     */
    protected canRetrySync(scormId: number, attempt: number, lastOnline: number, siteId: string): Promise<any> {
        // If it's the last attempt we don't need to ignore cache because we already did it.
        const refresh = lastOnline != attempt;

        return this.scormProvider.getScormUserData(scormId, attempt, undefined, false, refresh, siteId).then((siteData) => {
            // Get synchronization snapshot (if sync fails it should store a snapshot).
            return this.scormOfflineProvider.getAttemptSnapshot(scormId, attempt, siteId).then((snapshot) => {
                if (!snapshot || !Object.keys(snapshot).length || !this.snapshotEquals(snapshot, siteData)) {
                    // No snapshot or it doesn't match, we can't retry the synchronization.
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Create new attempts at the end of the offline attempts list.
     *
     * @param scormId SCORM ID.
     * @param newAttempts Object with the attempts to create. The keys are the timecreated, the values are the attempt number.
     * @param lastOffline Number of last offline attempt.
     * @param siteId Site ID.
     * @return Promise resolved when done.
     */
    protected createNewAttemptsAtEnd(scormId: number, newAttempts: any, lastOffline: number, siteId: string): Promise<any> {
        const times = Object.keys(newAttempts).sort(), // Sort in ASC order.
            promises = [];

        if (!times.length) {
            return Promise.resolve();
        }

        times.forEach((time, index) => {
            const attempt = newAttempts[time];

            promises.push(this.scormOfflineProvider.changeAttemptNumber(scormId, attempt, lastOffline + index + 1, siteId));
        });

        return this.utils.allPromises(promises);
    }

    /**
     * Finish a sync process: remove offline data if needed, prefetch SCORM data, set sync time and return the result.
     *
     * @param siteId Site ID.
     * @param scorm SCORM.
     * @param warnings List of warnings generated by the sync.
     * @param lastOnline Last online attempt number before the sync.
     * @param lastOnlineWasFinished Whether the last online attempt was finished before the sync.
     * @param initialCount Attempt count before the sync.
     * @param updated Whether some data was sent to the site.
     * @return Promise resolved on success.
     */
    protected finishSync(siteId: string, scorm: any, warnings: string[], lastOnline?: number, lastOnlineWasFinished?: boolean,
            initialCount?: AddonModScormAttemptCountResult, updated?: boolean): Promise<AddonModScormSyncResult> {

        let promise;

        if (updated) {
            // Update downloaded data.
            promise = this.courseProvider.getModuleBasicInfoByInstance(scorm.id, 'scorm', siteId).then((module) => {
                return this.prefetchAfterUpdate(module, scorm.course, undefined, siteId);
            }).catch(() => {
                // Ignore errors.
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            return this.setSyncTime(scorm.id, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // Check if an attempt was finished in Moodle.
            if (initialCount) {
                // Get attempt count again to check if an attempt was finished.
                return this.scormProvider.getAttemptCount(scorm.id, undefined, false, siteId).then((attemptsData) => {
                    if (attemptsData.online.length > initialCount.online.length) {
                        return true;
                    } else if (!lastOnlineWasFinished && lastOnline > 0) {
                        // Last online attempt wasn't finished, let's check if it is now.
                        return this.scormProvider.isAttemptIncomplete(scorm.id, lastOnline, false, true, siteId).then((inc) => {
                            return !inc;
                        });
                    }

                    return false;
                });
            }

            return false;
        }).then((attemptFinished) => {
            return {
                warnings: warnings,
                attemptFinished: attemptFinished,
                updated: updated
            };
        });
    }

    /**
     * Get the creation time and the status (complete/incomplete) of an offline attempt.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param siteId Site ID.
     * @return Promise resolved with the data.
     */
    protected getOfflineAttemptData(scormId: number, attempt: number, siteId: string)
            : Promise<{incomplete: boolean, timecreated: number}> {

        // Check if last offline attempt is incomplete.
        return this.scormProvider.isAttemptIncomplete(scormId, attempt, true, false, siteId).then((incomplete) => {
            return this.scormOfflineProvider.getAttemptCreationTime(scormId, attempt, siteId).then((timecreated) => {
                return {
                    incomplete: incomplete,
                    timecreated: timecreated
                };
            });
        });
    }

    /**
     * Change the number of some offline attempts. We need to move all offline attempts after the collisions
     * too, otherwise we would overwrite data.
     * Example: We have offline attempts 1, 2 and 3. #1 and #2 have collisions. #1 can be synced, but #2 needs
     * to be a new attempt. #3 will now be #4, and #2 will now be #3.
     *
     * @param scormId SCORM ID.
     * @param newAttempts Attempts that need to be converted into new attempts.
     * @param lastOnline Last online attempt.
     * @param lastCollision Last attempt with collision (exists in online and offline).
     * @param offlineAttempts Numbers of offline attempts.
     * @param siteId Site ID.
     * @return Promise resolved when attempts have been moved.
     */
    protected moveNewAttempts(scormId: any, newAttempts: number[], lastOnline: number, lastCollision: number,
            offlineAttempts: number[], siteId: string): Promise<any> {

        if (!newAttempts.length) {
            return Promise.resolve();
        }

        let promise = Promise.resolve(),
            lastSuccessful;

        // Sort offline attempts in DESC order.
        offlineAttempts = offlineAttempts.sort((a, b) => {
            return Number(a) <= Number(b) ? 1 : -1;
        });

        // First move the offline attempts after the collisions.
        offlineAttempts.forEach((attempt) => {
            if (attempt > lastCollision) {
                // We use a chain of promises because we need to move them in order.
                promise = promise.then(() => {
                    const newNumber = attempt + newAttempts.length;

                    return this.scormOfflineProvider.changeAttemptNumber(scormId, attempt, newNumber, siteId).then(() => {
                        lastSuccessful = attempt;
                    });
                });
            }
        });

        return promise.then(() => {
            const successful = [];
            let promises = [];

            // Sort newAttempts in ASC order.
            newAttempts = newAttempts.sort((a, b) => {
                return Number(a) >= Number(b) ? 1 : -1;
            });

            // Now move the attempts in newAttempts.
            newAttempts.forEach((attempt, index) => {
                // No need to use chain of promises.
                const newNumber = lastOnline + index + 1;

                promises.push(this.scormOfflineProvider.changeAttemptNumber(scormId, attempt, newNumber, siteId).then(() => {
                    successful.push(attempt);
                }));
            });

            return Promise.all(promises).catch((error) => {
                // Moving the new attempts failed (it shouldn't happen). Let's undo the new attempts move.
                promises = [];

                successful.forEach((attempt) => {
                    const newNumber = lastOnline + newAttempts.indexOf(attempt) + 1;

                    promises.push(this.scormOfflineProvider.changeAttemptNumber(scormId, newNumber, attempt, siteId));
                });

                return this.utils.allPromises(promises).then(() => {
                    return Promise.reject(error); // It will now enter the .catch that moves offline attempts after collisions.
                });
            });

        }).catch((error) => {
            // Moving offline attempts after collisions failed (it shouldn't happen). Let's undo the changes.
            if (!lastSuccessful) {
                return Promise.reject(error);
            }

            const attemptsToUndo = [];
            let promise = Promise.resolve();

            for (let i = lastSuccessful; offlineAttempts.indexOf(i) != -1; i++) {
                attemptsToUndo.push(i);
            }

            attemptsToUndo.forEach((attempt) => {
                promise = promise.then(() => {
                    // Move it back.
                    return this.scormOfflineProvider.changeAttemptNumber(scormId, attempt + newAttempts.length, attempt, siteId);
                });
            });

            return promise.then(() => {
                return Promise.reject(error);
            });
        });
    }

    /**
     * Save a snapshot from a synchronization.
     *
     * @param scormId SCORM ID.
     * @param attempt Attemot number.
     * @param siteId Site ID.
     * @return Promise resolved when the snapshot is stored.
     */
    protected saveSyncSnapshot(scormId: number, attempt: number, siteId: string): Promise<any> {
        // Try to get current state from the site.
        return this.scormProvider.getScormUserData(scormId, attempt, undefined, false, true, siteId).then((data) => {
            return this.scormOfflineProvider.setAttemptSnapshot(scormId, attempt, data, siteId);
        }, () => {
            // Error getting user data from the site. We'll have to build it ourselves.
            // Let's try to get cached data about the attempt.
            return this.scormProvider.getScormUserData(scormId, attempt, undefined, false, false, siteId).catch(() => {
                // No cached data.
                return {};
            }).then((data) => {

                // We need to add the synced data to the snapshot.
                return this.scormOfflineProvider.getScormStoredData(scormId, attempt, false, true, siteId).then((synced) => {
                    synced.forEach((entry) => {
                        if (!data[entry.scoid]) {
                            data[entry.scoid] = {
                                scoid: entry.scoid,
                                userdata: {}
                            };
                        }
                        data[entry.scoid].userdata[entry.element] = entry.value;
                    });

                    return this.scormOfflineProvider.setAttemptSnapshot(scormId, attempt, data, siteId);
                });
            });
        });
    }

    /**
     * Compares an attempt's snapshot with the data retrieved from the site.
     * It only compares elements with dot notation. This means that, if some SCO has been added to Moodle web
     * but the user hasn't generated data for it, then the snapshot will be detected as equal.
     *
     * @param snapshot Attempt's snapshot.
     * @param userData Data retrieved from the site.
     * @return True if snapshot is equal to the user data, false otherwise.
     */
    protected snapshotEquals(snapshot: any, userData: any): boolean {
        // Check that snapshot contains the data from the site.
        for (const scoId in userData) {
            const siteSco = userData[scoId],
                snapshotSco = snapshot[scoId];

            for (const element in siteSco.userdata) {
                if (element.indexOf('.') > -1) {
                    if (!snapshotSco || siteSco.userdata[element] !== snapshotSco.userdata[element]) {
                        return false;
                    }
                }
            }
        }

        // Now check the opposite way: site userData contains the data from the snapshot.
        for (const scoId in snapshot) {
            const siteSco = userData[scoId],
                snapshotSco = snapshot[scoId];

            for (const element in snapshotSco.userdata) {
                if (element.indexOf('.') > -1) {
                    if (!siteSco || siteSco.userdata[element] !== snapshotSco.userdata[element]) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Try to synchronize all the SCORMs in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllScorms(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all SCORMs', this.syncAllScormsFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all SCORMs on a site.
     *
     * @param siteId Site ID to sync.
     * @param force Wether to force sync not depending on last execution.
     * @param Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllScormsFunc(siteId: string, force?: boolean): Promise<any> {

        // Get all offline attempts.
        return this.scormOfflineProvider.getAllAttempts(siteId).then((attempts) => {
            const scorms = [],
                ids = [], // To prevent duplicates.
                promises = [];

            // Get the IDs of all the SCORMs that have something to be synced.
            attempts.forEach((attempt) => {
                if (ids.indexOf(attempt.scormid) == -1) {
                    ids.push(attempt.scormid);

                    scorms.push({
                        id: attempt.scormid,
                        courseId: attempt.courseid
                    });
                }
            });

            // Sync all SCORMs that haven't been synced for a while and that aren't attempted right now.
            scorms.forEach((scorm) => {
                if (!this.syncProvider.isBlocked(AddonModScormProvider.COMPONENT, scorm.id, siteId)) {

                    promises.push(this.scormProvider.getScormById(scorm.courseId, scorm.id, '', false, siteId).then((scorm) => {
                        const promise = force ? this.syncScorm(scorm, siteId) : this.syncScormIfNeeded(scorm, siteId);

                        return promise.then((data) => {
                            if (typeof data != 'undefined') {
                                // We tried to sync. Send event.
                                this.eventsProvider.trigger(AddonModScormSyncProvider.AUTO_SYNCED, {
                                    scormId: scorm.id,
                                    attemptFinished: data.attemptFinished,
                                    warnings: data.warnings,
                                    updated: data.updated
                                }, siteId);
                            }
                        });
                    }));
                }
            });

            return Promise.all(promises);
        });
    }

    /**
     * Send data from a SCORM offline attempt to the site.
     *
     * @param scormId SCORM ID.
     * @param attempt Attempt number.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the attempt is successfully synced.
     */
    protected syncAttempt(scormId: number, attempt: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        this.logger.debug('Try to sync attempt ' + attempt + ' in SCORM ' + scormId + ' and site ' + siteId);

        // Get only not synced entries.
        return this.scormOfflineProvider.getScormStoredData(scormId, attempt, true, false, siteId).then((entries) => {
            const scos = {},
                promises = [];
            let somethingSynced = false;

            // Get data to send (only elements with dots like cmi.core.exit, in Mobile we store more data to make offline work).
            entries.forEach((entry) => {
                if (entry.element.indexOf('.') > -1) {
                    if (!scos[entry.scoid]) {
                        scos[entry.scoid] = [];
                    }

                    scos[entry.scoid].push({
                        element: entry.element,
                        value: entry.value
                    });
                }
            });

            // Send the data in each SCO.
            for (const id in scos) {
                const scoId = Number(id),
                    tracks = scos[scoId];

                promises.push(this.scormProvider.saveTracksOnline(scormId, scoId, attempt, tracks, siteId).then(() => {
                    // Sco data successfully sent. Mark them as synced. This is needed because some SCOs sync might fail.
                    return this.scormOfflineProvider.markAsSynced(scormId, attempt, scoId, siteId).catch(() => {
                        // Ignore errors.
                    }).then(() => {
                        somethingSynced = true;
                    });
                }));
            }

            return this.utils.allPromises(promises).then(() => {
                // Attempt has been sent. Let's delete it from local.
                return this.scormOfflineProvider.deleteAttempt(scormId, attempt, siteId).catch(() => {
                    // Failed to delete (shouldn't happen). Let's retry once.
                    return this.scormOfflineProvider.deleteAttempt(scormId, attempt, siteId).catch(() => {
                        // Maybe there's something wrong with the data or the storage implementation.
                        this.logger.error('After sync: error deleting attempt ' + attempt + ' in SCORM ' + scormId);
                    });
                });
            }).catch((error) => {
                if (somethingSynced) {
                    // Some SCOs have been synced and some not.
                    // Try to store a snapshot of the current state to be able to re-try the synchronization later.
                    this.logger.error('Error synchronizing some SCOs for attempt ' + attempt + ' in SCORM ' +
                            scormId + '. Saving snapshot.');

                    return this.saveSyncSnapshot(scormId, attempt, siteId).then(() => {
                        return Promise.reject(error);
                    });
                } else {
                    this.logger.error('Error synchronizing attempt ' + attempt + ' in SCORM ' + scormId);
                }

                return Promise.reject(error);
            });
        });
    }

    /**
     * Sync a SCORM only if a certain time has passed since the last time.
     *
     * @param scorm SCORM.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the SCORM is synced or if it doesn't need to be synced.
     */
    syncScormIfNeeded(scorm: any, siteId?: string): Promise<any> {
        return this.isSyncNeeded(scorm.id, siteId).then((needed) => {
            if (needed) {
                return this.syncScorm(scorm, siteId);
            }
        });
    }

    /**
     * Try to synchronize a SCORM.
     * The promise returned will be resolved with an array with warnings if the synchronization is successful. A successful
     * synchronization doesn't mean that all the data has been sent to the site, it's possible that some attempt can't be sent.
     *
     * @param scorm SCORM.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success.
     */
    syncScorm(scorm: any, siteId?: string): Promise<AddonModScormSyncResult> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let warnings = [],
            syncPromise,
            initialCount,
            lastOnline = 0,
            lastOnlineWasFinished = false;

        if (this.isSyncing(scorm.id, siteId)) {
            // There's already a sync ongoing for this SCORM, return the promise.
            return this.getOngoingSync(scorm.id, siteId);
        }

        // Verify that SCORM isn't blocked.
        if (this.syncProvider.isBlocked(AddonModScormProvider.COMPONENT, scorm.id, siteId)) {
            this.logger.debug('Cannot sync SCORM ' + scorm.id + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync SCORM ' + scorm.id + ' in site ' + siteId);

        // Sync offline logs.
        syncPromise = this.logHelper.syncIfNeeded(AddonModScormProvider.COMPONENT, scorm.id, siteId).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Get attempts data. We ignore cache for online attempts, so this call will fail if offline or server down.
            return this.scormProvider.getAttemptCount(scorm.id, false, true, siteId);
        }).then((attemptsData) => {
            if (!attemptsData.offline || !attemptsData.offline.length) {
                // Nothing to sync.
                return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished);
            }

            initialCount = attemptsData;

            const collisions = [];

            // Check if there are collisions between offline and online attempts (same number).
            attemptsData.online.forEach((attempt) => {
                lastOnline = Math.max(lastOnline, attempt);
                if (attemptsData.offline.indexOf(attempt) > -1) {
                    collisions.push(attempt);
                }
            });

            // Check if last online attempt is finished. Ignore cache.
            const promise = lastOnline > 0 ? this.scormProvider.isAttemptIncomplete(scorm.id, lastOnline, false, true, siteId) :
                    Promise.resolve(false);

            return promise.then((incomplete) => {
                lastOnlineWasFinished = !incomplete;

                if (!collisions.length && !incomplete) {
                    // No collisions and last attempt is complete. Send offline attempts to Moodle.
                    const promises = [];

                    attemptsData.offline.forEach((attempt) => {
                        if (scorm.maxattempt == 0 || attempt <= scorm.maxattempt) {
                            promises.push(this.syncAttempt(scorm.id, attempt, siteId));
                        }
                    });

                    return Promise.all(promises).then(() => {
                        // All data synced, finish.
                        return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished, initialCount, true);
                    });

                } else if (collisions.length) {
                    // We have collisions, treat them.
                    return this.treatCollisions(scorm.id, collisions, lastOnline, attemptsData.offline, siteId).then((warns) => {
                        warnings = warnings.concat(warns);

                        // The offline attempts might have changed since some collisions can be converted to new attempts.
                        return this.scormOfflineProvider.getAttempts(scorm.id, siteId).then((entries) => {
                            const promises = [];
                            let cannotSyncSome = false;

                            entries = entries.map((entry) => {
                                return entry.attempt; // Get only the attempt number.
                            });

                            if (incomplete && entries.indexOf(lastOnline) > -1) {
                                // Last online was incomplete, but it was continued in offline.
                                incomplete = false;
                            }

                            entries.forEach((attempt) => {
                                // We'll always sync attempts previous to lastOnline (failed sync or continued in offline).
                                // We'll only sync new attemps if last online attempt is completed.
                                if (!incomplete || attempt <= lastOnline) {
                                    if (scorm.maxattempt == 0 || attempt <= scorm.maxattempt) {
                                        promises.push(this.syncAttempt(scorm.id, attempt, siteId));
                                    }
                                } else {
                                    cannotSyncSome = true;
                                }
                            });

                            return Promise.all(promises).then(() => {
                                if (cannotSyncSome) {
                                    warnings.push(this.translate.instant('addon.mod_scorm.warningsynconlineincomplete'));
                                }

                                return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished, initialCount,
                                        true);
                            });
                        });
                    });
                } else {
                    // No collisions, but last online attempt is incomplete so we can't send offline attempts.
                    warnings.push(this.translate.instant('addon.mod_scorm.warningsynconlineincomplete'));

                    return this.finishSync(siteId, scorm, warnings, lastOnline, lastOnlineWasFinished, initialCount, false);
                }
            });
        });

        return this.addOngoingSync(scorm.id, syncPromise, siteId);
    }

    /**
     * Treat collisions found in a SCORM synchronization process.
     *
     * @param scormId SCORM ID.
     * @param collisions Numbers of attempts that exist both in online and offline.
     * @param lastOnline Last online attempt.
     * @param offlineAttempts Numbers of offline attempts.
     * @param siteId Site ID.
     * @return Promise resolved when the collisions have been treated. It returns warnings array.
     * @description
     *
     * Treat collisions found in a SCORM synchronization process. A collision is when an attempt exists both in offline
     * and online. A collision can be:
     *
     * - Two different attempts.
     * - An online attempt continued in offline.
     * - A failure in a previous sync.
     *
     * This function will move into new attempts the collisions that can't be merged. It will usually keep the order of the
     * offline attempts EXCEPT if the offline attempt was created after the last offline attempt (edge case).
     *
     * Edge case: A user creates offline attempts and when he syncs we retrieve an incomplete online attempt, so the offline
     * attempts cannot be synced. Then the user continues that online attempt and goes offline, so a collision is created.
     * When we perform the next sync we detect that this collision cannot be merged, so this offline attempt needs to be
     * created as a new attempt. Since this attempt was created after the last offline attempt, it will be added ot the end
     * of the list if the last attempt is completed. If the last attempt is not completed then the offline data will de deleted
     * because we can't create a new attempt.
     */
    protected treatCollisions(scormId: number, collisions: number[], lastOnline: number, offlineAttempts: number[], siteId: string)
            : Promise<string[]> {

        const warnings = [],
            newAttemptsSameOrder = [], // Attempts that will be created as new attempts but keeping the current order.
            newAttemptsAtEnd = {}, // Attempts that will be created at the end of the list of attempts (should be max 1 attempt).
            lastCollision = Math.max.apply(Math, collisions);
        let lastOffline = Math.max.apply(Math, offlineAttempts);

        // Get needed data from the last offline attempt.
        return this.getOfflineAttemptData(scormId, lastOffline, siteId).then((lastOfflineData) => {
            const promises = [];

            collisions.forEach((attempt) => {
                // First get synced entries to detect if it was a failed synchronization.
                promises.push(this.scormOfflineProvider.getScormStoredData(scormId, attempt, false, true, siteId).then((synced) => {
                    if (synced && synced.length) {
                        // The attempt has synced entries, it seems to be a failed synchronization.
                        // Let's get the entries that haven't been synced, maybe it just failed to delete the attempt.
                        return this.scormOfflineProvider.getScormStoredData(scormId, attempt, true, false, siteId)
                                .then((entries) => {

                            // Check if there are elements to sync.
                            let hasDataToSend = false;
                            for (const i in entries) {
                                const entry = entries[i];
                                if (entry.element.indexOf('.') > -1) {
                                    hasDataToSend = true;
                                    break;
                                }
                            }

                            if (hasDataToSend) {
                                // There are elements to sync. We need to check if it's possible to sync them or not.
                                return this.canRetrySync(scormId, attempt, lastOnline, siteId).catch(() => {
                                    // Cannot retry sync, we'll create a new offline attempt if possible.
                                    return this.addToNewOrDelete(scormId, attempt, lastOffline, newAttemptsSameOrder,
                                            newAttemptsAtEnd, lastOfflineData.timecreated, lastOfflineData.incomplete, warnings,
                                            siteId);
                                });
                            } else {
                                // Nothing to sync, delete the attempt.
                                return this.scormOfflineProvider.deleteAttempt(scormId, attempt, siteId).catch(() => {
                                    // Maybe there's something wrong with the data or the storage implementation.
                                });
                            }
                        });
                    } else {
                        // It's not a failed synchronization. Check if it's an attempt continued in offline.
                        return this.scormOfflineProvider.getAttemptSnapshot(scormId, attempt, siteId).then((snapshot) => {
                            if (snapshot && Object.keys(snapshot).length) {
                                // It has a snapshot, it means it continued an online attempt. We need to check if they've diverged.
                                // If it's the last attempt we don't need to ignore cache because we already did it.
                                const refresh = lastOnline != attempt;

                                return this.scormProvider.getScormUserData(scormId, attempt, undefined, false, refresh, siteId)
                                        .then((data) => {

                                    if (!this.snapshotEquals(snapshot, data)) {
                                        // Snapshot has diverged, it will be converted into a new attempt if possible.
                                        return this.addToNewOrDelete(scormId, attempt, lastOffline, newAttemptsSameOrder,
                                            newAttemptsAtEnd, lastOfflineData.timecreated, lastOfflineData.incomplete, warnings,
                                            siteId);
                                    }
                                });
                            } else {
                                // No snapshot, it's a different attempt.
                                newAttemptsSameOrder.push(attempt);
                            }
                        });
                    }
                }));
            });

            return Promise.all(promises).then(() => {
                return this.moveNewAttempts(scormId, newAttemptsSameOrder, lastOnline, lastCollision, offlineAttempts, siteId)
                        .then(() => {

                    // The new attempts that need to keep the order have been created.
                    // Now create the new attempts at the end of the list of offline attempts. It should only be 1 attempt max.
                    lastOffline = lastOffline + newAttemptsSameOrder.length;

                    return this.createNewAttemptsAtEnd(scormId, newAttemptsAtEnd, lastOffline, siteId).then(() => {
                        return warnings;
                    });
                });
            });
        });
    }
}
