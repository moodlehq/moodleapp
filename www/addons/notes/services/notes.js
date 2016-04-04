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
.factory('$mmaNotes', function($mmSite, $log, $q, $mmUser, $translate) {
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
     * @return {Promise}
     */
    self.addNote = function(userId, courseId, publishState, noteText) {
        var data = {
            "notes[0][userid]" : userId,
            "notes[0][publishstate]": publishState,
            "notes[0][courseid]": courseId,
            "notes[0][text]": noteText,
            "notes[0][format]": 1
        };
        return $mmSite.write('core_notes_create_notes', data).then(function(response) {
            if (!response || !response.length) {
                return $q.reject();
            }

            if (response[0].noteid == -1) {
                return $q.reject(response[0].errormessage);
            }
            return response;
        });
    };

    /**
     * Returns whether or not the add note plugin is enabled for the current site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginAddNoteEnabled
     * @return {Boolean}
     */
    self.isPluginAddNoteEnabled = function() {
        if (!$mmSite.isLoggedIn()) {
            return false;
        } else if (!$mmSite.canUseAdvancedFeature('enablenotes')) {
            return false;
        } else if (!$mmSite.wsAvailable('core_notes_create_notes')) {
            return false;
        }

        return true;
    };

    /**
     * Returns whether or not the add note plugin is enabled for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginAddNoteEnabledForCourse
     * @param {Number} courseId ID of the course.
     * @return {Promise}        Promise resolved with true if enabled, resolved with false otherwise.
     */
    self.isPluginAddNoteEnabledForCourse = function(courseId) {
        // The only way to detect if it's enabled is to perform a WS call.
        // We use an invalid user ID (-1) to avoid saving the note if the user has permissions.
        var data = {
            "notes[0][userid]" : -1,
            "notes[0][courseid]": courseId,
            "notes[0][publishstate]": 'personal',
            "notes[0][text]": '',
            "notes[0][format]": 1
        };
        return $mmSite.read('core_notes_create_notes', data).then(function() {
            // User can add notes.
            return true;
        }).catch(function() {
            return false;
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
     * @return {Boolean}
     */
    self.isPluginViewNotesEnabled = function() {
        if (!$mmSite.isLoggedIn()) {
            return false;
        } else if (!$mmSite.canUseAdvancedFeature('enablenotes')) {
            return false;
        } else if (!$mmSite.wsAvailable('core_notes_get_course_notes')) {
            return false;
        }

        return true;
    };

    /**
     * Returns whether or not the read notes plugin is enabled for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#isPluginViewNotesEnabledForCourse
     * @param {Number} courseId ID of the course.
     * @return {Promise}        Promise resolved with true if enabled, resolved with false otherwise.
     */
    self.isPluginViewNotesEnabledForCourse = function(courseId) {
        return self.getNotes(courseId).then(function() {
            return true;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Get users notes for a certain site, course and personal notes.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#getNotes
     * @param {Number} courseid ID of the course to get the notes from.
     * @param {Boolean} refresh True when we should not get the value from the cache.
     * @return {Promise}        Promise to be resolved when the notes are retrieved.
     */
    self.getNotes = function(courseid, refresh) {

        $log.debug('Get notes for course ' + courseid);

        var data = {
                courseid : courseid
            },
            presets = {};
        if (refresh) {
            presets.getFromCache = false;
        }

        return $mmSite.read('core_notes_get_course_notes', data, presets);
    };

    /**
     * Get user data for notes since they only have userid.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotes#getNotesUserData
     * @param {Object[]} notes       Notes to get the data for.
     * @param {Number}   courseid    ID of the course the notes belong to.
     * @return {Promise}             Promise always resolved. Resolve param is the formatted notes.
     */
    self.getNotesUserData = function(notes, courseid) {
        var promises = [];

        angular.forEach(notes, function(note) {
            var promise = $mmUser.getProfile(note.userid, courseid, true).then(function(user) {
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

    return self;
});
