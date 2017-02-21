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

/**
 * Lesson service.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLesson
 */
.factory('$mmaModLesson', function($log, $mmSitesManager, $q) {

    $log = $log.getInstance('$mmaModLesson');

    var self = {};

    /**
     * Get cache key for access information WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getAccessInformationCacheKey(lessonId) {
        return 'mmaModLesson:accessInfo:' + lessonId;
    }

    /**
     * Get the access information of a certain lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getAccessInformation
     * @param  {Number} lessonId     Lesson ID.
     * @param  {Boolean} forceCache  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the access information-
     */
    self.getAccessInformation = function(lessonId, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId
                },
                preSets = {
                    cacheKey: getAccessInformationCacheKey(lessonId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_lesson_access_information', params, preSets);
        });
    };

    /**
     * Get cache key for Lesson data WS calls.
     *
     * @param  {Number} courseId Course ID.
     * @return {String}          Cache key.
     */
    function getLessonDataCacheKey(courseId) {
        return 'mmaModLesson:lesson:' + courseId;
    }

    /**
     * Get a Lesson with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {String} siteId        Site ID.
     * @param  {Number} courseId      Course ID.
     * @param  {String} key           Name of the property to check.
     * @param  {Mixed} value          Value to search.
     * @param  {Boolean} [forceCache] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}              Promise resolved when the Lesson is retrieved.
     */
    function getLesson(siteId, courseId, key, value, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getLessonDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_lesson_get_lessons_by_courses', params, preSets).then(function(response) {
                if (response && response.lessons) {
                    for (var i = 0; i < response.lessons.length; i++) {
                        var lesson = response.lessons[i];
                        if (lesson[key] == value) {
                            return lesson;
                        }
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a Lesson by module ID.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLesson
     * @param  {Number} courseId      Course ID.
     * @param  {Number} cmid          Course module ID.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @param  {Boolean} [forceCache] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}              Promise resolved when the Lesson is retrieved.
     */
    self.getLesson = function(courseId, cmid, siteId, forceCache) {
        return getLesson(siteId, courseId, 'coursemodule', cmid, forceCache);
    };

    /**
     * Get a Lesson by Lesson ID.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLessonById
     * @param  {Number} courseId      Course ID.
     * @param  {Number} id            Lesson ID.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @param  {Boolean} [forceCache] True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}              Promise resolved when the Lesson is retrieved.
     */
    self.getLessonById = function(courseId, id, siteId, forceCache) {
        return getLesson(siteId, courseId, 'id', id, forceCache);
    };

    /**
     * Invalidates Lesson data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateAccessInformation
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateAccessInformation = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getAccessInformationCacheKey(lessonId));
        });
    };

    /**
     * Invalidates Lesson data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateLessonData
     * @param  {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateLessonData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getLessonDataCacheKey(courseId));
        });
    };

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the lesson WS are available.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            // All WS were introduced at the same time so checking one is enough.
            return site.wsAvailable('mod_lesson_get_lesson_access_information');
        });
    };

    /**
     * Report a lesson as being viewed.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#logViewLesson
     * @param  {String} id         Module ID.
     * @param  {String} [password] Lesson password (if any).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when the WS call is successful.
     */
    self.logViewLesson = function(id, password, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: id
            };

            if (typeof password != 'undefined') {
                params.password = password;
            }

            return site.write('mod_lesson_view_lesson', params).then(function(result) {
                if (!result.status) {
                    return $q.reject();
                }
            });
        });
    };

    return self;
});
