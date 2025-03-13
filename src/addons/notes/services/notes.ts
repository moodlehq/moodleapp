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
import { CoreWSError } from '@classes/errors/wserror';
import { CoreUser } from '@features/user/services/user';
import { CoreNetwork } from '@services/network';
import { CoreSites } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonNotesOffline } from './notes-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreTextFormat, DEFAULT_TEXT_FORMAT } from '@singletons/text';

/**
 * Service to handle notes.
 */
@Injectable( { providedIn: 'root' } )
export class AddonNotesProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaNotes:';

    /**
     * Add a note.
     *
     * @param userId User ID of the person to add the note.
     * @param courseId Course ID where the note belongs.
     * @param publishState Personal, Site or Course.
     * @param noteText The note text.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if note was sent to server, false if stored in device.
     */
    async addNote(
        userId: number,
        courseId: number,
        publishState: AddonNotesPublishState,
        noteText: string,
        siteId?: string,
    ): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a note to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonNotesOffline.saveNote(userId, courseId, publishState, noteText, siteId);

            return false;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the note.
            return storeOffline();
        }

        // Send note to server.
        try {
            await this.addNoteOnline(userId, courseId, publishState, noteText, siteId);

            return true;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                throw error;
            }

            return storeOffline();
        }
    }

    /**
     * Add a note. It will fail if offline or cannot connect.
     *
     * @param userId User ID of the person to add the note.
     * @param courseId Course ID where the note belongs.
     * @param publishState Personal, Site or Course.
     * @param noteText The note text.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when added, rejected otherwise.
     */
    async addNoteOnline(
        userId: number,
        courseId: number,
        publishState: AddonNotesPublishState,
        noteText: string,
        siteId?: string,
    ): Promise<void> {
        const notes: AddonNotesCreateNoteData[] = [
            {
                courseid: courseId,
                format: DEFAULT_TEXT_FORMAT,
                publishstate: publishState,
                text: noteText,
                userid: userId,
            },
        ];

        const response = await this.addNotesOnline(notes, siteId);
        if (response && response[0] && response[0].noteid === -1) {
            // There was an error, and it should be translated already.
            throw new CoreWSError({ message: response[0].errormessage });
        }

        await CorePromiseUtils.ignoreErrors(this.invalidateNotes(courseId, undefined, siteId));
    }

    /**
     * Add several notes. It will fail if offline or cannot connect.
     *
     * @param notes Notes to save.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when added, rejected otherwise. Promise resolved doesn't mean that notes
     *         have been added, the resolve param can contain errors for notes not sent.
     */
    async addNotesOnline(notes: AddonNotesCreateNoteData[], siteId?: string): Promise<AddonNotesCreateNotesWSResponse> {
        if (!notes || !notes.length) {
            return [];
        }

        const site = await CoreSites.getSite(siteId);

        const data: AddonNotesCreateNotesWSParams = {
            notes: notes,
        };

        return site.write('core_notes_create_notes', data);
    }

    /**
     * Delete a note.
     *
     * @param note Note object to delete.
     * @param courseId Course ID where the note belongs.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted, rejected otherwise. Promise resolved doesn't mean that notes
     *         have been deleted, the resolve param can contain errors for notes not deleted.
     */
    async deleteNote(note: AddonNotesNoteFormatted, courseId: number, siteId?: string): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (note.offline) {
            await AddonNotesOffline.deleteOfflineNote(note.userid, note.content, note.created, siteId);

            return true;
        }

        // Convenience function to store the action to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            await AddonNotesOffline.deleteNote(note.id, courseId, siteId);

            return false;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the note.
            return storeOffline();
        }

        // Send note to server.
        try {
            await this.deleteNotesOnline([note.id], courseId, siteId);

            return true;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the note so don't store it.
                throw error;
            }

            return storeOffline();
        }
    }

    /**
     * Delete a note. It will fail if offline or cannot connect.
     *
     * @param noteIds Note IDs to delete.
     * @param courseId Course ID where the note belongs.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when deleted, rejected otherwise. Promise resolved doesn't mean that notes
     *         have been deleted, the resolve param can contain errors for notes not deleted.
     */
    async deleteNotesOnline(noteIds: number[], courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonNotesDeleteNotesWSParams = {
            notes: noteIds,
        };

        await site.write('core_notes_delete_notes', params);

        CorePromiseUtils.ignoreErrors(this.invalidateNotes(courseId, undefined, siteId));
    }

    /**
     * Returns whether or not the notes plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.canUseAdvancedFeature('enablenotes');
    }

    /**
     * Returns whether or not the add note plugin is enabled for a certain course.
     *
     * @param courseId ID of the course.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    async isPluginAddNoteEnabledForCourse(courseId: number, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        // The only way to detect if it's enabled is to perform a WS call.
        // We use an invalid user ID (-1) to avoid saving the note if the user has permissions.
        const params: AddonNotesCreateNotesWSParams = {
            notes: [
                {
                    userid: -1,
                    publishstate: 'personal',
                    courseid: courseId,
                    text: '',
                    format: DEFAULT_TEXT_FORMAT,
                },
            ],
        };
        const preSets: CoreSiteWSPreSets = {
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        // Use .read to cache data and be able to check it in offline. This means that, if a user loses the capabilities
        // to add notes, he'll still see the option in the app.
        return CorePromiseUtils.promiseWorks(site.read('core_notes_create_notes', params, preSets));
    }

    /**
     * Returns whether or not the read notes plugin is enabled for a certain course.
     *
     * @param courseId ID of the course.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginViewNotesEnabledForCourse(courseId: number, siteId?: string): Promise<boolean> {
        return CorePromiseUtils.promiseWorks(this.getNotes(courseId, undefined, false, true, siteId));
    }

    /**
     * Get prefix cache key for course notes.
     *
     * @param courseId ID of the course to get the notes from.
     * @returns Cache key.
     */
    getNotesPrefixCacheKey(courseId: number): string {
        return `${AddonNotesProvider.ROOT_CACHE_KEY}notes:${courseId}:`;
    }

    /**
     * Get the cache key for the get notes call.
     *
     * @param courseId ID of the course to get the notes from.
     * @param userId ID of the user to get the notes from if requested.
     * @returns Cache key.
     */
    getNotesCacheKey(courseId: number, userId?: number): string {
        return this.getNotesPrefixCacheKey(courseId) + (userId ? userId : '');
    }

    /**
     * Get users notes for a certain site, course and personal notes.
     *
     * @param courseId ID of the course to get the notes from.
     * @param userId ID of the user to get the notes from if requested.
     * @param ignoreCache True when we should not get the value from the cache.
     * @param onlyOnline True to return only online notes, false to return both online and offline.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the notes are retrieved.
     */
    async getNotes(
        courseId: number,
        userId?: number,
        ignoreCache = false,
        onlyOnline = false,
        siteId?: string,
    ): Promise<AddonNotesGetCourseNotesWSResponse> {

        const site = await CoreSites.getSite(siteId);
        const params: AddonNotesGetCourseNotesWSParams = {
            courseid: courseId,
        };
        if (userId) {
            params.userid = userId;
        }

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getNotesCacheKey(courseId, userId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }
        const notes = await site.read<AddonNotesGetCourseNotesWSResponse>('core_notes_get_course_notes', params, preSets);
        if (onlyOnline) {
            return notes;
        }

        const offlineNotes = await AddonNotesOffline.getNotesForCourseAndUser(courseId, userId, siteId);
        offlineNotes.forEach((note: AddonNotesNote) => {
            const fieldName = `${note.publishstate}notes`;
            if (!notes[fieldName]) {
                notes[fieldName] = [];
            }
            note.offline = true;
            // Add note to the start of array since last notes are shown first.
            notes[fieldName].unshift(note);
        });

        return notes;
    }

    /**
     * Get offline deleted notes and set the state.
     *
     * @param notes Array of notes.
     * @param courseId ID of the course the notes belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async setOfflineDeletedNotes(
        notes: AddonNotesNoteFormatted[],
        courseId: number,
        siteId?: string,
    ): Promise<void> {
        const deletedNotes = await AddonNotesOffline.getCourseDeletedNotes(courseId, siteId);

        notes.forEach((note) => {
            note.deleted = deletedNotes.some((n) => n.noteid == note.id);
        });
    }

    /**
     * Get user data for notes since they only have userid.
     *
     * @param notes Notes to get the data for.
     * @returns Promise always resolved. Resolve param is the formatted notes.
     */
    async getNotesUserData(notes: AddonNotesNoteFormatted[]): Promise<AddonNotesNoteFormatted[]> {
        const promises = notes.map((note) =>
            // Get the user profile to retrieve the user image.
            CoreUser.getProfile(note.userid, note.courseid, true).then((user) => {
                note.userfullname = user.fullname;
                note.userprofileimageurl = user.profileimageurl;

                return;
            }).catch(() => {
                note.userfullname = Translate.instant('core.user.userwithid', { id: note.userid });
            }));

        await Promise.all(promises);

        return notes;
    }

    /**
     * Invalidate get notes WS call.
     *
     * @param courseId Course ID.
     * @param userId User ID if needed.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateNotes(courseId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        if (userId) {
            await site.invalidateWsCacheForKey(this.getNotesCacheKey(courseId, userId));

            return;
        }

        await site.invalidateWsCacheForKeyStartingWith(this.getNotesPrefixCacheKey(courseId));
    }

    /**
     * Report notes as being viewed.
     *
     * @param courseId ID of the course.
     * @param userId User ID if needed.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(courseId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonNotesViewNotesWSParams = {
            courseid: courseId,
            userid: userId || 0,
        };

        await site.write('core_notes_view_notes', params);
    }

}
export const AddonNotes = makeSingleton(AddonNotesProvider);

/**
 * Params of core_notes_view_notes WS.
 */
