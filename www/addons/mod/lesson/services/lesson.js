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

.constant('mmaModLessonPasswordStore', 'mod_lesson_password')

.config(function($mmSitesFactoryProvider, mmaModLessonPasswordStore) {
    var stores = [
        {
            name: mmaModLessonPasswordStore,
            keyPath: 'id',
            indexes: []
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Lesson service.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLesson
 */
.factory('$mmaModLesson', function($log, $mmSitesManager, $q, $mmUtil, mmaModLessonPasswordStore, $timeout) {

    $log = $log.getInstance('$mmaModLesson');

    var self = {};

    self.LESSON_EOL = -9;

    /**
     * Finishes an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#finishAttempt
     * @param  {Number} lessonId     Lesson ID.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} [outOfTime] If the user ran out of time.
     * @param  {Boolean} [review]    If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved in success, rejected otherwise.
     */
    self.finishAttempt = function(lessonId, password, outOfTime, review, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: lessonId,
                outoftime: outOfTime ? 1 : 0,
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_finish_attempt', params).then(function(response) {
                // Convert the data array into an object and decode the values.
                var map = {};
                angular.forEach(response.data, function(entry) {
                    if (entry.value && typeof entry.value == 'string' && entry.value !== '1') {
                        // It's a JSON encoded object. Try to decode it.
                        try {
                            entry.value = JSON.parse(entry.value);
                        } catch(ex) {
                            // Error decoding it, leave the value as it is.
                        }
                    }
                    map[entry.name] = entry;
                });
                response.data = map;
                return response;
            });
        });
    };

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
     * Get cache key for get page data WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @param {Number} pageId   Page ID.
     * @return {String}         Cache key.
     */
    function getPageDataCacheKey(lessonId, pageId) {
        return getPageDataCommonCacheKey(lessonId) + ':' + pageId;
    }

    /**
     * Get common cache key for get page data WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getPageDataCommonCacheKey(lessonId) {
        return 'mmaModLesson:pageData:' + lessonId;
    }

    /**
     * Get page data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPageData
     * @param  {Number} lessonId           Lesson ID.
     * @param  {Number} pageId             Page ID.
     * @param  {String} [password]         Lesson password (if any).
     * @param  {Boolean} [review]          If the user wants to review just after finishing (1 hour margin).
     * @param  {Boolean} [includeContents] Include the page rendered contents.
     * @param  {Boolean} forceCache        True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} ignoreCache       True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]           Site ID. If not defined, current site.
     * @return {Promise}                   Promise resolved with the page data.
     */
    self.getPageData = function(lessonId, pageId, password, review, includeContents, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                    pageid: pageId,
                    review: review ? 1 : 0,
                    returncontents: includeContents ? 1 : 0
                },
                preSets = {
                    cacheKey: getPageDataCacheKey(lessonId, pageId)
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_page_data', params, preSets);
        });
    };

    /**
     * Get cache key for get pages WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getPagesCacheKey(lessonId) {
        return 'mmaModLesson:pages:' + lessonId;
    }

    /**
     * Get lesson pages.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPages
     * @param  {Number} lessonId     Lesson ID.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} forceCache  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with the pages.
     */
    self.getPages = function(lessonId, password, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                },
                preSets = {
                    cacheKey: getPagesCacheKey(lessonId)
                };

            if (typeof password == 'string') {
                params.password = password;
            }

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_pages', params, preSets).then(function(response) {
                return response.pages;
            });
        });
    };

    /**
     * Get a password stored in DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getStoredPassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with password on success, rejected otherwise.
     */
    self.getStoredPassword = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModLessonPasswordStore, lessonId).then(function(entry) {
                return entry.password;
            });
        });
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
     * Invalidates page data for all pages.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePageData
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePageData = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getPageDataCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates page data for a certain page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePageDataForPage
     * @param  {Number} lessonId Attempt ID.
     * @param  {Number} pageId   Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePageDataForPage = function(lessonId, pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getPageDataCacheKey(lessonId, pageId));
        });
    };

    /**
     * Check if a lesson is password protected based in the access info.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isPasswordProtected
     * @param  {Object}  info Lesson access info.
     * @return {Boolean}      True if password protected, false otherwise.
     */
    self.isPasswordProtected = function(info) {
        if (info && info.preventaccessreasons) {
            for (var i = 0; i < info.preventaccessreasons.length; i++) {
                var entry = info.preventaccessreasons[i];
                if (entry.reason == 'passwordprotectedlesson') {
                    return true;
                }
            }
        }

        return false;
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
     * Start or continue an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#launchAttempt
     * @param  {String} id         Lesson ID.
     * @param  {String} [password] Lesson password (if any).
     * @param  {Number} [pageId]   Page id to continue from (only when continuing an attempt).
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when the WS call is successful.
     */
    self.launchAttempt = function(id, password, pageId, review, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: id,
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }
            if (typeof pageId == 'number') {
                params.pageid = pageId;
            }

            return site.write('mod_lesson_launch_attempt', params).then(function(result) {
                if (!result.status) {
                    return $q.reject();
                }
                return result;
            });
        });
    };

    /**
     * Check if the user left during a timed session.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#leftDuringTimed
     * @param  {Object} info Lesson access info.
     * @return {Boolean}     True if left during timed, false otherwise.
     */
    self.leftDuringTimed = function(info) {
        return info && info.lastpageseen && info.lastpageseen != self.LESSON_EOL && info.leftduringtimedsession;
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

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_view_lesson', params).then(function(result) {
                if (!result.status) {
                    return $q.reject();
                }
                return result;
            });
        });
    };

    /**
     * Process a lesson page, saving its data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#processAttempt
     * @param  {Number} lessonId   Lesson ID.
     * @param  {Number} pageId     Page ID.
     * @param  {Object} data       Data to save.
     * @param  {String} [password] Lesson password (if any).
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved in success, rejected otherwise.
     */
    self.processPage = function(lessonId, pageId, data, password, review, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: lessonId,
                pageid: pageId,
                data: $mmUtil.objectToArrayOfObjects(data, 'name', 'value'),
                review: review ? 1 : 0
            };

            if (typeof password == 'string') {
                params.password = password;
            }

            return site.write('mod_lesson_process_page', params);
        });
    };

    /**
     * Remove a password stored in DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#removeStoredPassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when removed.
     */
    self.removeStoredPassword = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModLessonPasswordStore, lessonId);
        });
    };

    /**
     * Store a password in DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#storePassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} password Password to store.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when stored.
     */
    self.storePassword = function(lessonId, password, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var entry = {
                id: lessonId,
                password: password,
                timemodified: new Date().getTime()
            };

            return site.getDb().insert(mmaModLessonPasswordStore, entry);
        });
    };

    /**
     * Validate a lesson password.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#validatePassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} password Lesson password (if any).
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved in success, rejected otherwise.
     */
    self.validatePassword = function(lessonId, password, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: lessonId,
                password: password
            };

            // @todo Use new WebService (not implemented yet).
            return $timeout(function() {}, 1000).then(function() {
                if (password != '123') {
                    return $q.reject();
                }
            }).catch(function(error) {
                if ($mmUtil.isWebServiceError(error)) {
                    // The WebService returned an error, assume the password is wrong. Remove the stored password if any.
                    self.removeStoredPassword(lessonId);
                }
                return $q.reject(error);
            });
        });
    };

    return self;
});
