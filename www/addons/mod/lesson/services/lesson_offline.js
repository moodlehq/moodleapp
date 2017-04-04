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

angular.module('mm.addons.mod_lesson')

.constant('mmaModLessonAttemptsStore', 'mod_lesson_attempts')
.constant('mmaModLessonAnswersStore', 'mod_lesson_answers')

.config(function($mmSitesFactoryProvider, mmaModLessonAttemptsStore, mmaModLessonAnswersStore) {
    var stores = [
        {
            name: mmaModLessonAttemptsStore,
            keyPath: 'lessonid',
            indexes: [
                {
                    name: 'attempt'
                },
                {
                    name: 'lessonid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'timemodified'
                },
                {
                    name: 'finished'
                }
            ]
        },
        {
            name: mmaModLessonAnswersStore,
            keyPath: ['lessonid', 'attempt', 'pageid'],
            indexes: [
                {
                    name: 'lessonid'
                },
                {
                    name: 'attempt'
                },
                {
                    name: 'pageid'
                },
                {
                    name: 'type' // Type of the page: TYPE_QUESTION or TYPE_STRUCTURE.
                },
                {
                    name: 'timemodified'
                },
                {
                    name: 'lessonAndPage',
                    keyPath: ['lessonid', 'pageid']
                },
                {
                    name: 'lessonAndAttempt',
                    keyPath: ['lessonid', 'attempt']
                },
                {
                    name: 'lessonAndAttemptAndPage',
                    keyPath: ['lessonid', 'attempt', 'pageid']
                },
                {
                    name: 'lessonAndAttemptAndType',
                    keyPath: ['lessonid', 'attempt', 'type']
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Lesson offline service.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLessonOffline
 */
.factory('$mmaModLessonOffline', function($log, $mmSitesManager, $mmUtil, $q, mmaModLessonAttemptsStore, mmaModLessonAnswersStore) {

    $log = $log.getInstance('$mmaModLessonOffline');

    var self = {};

    /**
     * Get all the offline attempts in a certain site.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAllAttempts
     * @param {String} [siteId] Site ID. If not set, use current site.
     * @return {Promise}        Promise resolved when the offline attempts are retrieved.
     */
    self.getAllAttempts = function(siteId) {
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            if (!db) {
                return $q.reject();
            }

            return db.getAll(mmaModLessonAttemptsStore);
        });
    };

    /**
     * Retrieve an attempt from site DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAttempt
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt.
     */
    self.getAttempt = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModLessonAttemptsStore, lessonId);
        });
    };

    /**
     * Retrieve all offline answers for an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAttemptAnswers
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt answers.
     */
    self.getAttemptAnswers = function(lessonId, attempt, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonAnswersStore, 'lessonAndAttempt', [lessonId, attempt]);
        });
    };

    /**
     * Retrieve offline answers for certain pages for an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAttemptAnswersForType
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Number} type     Type of the pages to get: TYPE_QUESTION or TYPE_STRUCTURE.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt answers.
     */
    self.getAttemptAnswersForType = function(lessonId, attempt, type, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonAnswersStore, 'lessonAndAttemptAndType', [lessonId, attempt, type]);
        });
    };

    /**
     * Check if there are offline answers for an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#hasAttemptAnswers
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with a boolean.
     */
    self.hasAttemptAnswers = function(lessonId, attempt, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonAnswersStore, 'lessonAndAttempt', [lessonId, attempt]).then(function(list) {
                return !!list.length;
            });
        }).catch(function() {
            return false;
        });
    };

    /**
     * Process a lesson page, saving its data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#processPage
     * @param  {Number} lessonId   Lesson ID.
     * @param  {Number} courseId   Course ID the lesson belongs to.
     * @param  {Object} page       Page.
     * @param  {Object} data       Data to save.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved in success, rejected otherwise.
     */
    self.processPage = function(lessonId, courseId, attempt, page, data, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var entry = {
                lessonid: lessonId,
                attempt: attempt,
                pageid: page.id,
                courseid: courseId,
                data: data,
                type: page.type,
                timemodified: $mmUtil.timestamp()
            };

            return site.getDb().insert(mmaModLessonAnswersStore, entry);
        });
    };

    return self;
});
