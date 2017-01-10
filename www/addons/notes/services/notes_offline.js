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

.constant('mmaNotesOfflineNotesStore', 'mma_notes_offline_notes')

.config(function($mmSitesFactoryProvider, mmaNotesOfflineNotesStore) {
    var stores = [
        {
            name: mmaNotesOfflineNotesStore,
            keyPath: ['userid', 'content', 'created'],
            indexes: [
                {
                    name: 'userid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'publishstate'
                },
                {
                    name: 'created'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline notes factory.
 *
 * @module mm.addons.notes
 * @ngdoc service
 * @name $mmaNotesOffline
 */
.factory('$mmaNotesOffline', function($mmSitesManager, $log, $mmSite, $mmUtil, mmaNotesOfflineNotesStore) {
    $log = $log.getInstance('$mmaNotesOffline');

    var self = {};

    /**
     * Delete a note.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#deleteNote
     * @param  {Number} userId      User ID the note is about.
     * @param  {String} content     The note content.
     * @param  {Number} timecreated The time the note was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if deleted, rejected if failure.
     */
    self.deleteNote = function(userId, content, timecreated, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaNotesOfflineNotesStore, [userId, content, timecreated]);
        });
    };

    /**
     * Get all offline notes.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#getAllNotes
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with notes.
     */
    self.getAllNotes = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaNotesOfflineNotesStore);
        });
    };

    /**
     * Get an offline note.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#getNote
     * @param  {Number} userId      User ID the note is about.
     * @param  {String} content     The note content.
     * @param  {Number} timecreated The time the note was created.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved with the notes.
     */
    self.getNote = function(userId, content, timecreated, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaNotesOfflineNotesStore, [userId, content, timecreated]);
        });
    };

    /**
     * Get offline notes for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#getNotesForCourse
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with notes.
     */
    self.getNotesForCourse = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaNotesOfflineNotesStore, 'courseid', courseId);
        });
    };

    /**
     * Get offline notes for a certain user.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#getNotesForUser
     * @param  {Number} userId   User ID the notes are about.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with notes.
     */
    self.getNotesForUser = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaNotesOfflineNotesStore, 'userid', userId);
        });
    };

    /**
     * Get offline notes with a certain publish state (Personal, Site or Course).
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#getNotesWithPublishState
     * @param  {String} state    Publish state (Personal, Site or Course).
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with notes.
     */
    self.getNotesWithPublishState = function(state, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaNotesOfflineNotesStore, 'publishstate', state);
        });
    };

    /**
     * Check if there are offline notes for a certain course.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#hasNotesForCourse
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    self.hasNotesForCourse = function(courseId, siteId) {
        return self.getNotesForCourse(courseId, siteId).then(function(notes) {
            return !!notes.length;
        });
    };

    /**
     * Check if there are offline notes for a certain user.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#hasNotesForUser
     * @param  {Number} userId   User ID the notes are about.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    self.hasNotesForUser = function(userId, siteId) {
        return self.getNotesForUser(userId, siteId).then(function(notes) {
            return !!notes.length;
        });
    };

    /**
     * Check if there are offline notes with a certain publish state (Personal, Site or Course).
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#hasNotesWithPublishState
     * @param  {String} state    Publish state (Personal, Site or Course).
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean: true if has offline notes, false otherwise.
     */
    self.hasNotesWithPublishState = function(state, siteId) {
        return self.getNotesWithPublishState(state, siteId).then(function(notes) {
            return !!notes.length;
        });
    };

    /**
     * Save a note to be sent later.
     *
     * @module mm.addons.notes
     * @ngdoc method
     * @name $mmaNotesOffline#saveNote
     * @param  {Number} userId   User ID the note is about.
     * @param  {Number} courseId Course ID.
     * @param  {String} state    Publish state (Personal, Site or Course).
     * @param  {String} content  The note content.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if stored, rejected if failure.
     */
    self.saveNote = function(userId, courseId, state, content, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var now = $mmUtil.timestamp(),
                db = site.getDb(),
                entry = {
                    userid: userId,
                    courseid: courseId,
                    publishstate: state,
                    content: content,
                    format: 1,
                    created: now,
                    lastmodified: now
                };

            return db.insert(mmaNotesOfflineNotesStore, entry);
        });
    };

    return self;
});