type AddonNotesViewNotesWSParams = {
    courseid: number; // Course id, 0 for notes at system level.
    userid?: number; // User id, 0 means view all the user notes.
};

/**
 * Params of core_notes_get_course_notes WS.
 */
export type AddonNotesGetCourseNotesWSParams = {
    courseid: number; // Course id, 0 for SITE.
    userid?: number; // User id.
};

/**
 * Note data returned by core_notes_get_course_notes.
 */
export type AddonNotesNote = {
    id: number; // Id of this note.
    courseid: number; // Id of the course.
    userid: number; // User id.
    content: string; // The content text formated.
    format: CoreTextFormat; // Content format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    created: number; // Time created (timestamp).
    lastmodified: number; // Time of last modification (timestamp).
    usermodified: number; // User id of the creator of this note.
    publishstate: AddonNotesPublishState; // State of the note (i.e. draft, public, site).
    offline?: boolean;
};

/**
 * Result of WS core_notes_get_course_notes.
 */
export type AddonNotesGetCourseNotesWSResponse = {
    sitenotes?: AddonNotesNote[]; // Site notes.
    coursenotes?: AddonNotesNote[]; // Couse notes.
    personalnotes?: AddonNotesNote[]; // Personal notes.
    canmanagesystemnotes?: boolean; // @since 3.7. Whether the user can manage notes at system level.
    canmanagecoursenotes?: boolean; // @since 3.7. Whether the user can manage notes at the given course.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_notes_view_notes.
 */
export type AddonNotesViewNotesResult = {
    status: boolean; // Status: true if success.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Notes with some calculated data.
 */
export type AddonNotesNoteFormatted = AddonNotesNote & {
    offline?: boolean; // Calculated in the app. Whether it's an offline note.
    deleted?: boolean; // Calculated in the app. Whether the note was deleted in offline.
    userfullname?: string; // Calculated in the app. Full name of the user the note refers to.
    userprofileimageurl?: string; // Calculated in the app. Avatar url of the user the note refers to.
};

export type AddonNotesCreateNoteData = {
    userid: number; // Id of the user the note is about.
    publishstate: AddonNotesPublishState; // 'personal', 'course' or 'site'.
    courseid: number; // Course id of the note (in Moodle a note can only be created into a course,
    // even for site and personal notes).
    text: string; // The text of the message - text or HTML.
    format?: CoreTextFormat; // Text format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    clientnoteid?: string; // Your own client id for the note. If this id is provided, the fail message id will be returned to you.
};

/**
 * Params of core_notes_create_notes WS.
 */
type AddonNotesCreateNotesWSParams = {
    notes: AddonNotesCreateNoteData[];
};

/**
 * Note returned by WS core_notes_create_notes.
 */
export type AddonNotesCreateNotesWSResponse = {
    clientnoteid?: string; // Your own id for the note.
    noteid: number; // ID of the created note when successful, -1 when failed.
    errormessage?: string; // Error message - if failed.
}[];

/**
 * Params of core_notes_delete_notes WS.
 */
type AddonNotesDeleteNotesWSParams = {
    notes: number[]; // Array of Note Ids to be deleted.
};

export type AddonNotesPublishState = 'personal' | 'site' | 'course';
