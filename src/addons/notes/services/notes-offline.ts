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
import { CoreSites } from '@services/sites';
import { CoreTimeUtils } from '@services/utils/time';
import { makeSingleton } from '@singletons';
import { AddonNotesDBRecord, AddonNotesDeletedDBRecord, NOTES_DELETED_TABLE, NOTES_TABLE } from './database/notes';
import { AddonNotesPublishState } from './notes';

/**
 * Service to handle offline notes.
 */
@Injectable( { providedIn: 'root' } )
export class AddonNotesOfflineProvider {

    /**
     * Delete an offline note.
     *
     * @param userId User ID the note is about.
     * @param content The note content.
     * @param timecreated The time the note was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteOfflineNote(userId: number, content: string, timecreated: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(NOTES_TABLE, {
            userid: userId,
            content: content,
            created: timecreated,
        });
    }

    /**
     * Get all offline deleted notes.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with notes.
     */
    async getAllDeletedNotes(siteId?: string): Promise<AddonNotesDeletedDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NOTES_DELETED_TABLE);
    }

    /**
     * Get course offline deleted notes.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with notes.
     */
    async getCourseDeletedNotes(courseId: number, siteId?: string): Promise<AddonNotesDeletedDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NOTES_DELETED_TABLE, { courseid: courseId });
    }

    /**
     * Get all offline notes.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with notes.
     */
    async getAllNotes(siteId?: string): Promise<AddonNotesDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NOTES_TABLE);
    }

    /**
     * Get an offline note.
     *
     * @param userId User ID the note is about.
     * @param content The note content.
     * @param timecreated The time the note was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the notes.
     */
    async getNote(userId: number, content: string, timecreated: number, siteId?: string): Promise<AddonNotesDBRecord> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecord(NOTES_TABLE, {
            userid: userId,
            content: content,
            created: timecreated,
        });
    }

    /**
     * Get offline notes for a certain course and user.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with notes.
     */
    async getNotesForCourseAndUser(courseId: number, userId?: number, siteId?: string): Promise<AddonNotesDBRecord[]> {
        if (!userId) {
            return this.getNotesForCourse(courseId, siteId);
        }

        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NOTES_TABLE, { userid: userId, courseid: courseId });
    }

    /**
     * Get offline notes for a certain course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with notes.
     */
    async getNotesForCourse(courseId: number, siteId?: string): Promise<AddonNotesDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NOTES_TABLE, { courseid: courseId });
    }

    /**
     * Get offline notes for a certain user.
     *
     * @param userId User ID the notes are about.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with notes.
     */
    async getNotesForUser(userId: number, siteId?: string): Promise<AddonNotesDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NOTES_TABLE, { userid: userId });
    }

    /**
     * Get offline notes with a certain publish state (Personal, Site or Course).
     *
     * @param state Publish state ('personal', 'site' or 'course').
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with notes.
     */
    async getNotesWithPublishState(state: AddonNotesPublishState, siteId?: string): Promise<AddonNotesDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(NOTES_TABLE, { publishstate: state });
    }

    /**
     * Check if there are offline notes for a certain course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    async hasNotesForCourse(courseId: number, siteId?: string): Promise<boolean> {
        const notes = await this.getNotesForCourse(courseId, siteId);

        return !!notes.length;
    }

    /**
     * Check if there are offline notes for a certain user.
     *
     * @param userId User ID the notes are about.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    async hasNotesForUser(userId: number, siteId?: string): Promise<boolean> {
        const notes = await this.getNotesForUser(userId, siteId);

        return !!notes.length;
    }

    /**
     * Check if there are offline notes with a certain publish state (Personal, Site or Course).
     *
     * @param state Publish state ('personal', 'site' or 'course').
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    async hasNotesWithPublishState(state: AddonNotesPublishState, siteId?: string): Promise<boolean> {
        const notes = await this.getNotesWithPublishState(state, siteId);

        return !!notes.length;
    }

    /**
     * Save a note to be sent later.
     *
     * @param userId User ID the note is about.
     * @param courseId Course ID.
     * @param state Publish state ('personal', 'site' or 'course').
     * @param content The note content.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async saveNote(
        userId: number,
        courseId: number,
        state: AddonNotesPublishState,
        content: string,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const now = CoreTimeUtils.timestamp();
        const data: AddonNotesDBRecord = {
            userid: userId,
            courseid: courseId,
            publishstate: state,
            content: content,
            format: 1,
            created: now,
            lastmodified: now,
        };

        await site.getDb().insertRecord(NOTES_TABLE, data);
    }

    /**
     * Delete a note offline to be sent later.
     *
     * @param noteId Note ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteNote(noteId: number, courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const data: AddonNotesDeletedDBRecord = {
            noteid: noteId,
            courseid: courseId,
            deleted: CoreTimeUtils.timestamp(),
        };

        await site.getDb().insertRecord(NOTES_DELETED_TABLE, data);
    }

    /**
     * Undo delete a note.
     *
     * @param noteId Note ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async undoDeleteNote(noteId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(NOTES_DELETED_TABLE, { noteid: noteId });
    }

}
export const AddonNotesOffline = makeSingleton(AddonNotesOfflineProvider);
