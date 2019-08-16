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

import { Injectable } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * Service to handle offline notes.
 */
@Injectable()
export class AddonNotesOfflineProvider {
    protected logger;

    // Variables for database.
    static NOTES_TABLE = 'addon_notes_offline_notes';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonNotesOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonNotesOfflineProvider.NOTES_TABLE,
                columns: [
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'publishstate',
                        type: 'TEXT',
                    },
                    {
                        name: 'content',
                        type: 'TEXT'
                    },
                    {
                        name: 'format',
                        type: 'INTEGER'
                    },
                    {
                        name: 'created',
                        type: 'INTEGER'
                    },
                    {
                        name: 'lastmodified',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['userid', 'content', 'created']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider,  private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider) {
        this.logger = logger.getInstance('AddonNotesOfflineProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a note.
     *
     * @param  {number} userId      User ID the note is about.
     * @param  {string} content     The note content.
     * @param  {number} timecreated The time the note was created.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved if deleted, rejected if failure.
     */
    deleteNote(userId: number, content: string, timecreated: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonNotesOfflineProvider.NOTES_TABLE, {
                userid: userId,
                content: content,
                created: timecreated
            });
        });
    }

    /**
     * Get all offline notes.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved with notes.
     */
    getAllNotes(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonNotesOfflineProvider.NOTES_TABLE);
        });
    }

    /**
     * Get an offline note.
     *
     * @param  {number} userId      User ID the note is about.
     * @param  {string} content     The note content.
     * @param  {number} timecreated The time the note was created.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved with the notes.
     */
    getNote(userId: number, content: string, timecreated: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonNotesOfflineProvider.NOTES_TABLE, {
                userid: userId,
                content: content,
                created: timecreated
            });
        });
    }

    /**
     * Get offline notes for a certain course and user.
     *
     * @param  {number} courseId Course ID.
     * @param  {number} [userId] User ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>}  Promise resolved with notes.
     */
    getNotesForCourseAndUser(courseId: number, userId?: number, siteId?: string): Promise<any[]> {
        if (!userId) {
            return this.getNotesForCourse(courseId, siteId);
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonNotesOfflineProvider.NOTES_TABLE, {userid: userId, courseid: courseId});
        });
    }

    /**
     * Get offline notes for a certain course.
     *
     * @param  {number} courseId Course ID.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>}  Promise resolved with notes.
     */
    getNotesForCourse(courseId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonNotesOfflineProvider.NOTES_TABLE, {courseid: courseId});
        });
    }

    /**
     * Get offline notes for a certain user.
     *
     * @param  {number} userId   User ID the notes are about.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>}  Promise resolved with notes.
     */
    getNotesForUser(userId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonNotesOfflineProvider.NOTES_TABLE, {userid: userId});
        });
    }

    /**
     * Get offline notes with a certain publish state (Personal, Site or Course).
     *
     * @param  {string} state    Publish state ('personal', 'site' or 'course').
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>}  Promise resolved with notes.
     */
    getNotesWithPublishState(state: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonNotesOfflineProvider.NOTES_TABLE, {publishstate: state});
        });
    }

    /**
     * Check if there are offline notes for a certain course.
     *
     * @param  {number} courseId  Course ID.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    hasNotesForCourse(courseId: number, siteId?: string): Promise<boolean> {
        return this.getNotesForCourse(courseId, siteId).then((notes) => {
            return !!notes.length;
        });
    }

    /**
     * Check if there are offline notes for a certain user.
     *
     * @param  {number} userId    User ID the notes are about.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    hasNotesForUser(userId: number, siteId?: string): Promise<boolean> {
        return this.getNotesForUser(userId, siteId).then((notes) => {
            return !!notes.length;
        });
    }

    /**
     * Check if there are offline notes with a certain publish state (Personal, Site or Course).
     *
     * @param  {string} state     Publish state ('personal', 'site' or 'course').
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    hasNotesWithPublishState(state: string, siteId?: string): Promise<boolean> {
        return this.getNotesWithPublishState(state, siteId).then((notes) => {
            return !!notes.length;
        });
    }

    /**
     * Save a note to be sent later.
     *
     * @param  {number} userId   User ID the note is about.
     * @param  {number} courseId Course ID.
     * @param  {string} state    Publish state ('personal', 'site' or 'course').
     * @param  {string} content  The note content.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if stored, rejected if failure.
     */
    saveNote(userId: number, courseId: number, state: string, content: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const now = this.timeUtils.timestamp();
            const data = {
                userid: userId,
                courseid: courseId,
                publishstate: state,
                content: content,
                format: 1,
                created: now,
                lastmodified: now
            };

            return site.getDb().insertRecord(AddonNotesOfflineProvider.NOTES_TABLE, data).then(() => {
                return data;
            });
        });
    }
}
