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

angular.module('mm.addons.notes')

/**
 * Notes factory.
 *
 * @module mm.addons.notes
 * @ngdoc service
 * @name $mmaNotes
 */
.factory('$mmaNotes', function($mmSite, $log, $q, $mmUser, $translate, $mmApp, $mmaNotesOffline, $mmUtil, $mmSitesManager) {
    $log = $log.getInstance('$mmaNotes');

    var self = {};

    /**
     * Add a note.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#addNote
     * @param {Number} userId       User ID of the person to add the note.
     * @param {Number} courseId     Course ID where the note belongs.
     * @param {String} publishState Personal, Site or Course.
     * @param {String} noteText     The note text.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with boolean: true if note was sent to server, false if stored in device.
     */
    self.addNote = function(userId, courseId, publishState, noteText, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!$mmApp.isOnline()) {
            // App is offline, store the note.
            return storeOffline();
        }

        // Send note to server.
        return self.addNoteOnline(userId, courseId, publishState, noteText, siteId).then(function() {
            return true;
        }).catch(function(data) {
            if (data.wserror) {
                // It's a WebService error, the user cannot add the note so don't store it.
                return $q.reject(data.error);
            } else {
                // Error sending note, store it to retry later.
                return storeOffline();
            }
        });

        // Convenience function to store a note to be synchronized later.
        function storeOffline() {
            return $mmaNotesOffline.saveNote(userId, courseId, publishState, noteText, siteId).then(function() {
                return false;
            });
        }
    };

    /**
     * Add a note. It will fail if offline or cannot connect.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#addNoteOnline
     * @param {Number} userId       User ID of the person to add the note.
     * @param {Number} courseId     Course ID where the note belongs.
     * @param {String} publishState Personal, Site or Course.
     * @param {String} noteText     The note text.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when added, rejected otherwise. Reject param is an object with:
     *                                   - error: The error message.
     *                                   - wserror: True if it's an error returned by the WebService, false otherwise.
     */
    self.addNoteOnline = function(userId, courseId, publishState, noteText, siteId) {
        var notes = [
                {
                    userid: userId,
                    publishstate: publishState,
                    courseid: courseId,
                    text: noteText,
                    format: 1
                }
            ];

        return self.addNotesOnline(notes, siteId).catch(function(error) {
            return $q.reject({
                error: error,
                wserror: $mmUtil.isWebServiceError(error)
            });
        }).then(function(response) {
            if (response && response[0] && response[0].noteid === -1) {
                // There was an error, and it should be translated already.
                return $q.reject({
                    error: response[0].errormessage,
                    wserror: true
                });
            }

            // A note was added, invalidate the course notes.
            return self.invalidateNotes(courseId, siteId).catch(function() {
                // Ignore errors.
            });
        });
    };

    /**
     * Add several notes. It will fail if offline or cannot connect.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#addNotesOnline
     * @param  {Object[]} notes  Notes to save.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when added, rejected otherwise. Promise resolved doesn't mean that notes
     *                           have been added, the resolve param can contain errors for notes not sent.
     */
    self.addNotesOnline = function(notes, siteId) {
        if (!notes || !notes.length) {
            return $q.when([]);
        }

        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var data = {
                    notes: notes
                };

            return site.write('core_notes_create_notes', data);
        });
    };

    /**
     * Returns whether or not the add note plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginAddNoteEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isPluginAddNoteEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.canUseAdvancedFeature('enablenotes')) {
                return false;
            } else if (!site.wsAvailable('core_notes_create_notes')) {
                return false;
            }

            return true;
        });
    };

    /**
     * Returns whether or not the add note plugin is enabled for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginAddNoteEnabledForCourse
     * @param  {Number} courseId ID of the course.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isPluginAddNoteEnabledForCourse = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            // The only way to detect if it's enabled is to perform a WS call.
            // We use an invalid user ID (-1) to avoid saving the note if the user has permissions.
            var data = {
                    notes: [
                        {
                            userid: -1,
                            publishstate: 'personal',
                            courseid: courseId,
                            text: '',
                            format: 1
                        }
                    ]
                };

            // Use .read to cache data and be able to check it in offline. This means that, if a user loses the capabilities
            // to add notes, he'll still see the option in the app.
            return site.read('core_notes_create_notes', data).then(function() {
                // User can add notes.
                return true;
            }).catch(function() {
                return false;
            });
        });
    };

    /**
     * Returns whether or not the read notes plugin is enabled for the current site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginViewNotesEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isPluginViewNotesEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.canUseAdvancedFeature('enablenotes')) {
                return false;
            } else if (!site.wsAvailable('core_notes_get_course_notes')) {
                return false;
            }

            return true;
        });
    };

    /**
     * Returns whether or not the read notes plugin is enabled for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginViewNotesEnabledForCourse
     * @param  {Number} courseId ID of the course.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    self.isPluginViewNotesEnabledForCourse = function(courseId, siteId) {
        return self.getNotes(courseId, false, true, siteId).then(function() {
            return true;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Get the cache key for the get notes call.
     *
     * @param  {Number} courseId ID of the course to get the notes from.
     * @return {String}          Cache key.
     */
    function getNotesCacheKey(courseId) {
        return 'mmaNotes:notes:' + courseId;
    }

    /**
     * Get users notes for a certain site, course and personal notes.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#getNotes
     * @param  {Number} courseId     ID of the course to get the notes from.
     * @param  {Boolean} ignoreCache True when we should not get the value from the cache.
     * @param  {Boolean} onlyOnline  True to return only online notes, false to return both online and offline.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise to be resolved when the notes are retrieved.
     */
    self.getNotes = function(courseId, ignoreCache, onlyOnline, siteId) {
        siteId = siteId || $mmSite.getId();

        $log.debug('Get notes for course ' + courseId);

        return $mmSitesManager.getSite(siteId).then(function(site) {

            var data = {
                    courseid : courseId
                },
                presets = {
                    cacheKey: getNotesCacheKey(courseId)
                };

            if (ignoreCache) {
                presets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_notes_get_course_notes', data, presets).then(function(notes) {
                if (onlyOnline) {
                    return notes;
                }

                // Get offline notes and add them to the list.
                return $mmaNotesOffline.getNotesForCourse(courseId, siteId).then(function(offlineNotes) {
                    angular.forEach(offlineNotes, function(note) {
                        var fieldName = note.publishstate + 'notes';
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
    };

    /**
     * Get user data for notes since they only have userid.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#getNotesUserData
     * @param  {Object[]} notes  Notes to get the data for.
     * @param  {Number} courseId ID of the course the notes belong to.
     * @return {Promise}         Promise always resolved. Resolve param is the formatted notes.
     */
    self.getNotesUserData = function(notes, courseId) {
        var promises = [];

        angular.forEach(notes, function(note) {
            var promise = $mmUser.getProfile(note.userid, courseId, true).then(function(user) {
                note.userfullname = user.fullname;
                note.userprofileimageurl = user.profileimageurl;
            }, function() {
                // Error getting profile. Set default data.
                return $translate('mma.notes.userwithid', {id: note.userid}).then(function(str) {
                    note.userfullname = str;
                });
            });
            promises.push(promise);
        });
        return $q.all(promises).then(function() {
            return notes;
        });
    };

    /**
     * Given a list of notes, check if any of them is an offline note.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#hasOfflineNote
     * @param  {Object[]}  notes List of notes.
     * @return {Boolean}         True if at least 1 note is offline, false otherwise.
     */
    self.hasOfflineNote = function(notes) {
        if (!notes || !notes.length) {
            return false;
        }

        for (var i = 0, len = notes.length; i < len; i++) {
            if (notes[i].offline) {
                return true;
            }
        }

        return false;
    };

    /**
     * Invalidate get notes WS call.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#invalidateNotes
     * @param {Number} courseId  Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when data is invalidated.
     */
    self.invalidateNotes = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getNotesCacheKey(courseId));
        });
    };

    return self;
});
