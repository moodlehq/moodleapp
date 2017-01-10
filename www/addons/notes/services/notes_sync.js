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
 * Notes synchronization factory.
 *
 * @module mm.addons.notes
 * @ngdoc service
 * @name $mmaNotesSync
 */
.factory('$mmaNotesSync', function($log, $mmSite, $q, $mmCourses, $mmApp, $translate, $mmaNotes, $mmaNotesOffline, $mmUtil, $mmLang,
            $mmSitesManager, $mmEvents, mmaNotesAutomSyncedEvent, $mmSync, mmaNotesComponent, mmaModNotesSyncTime) {
    $log = $log.getInstance('$mmaNotesSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaNotesComponent, mmaModNotesSyncTime);

    /**
     * Try to synchronize all the notes in a certain site or in all sites.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesSync#syncAllNotes
     * @param  {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}         Promise resolved if sync is successful, rejected if sync fails.
     */
    self.syncAllNotes = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all notes because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync notes in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync notes in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Get all notes pending to be sent in the site.
                sitePromises.push($mmaNotesOffline.getAllNotes(siteId).then(function(notes) {
                    var courseIds = [],
                        promises = [];

                    // Get all the courses to be synced.
                    angular.forEach(notes, function(note) {
                        if (courseIds.indexOf(note.courseid) == -1) {
                            courseIds.push(note.courseid);
                        }
                    });

                    // Sync all courses.
                    angular.forEach(courseIds, function(courseId) {
                        promises.push(self.syncNotesIfNeeded(courseId, siteId).then(function(warnings) {
                            if (typeof warnings != 'undefined') {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaNotesAutomSyncedEvent, {
                                    siteid: siteId,
                                    courseid: courseId,
                                    warnings: warnings
                                });
                            }
                        }));
                    });

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync course notes only if a certain time has passed since the last time.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesSync#syncNotesIfNeeded
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the notes are synced or if they don't need to be synced.
     */
    self.syncNotesIfNeeded = function(courseId, siteId) {
        return self.isSyncNeeded(courseId, siteId).then(function(needed) {
            if (needed) {
                return self.syncNotes(courseId, siteId);
            }
        });
    };

    /**
     * Synchronize notes of a course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesSync#syncNotes
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncNotes = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            warnings = [];

        if (self.isSyncing(courseId, siteId)) {
            // There's already a sync ongoing for notes, return the promise.
            return self.getOngoingSync(courseId, siteId);
        }

        $log.debug('Try to sync notes for course ' + courseId);

        // Get offline notes to be sent.
        syncPromise = $mmaNotesOffline.getNotesForCourse(courseId, siteId).then(function(notes) {
            if (!notes.length) {
                // Nothing to sync.
                return [];
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $mmLang.translateAndReject('mm.core.networkerrormsg');
            }

            var errors = [],
                notesToSend;

            // Format the notes to be sent.
            notesToSend = notes.map(function(note) {
                return {
                    userid: note.userid,
                    publishstate: note.publishstate,
                    courseid: note.courseid,
                    text: note.content,
                    format: note.format
                };
            });

            // Send the notes.
            return $mmaNotes.addNotesOnline(notesToSend, siteId).then(function(response) {
                // Search errors in the response.
                angular.forEach(response, function(entry) {
                    if (entry.noteid === -1 && errors.indexOf(entry.errormessage) == -1) {
                        errors.push(entry.errormessage);
                    }
                });

                // Fetch the notes from server to be sure they're up to date.
                return $mmaNotes.invalidateNotes(courseId, siteId).then(function() {
                    return $mmaNotes.getNotes(courseId, false, true, siteId);
                }).catch(function() {
                    // Ignore errors.
                });
            }).catch(function(error) {
                if ($mmUtil.isWebServiceError(error)) {
                    // It's a WebService error, this means the user cannot send notes.
                    errors.push(error);
                } else {
                    // Not a WebService error, reject the synchronization to try again.
                    return $q.reject(error);
                }
            }).then(function() {
                // Notes were sent, delete them from local DB.
                var promises = [];
                angular.forEach(notes, function(note) {
                    promises.push($mmaNotesOffline.deleteNote(note.userid, note.content, note.created, siteId));
                });
                return $q.all(promises);
            }).then(function() {
                if (errors && errors.length) {
                    // At least an error occurred, get course name and add errors to warnings array.
                    return $mmCourses.getUserCourse(courseId, true, siteId).catch(function() {
                        // Ignore errors.
                        return {};
                    }).then(function(course) {
                        angular.forEach(errors, function(error) {
                            warnings.push($translate.instant('mma.notes.warningnotenotsent', {
                                course: course.fullname ? course.fullname : courseId,
                                error: error
                            }));
                        });
                    });
                }
            });
        }).then(function() {
            // All done, return the warnings.
            return warnings;
        });

        return self.addOngoingSync(courseId, syncPromise, siteId);
    };

    return self;
});
