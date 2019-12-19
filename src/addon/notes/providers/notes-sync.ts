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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreAppProvider } from '@providers/app';
import { AddonNotesOfflineProvider } from './notes-offline';
import { AddonNotesProvider } from './notes';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreEventsProvider } from '@providers/events';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { TranslateService } from '@ngx-translate/core';
import { CoreSyncProvider } from '@providers/sync';

/**
 * Service to sync notes.
 */
@Injectable()
export class AddonNotesSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_notes_autom_synced';

    constructor(loggerProvider: CoreLoggerProvider, sitesProvider: CoreSitesProvider, appProvider: CoreAppProvider,
            syncProvider: CoreSyncProvider, textUtils: CoreTextUtilsProvider, translate: TranslateService,
            private notesOffline: AddonNotesOfflineProvider, private utils: CoreUtilsProvider,
            private eventsProvider: CoreEventsProvider,  private notesProvider: AddonNotesProvider,
            private coursesProvider: CoreCoursesProvider, timeUtils: CoreTimeUtilsProvider) {

        super('AddonNotesSync', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate, timeUtils);
    }

    /**
     * Try to synchronize all the notes in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllNotes(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all notes', this.syncAllNotesFunc.bind(this), [force], siteId);
    }

    /**
     * Synchronize all the notes in a certain site
     *
     * @param siteId Site ID to sync.
     * @param force Wether to force sync not depending on last execution.
     * @return Promise resolved if sync is successful, rejected if sync fails.
     */
    private syncAllNotesFunc(siteId: string, force: boolean): Promise<any> {
        const proms = [];

        proms.push(this.notesOffline.getAllNotes(siteId));
        proms.push(this.notesOffline.getAllDeletedNotes(siteId));

        return Promise.all(proms).then((notesArray) => {
            // Get all the courses to be synced.
            const courseIds = {};
            notesArray.forEach((notes) => {
                notes.forEach((note) => {
                    courseIds[note.courseid] = note.courseid;
                });
            });
            // Sync all courses.
            const promises = Object.keys(courseIds).map((courseId) => {
                const cId = parseInt(courseIds[courseId], 10);

                const promise = force ? this.syncNotes(cId, siteId) : this.syncNotesIfNeeded(cId, siteId);

                return promise.then((warnings) => {
                    if (typeof warnings != 'undefined') {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonNotesSyncProvider.AUTO_SYNCED, {
                            courseId: courseId,
                            warnings: warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(promises);
        });
    }

    /**
     * Sync course notes only if a certain time has passed since the last time.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the notes are synced or if they don't need to be synced.
     */
    private syncNotesIfNeeded(courseId: number, siteId?: string): Promise<void> {
        return this.isSyncNeeded(courseId, siteId).then((needed) => {
            if (needed) {
                return this.syncNotes(courseId, siteId);
            }
        });
    }

    /**
     * Synchronize notes of a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if sync is successful, rejected otherwise.
     */
    syncNotes(courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isSyncing(courseId, siteId)) {
            // There's already a sync ongoing for notes, return the promise.
            return this.getOngoingSync(courseId, siteId);
        }

        this.logger.debug('Try to sync notes for course ' + courseId);

        const warnings = [];
        const errors = [];

        const proms = [];

        // Get offline notes to be sent.
        proms.push(this.notesOffline.getNotesForCourse(courseId, siteId).then((notes) => {
            if (!notes.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(this.translate.instant('core.networkerrormsg'));
            }

            const errors = [];

            // Format the notes to be sent.
            const notesToSend = notes.map((note) => {
                return {
                    userid: note.userid,
                    publishstate: note.publishstate,
                    courseid: note.courseid,
                    text: note.content,
                    format: note.format
                };
            });

            // Send the notes.
            return this.notesProvider.addNotesOnline(notesToSend, siteId).then((response) => {
                // Search errors in the response.
                response.forEach((entry) => {
                    if (entry.noteid === -1 && errors.indexOf(entry.errormessage) == -1) {
                        errors.push(entry.errormessage);
                    }
                });

            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // It's a WebService error, this means the user cannot send notes.
                    errors.push(error);
                } else {
                    // Not a WebService error, reject the synchronization to try again.
                    return Promise.reject(error);
                }
            }).then(() => {
                // Notes were sent, delete them from local DB.
                const promises = notes.map((note) => {
                    return this.notesOffline.deleteOfflineNote(note.userid, note.content, note.created, siteId);
                });

                return Promise.all(promises);
            });
        }));

        // Get offline notes to be sent.
        proms.push(this.notesOffline.getCourseDeletedNotes(courseId, siteId).then((notes) => {
            if (!notes.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(this.translate.instant('core.networkerrormsg'));
            }

            // Format the notes to be sent.
            const notesToDelete = notes.map((note) => {
                return note.noteid;
            });

            // Delete the notes.
            return this.notesProvider.deleteNotesOnline(notesToDelete, courseId, siteId).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // It's a WebService error, this means the user cannot send notes.
                    errors.push(error);
                } else {
                    // Not a WebService error, reject the synchronization to try again.
                    return Promise.reject(error);
                }
            }).then(() => {
                // Notes were sent, delete them from local DB.
                const promises = notes.map((noteId) => {
                    return this.notesOffline.undoDeleteNote(noteId, siteId);
                });

                return Promise.all(promises);
            });
        }));

        const syncPromise = Promise.all(proms).then(() => {
            // Fetch the notes from server to be sure they're up to date.
            return this.notesProvider.invalidateNotes(courseId, undefined, siteId).then(() => {
                return this.notesProvider.getNotes(courseId, undefined, false, true, siteId);
            }).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            if (errors && errors.length) {
                // At least an error occurred, get course name and add errors to warnings array.
                return this.coursesProvider.getUserCourse(courseId, true, siteId).catch(() => {
                    // Ignore errors.
                    return {};
                }).then((course) => {
                    errors.forEach((error) => {
                        warnings.push(this.translate.instant('addon.notes.warningnotenotsent', {
                            course: course.fullname ? course.fullname : courseId,
                            error: error
                        }));
                    });
                });
            }
        }).then(() => {
            // All done, return the warnings.
            return warnings;
        });

        return this.addOngoingSync(courseId, syncPromise, siteId);
    }
}
