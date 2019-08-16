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
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { TranslateService } from '@ngx-translate/core';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonNotesOfflineProvider } from './notes-offline';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';

/**
 * Service to handle notes.
 */
@Injectable()
export class AddonNotesProvider {

    protected ROOT_CACHE_KEY = 'mmaNotes:';
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider,
            private utils: CoreUtilsProvider, private translate: TranslateService, private userProvider: CoreUserProvider,
            private notesOffline: AddonNotesOfflineProvider, protected pushNotificationsProvider: CorePushNotificationsProvider) {
        this.logger = logger.getInstance('AddonNotesProvider');
    }

    /**
     * Add a note.
     *
     * @param  {number} userId       User ID of the person to add the note.
     * @param  {number} courseId     Course ID where the note belongs.
     * @param  {string} publishState Personal, Site or Course.
     * @param  {string} noteText     The note text.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<boolean>}    Promise resolved with boolean: true if note was sent to server, false if stored in device.
     */
    addNote(userId: number, courseId: number, publishState: string, noteText: string, siteId?: string): Promise<boolean> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a note to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.notesOffline.saveNote(userId, courseId, publishState, noteText, siteId).then(() => {
                return false;
            });
        };

        if (!this.appProvider.isOnline()) {
            // App is offline, store the note.
            return storeOffline();
        }

        // Send note to server.
        return this.addNoteOnline(userId, courseId, publishState, noteText, siteId).then(() => {
            return true;
        }).catch((error) => {
            if (this.utils.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                return Promise.reject(error);
            }

            // Error sending note, store it to retry later.
            return storeOffline();
        });
    }

    /**
     * Add a note. It will fail if offline or cannot connect.
     *
     * @param  {number} userId       User ID of the person to add the note.
     * @param  {number} courseId     Course ID where the note belongs.
     * @param  {string} publishState Personal, Site or Course.
     * @param  {string} noteText     The note text.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when added, rejected otherwise.
     */
    addNoteOnline(userId: number, courseId: number, publishState: string, noteText: string, siteId?: string): Promise<any> {
        const notes = [
            {
                courseid: courseId,
                format: 1,
                publishstate: publishState,
                text: noteText,
                userid: userId
            }
        ];

        return this.addNotesOnline(notes, siteId).then((response) => {
            if (response && response[0] && response[0].noteid === -1) {
                // There was an error, and it should be translated already.
                return Promise.reject(this.utils.createFakeWSError(response[0].errormessage));
            }

            // A note was added, invalidate the course notes.
            return this.invalidateNotes(courseId, undefined, siteId).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Add several notes. It will fail if offline or cannot connect.
     *
     * @param  {any[]}  notes    Notes to save.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when added, rejected otherwise. Promise resolved doesn't mean that notes
     *                           have been added, the resolve param can contain errors for notes not sent.
     */
    addNotesOnline(notes: any[], siteId?: string): Promise<any> {
        if (!notes || !notes.length) {
            return Promise.resolve();
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                notes: notes
            };

            return site.write('core_notes_create_notes', data);
        });
    }

    /**
     * Returns whether or not the notes plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.canUseAdvancedFeature('enablenotes');
        });
    }

    /**
     * Returns whether or not the add note plugin is enabled for a certain course.
     *
     * @param  {number} courseId  ID of the course.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginAddNoteEnabledForCourse(courseId: number, siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // The only way to detect if it's enabled is to perform a WS call.
            // We use an invalid user ID (-1) to avoid saving the note if the user has permissions.
            const data = {
                    notes: [
                        {
                            userid: -1,
                            publishstate: 'personal',
                            courseid: courseId,
                            text: '',
                            format: 1
                        }
                    ]
                },
                preSets = {
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            /* Use .read to cache data and be able to check it in offline. This means that, if a user loses the capabilities
               to add notes, he'll still see the option in the app. */
            return this.utils.promiseWorks(site.read('core_notes_create_notes', data, preSets));
        });
    }

    /**
     * Returns whether or not the read notes plugin is enabled for a certain course.
     *
     * @param  {number} courseId  ID of the course.
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginViewNotesEnabledForCourse(courseId: number, siteId?: string): Promise<boolean> {
        return this.utils.promiseWorks(this.getNotes(courseId, undefined, false, true, siteId));
    }

    /**
     * Get prefix cache key for course notes.
     *
     * @param  {number} courseId ID of the course to get the notes from.
     * @return {string}          Cache key.
     */
    getNotesPrefixCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'notes:' + courseId + ':';
    }

    /**
     * Get the cache key for the get notes call.
     *
     * @param  {number} courseId ID of the course to get the notes from.
     * @param  {number}  [userId]      ID of the user to get the notes from if requested.
     * @return {string}          Cache key.
     */
    getNotesCacheKey(courseId: number, userId?: number): string {
        return this.getNotesPrefixCacheKey(courseId) + (userId ? userId : '');
    }

    /**
     * Get users notes for a certain site, course and personal notes.
     *
     * @param  {number}  courseId      ID of the course to get the notes from.
     * @param  {number}  [userId]      ID of the user to get the notes from if requested.
     * @param  {boolean} [ignoreCache] True when we should not get the value from the cache.
     * @param  {boolean} [onlyOnline]  True to return only online notes, false to return both online and offline.
     * @param  {string}  [siteId]      Site ID. If not defined, current site.
     * @return {Promise<any>}          Promise to be resolved when the notes are retrieved.
     */
    getNotes(courseId: number, userId?: number, ignoreCache?: boolean, onlyOnline?: boolean, siteId?: string): Promise<any> {
        this.logger.debug('Get notes for course ' + courseId);

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                courseid: courseId
            };

            if (userId) {
                data['userid'] = userId;
            }

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getNotesCacheKey(courseId, userId),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_notes_get_course_notes', data, preSets).then((notes) => {
                if (onlyOnline) {
                    return notes;
                }

                // Get offline notes and add them to the list.
                return this.notesOffline.getNotesForCourseAndUser(courseId, userId, siteId).then((offlineNotes) => {
                    offlineNotes.forEach((note) => {
                        const fieldName = note.publishstate + 'notes';
                        if (!notes[fieldName]) {
                            notes[fieldName] = [];
                        }
                        note.offline = true;
                        // Add note to the start of array since last notes are shown first.
                        notes[fieldName].unshift(note);
                    });

                    return notes;
                });
            });
        });
    }

    /**
     * Get user data for notes since they only have userid.
     *
     * @param  {any[]}  notes    Notes to get the data for.
     * @param  {number} courseId ID of the course the notes belong to.
     * @return {Promise<any>}    Promise always resolved. Resolve param is the formatted notes.
     */
    getNotesUserData(notes: any[], courseId: number): Promise<any> {
        const promises = notes.map((note) => {
            // Get the user profile to retrieve the user image.
            return this.userProvider.getProfile(note.userid, note.courseid, true).then((user) => {
                note.userfullname = user.fullname;
                note.userprofileimageurl = user.profileimageurl || null;
            }).catch(() => {
                note.userfullname = this.translate.instant('addon.notes.userwithid', {id: note.userid});
            });
        });

        return Promise.all(promises).then(() => {
            return notes;
        });
    }

    /**
     * Invalidate get notes WS call.
     *
     * @param  {number} courseId Course ID.
     * @param  {number} [userId] User ID if needed.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved when data is invalidated.
     */
    invalidateNotes(courseId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (userId) {
                return site.invalidateWsCacheForKey(this.getNotesCacheKey(courseId, userId));
            }

            return site.invalidateWsCacheForKeyStartingWith(this.getNotesPrefixCacheKey(courseId));
        });
    }

    /**
     * Report notes as being viewed.
     *
     * @param {number} courseId  ID of the course.
     * @param {number} [userId]  User ID if needed.
     * @param {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logView(courseId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                courseid: courseId,
                userid: userId || 0
            };

            this.pushNotificationsProvider.logViewListEvent('notes', 'core_notes_view_notes', params, site.getId());

            return site.write('core_notes_view_notes', params);
        });
    }
}
