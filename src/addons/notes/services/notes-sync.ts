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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { Translate, makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonNotesDBRecord, AddonNotesDeletedDBRecord } from './database/notes';
import { AddonNotes, AddonNotesCreateNoteData } from './notes';
import { AddonNotesOffline } from './notes-offline';

/**
 * Service to sync notes.
 */
@Injectable( { providedIn: 'root' } )
export class AddonNotesSyncProvider extends CoreSyncBaseProvider<AddonNotesSyncResult> {

    static readonly AUTO_SYNCED = 'addon_notes_autom_synced';

    constructor() {
        super('AddonNotesSync');
    }

    /**
     * Try to synchronize all the notes in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllNotes(siteId?: string, force?: boolean): Promise<void> {
        return this.syncOnSites('all notes', (siteId) => this.syncAllNotesFunc(!!force, siteId), siteId);
    }

    /**
     * Synchronize all the notes in a certain site
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllNotesFunc(force: boolean, siteId: string): Promise<void> {
        const notesArray = await Promise.all([
            AddonNotesOffline.getAllNotes(siteId),
            AddonNotesOffline.getAllDeletedNotes(siteId),
        ]);

        // Get all the courses to be synced.
        let courseIds: number[] = [];
        notesArray.forEach((notes: (AddonNotesDeletedDBRecord | AddonNotesDBRecord)[]) => {
            courseIds = courseIds.concat(notes.map((note) => note.courseid));
        });

        CoreUtils.uniqueArray(courseIds);

        // Sync all courses.
        const promises = courseIds.map(async (courseId) => {
            const result = await (force
                ? this.syncNotes(courseId, siteId)
                : this.syncNotesIfNeeded(courseId, siteId));

            if (result !== undefined) {
                // Sync successful, send event.
                CoreEvents.trigger(AddonNotesSyncProvider.AUTO_SYNCED, {
                    courseId,
                    warnings: result.warnings,
                }, siteId);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Sync course notes only if a certain time has passed since the last time.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the notes are synced or if they don't need to be synced.
     */
    protected async syncNotesIfNeeded(courseId: number, siteId?: string): Promise<AddonNotesSyncResult | undefined> {
        const needed = await this.isSyncNeeded(courseId, siteId);

        if (needed) {
            return this.syncNotes(courseId, siteId);
        }
    }

    /**
     * Synchronize notes of a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    syncNotes(courseId: number, siteId?: string): Promise<AddonNotesSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const currentSyncPromise = this.getOngoingSync(courseId, siteId);
        if (currentSyncPromise) {
            // There's already a sync ongoing for notes, return the promise.
            return currentSyncPromise;
        }

        this.logger.debug('Try to sync notes for course ' + courseId);

        const syncPromise = this.performSyncNotes(courseId, siteId);

        return this.addOngoingSync(courseId, syncPromise, siteId);
    }

    /**
     * Perform the synchronization of the notes of a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async performSyncNotes(courseId: number, siteId?: string): Promise<AddonNotesSyncResult> {
        const result: AddonNotesSyncResult = {
            warnings: [],
        };

        // Get offline notes to be sent and deleted.
        const [offlineNotes, deletedNotes] = await Promise.all([
            AddonNotesOffline.getAllNotes(siteId),
            AddonNotesOffline.getAllDeletedNotes(siteId),
        ]);

        if (!offlineNotes.length && !deletedNotes.length) {
            // Nothing to sync.
            return result;
        }

        if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            throw new CoreNetworkError();
        }

        const errors: string[] = [];
        const promises: Promise<void>[] = [];

        // Format the notes to be sent.
        const notesToSend: AddonNotesCreateNoteData[] = offlineNotes.map((note) => ({
            userid: note.userid,
            publishstate: note.publishstate,
            courseid: note.courseid,
            text: note.content,
            format: 1,
        }));

        // Send the notes.
        promises.push(AddonNotes.addNotesOnline(notesToSend, siteId).then((response) => {
            // Search errors in the response.
            response.forEach((entry) => {
                if (entry.noteid === -1 && entry.errormessage && errors.indexOf(entry.errormessage) == -1) {
                    errors.push(entry.errormessage);
                }
            });

            return;
        }).catch((error) => {
            if (CoreUtils.isWebServiceError(error)) {
                // It's a WebService error, this means the user cannot send notes.
                errors.push(error);

                return;
            }

            // Not a WebService error, reject the synchronization to try again.
            throw error;
        }).then(async () => {
            // Notes were sent, delete them from local DB.
            const promises: Promise<void>[] = offlineNotes.map((note) =>
                AddonNotesOffline.deleteOfflineNote(note.userid, note.content, note.created, siteId));

            await Promise.all(promises);

            return;
        }));

        // Format the notes to be sent.
        const notesToDelete = deletedNotes.map((note) => note.noteid);

        // Delete the notes.
        promises.push(AddonNotes.deleteNotesOnline(notesToDelete, courseId, siteId).catch((error) => {
            if (CoreUtils.isWebServiceError(error)) {
                // It's a WebService error, this means the user cannot send notes.
                errors.push(error);

                return;
            }

            // Not a WebService error, reject the synchronization to try again.
            throw error;
        }).then(async () => {
            // Notes were sent, delete them from local DB.
            const promises = notesToDelete.map((noteId) => AddonNotesOffline.undoDeleteNote(noteId, siteId));

            await Promise.all(promises);

            return;
        }));

        await Promise.all(promises);

        // Fetch the notes from server to be sure they're up to date.
        await CoreUtils.ignoreErrors(AddonNotes.invalidateNotes(courseId, undefined, siteId));

        await CoreUtils.ignoreErrors(AddonNotes.getNotes(courseId, undefined, false, true, siteId));

        if (errors && errors.length) {
            // At least an error occurred, get course name and add errors to warnings array.
            const course = await CoreUtils.ignoreErrors(CoreCourses.getUserCourse(courseId, true, siteId), {});

            result.warnings = errors.map((error) =>
                Translate.instant('addon.notes.warningnotenotsent', {
                    course: 'fullname' in course ? course.fullname : courseId, // @deprecated since 4.3.
                    error: error,
                }));
        }

        // All done, return the warnings.
        return result;
    }

}
export const AddonNotesSync = makeSingleton(AddonNotesSyncProvider);

export type AddonNotesSyncResult = {
    warnings: string[]; // List of warnings.
};

/**
 * Data passed to AUTO_SYNCED event.
 */
export type AddonNotesSyncAutoSyncData = {
    courseId: number;
    warnings: string[];
};

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [AddonNotesSyncProvider.AUTO_SYNCED]: AddonNotesSyncAutoSyncData;
    }

}
