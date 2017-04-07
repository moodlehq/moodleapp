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
.factory('$mmaModLesson', function($log, $mmSitesManager, $q, $mmUtil, mmaModLessonPasswordStore, $mmLang, $mmaModLessonOffline,
            $translate, $mmSite, mmCoreGradeTypeNone) {

    $log = $log.getInstance('$mmaModLesson');

    var self = {};

    // End of Lesson.
    self.LESSON_EOL = -9;
    // Jump to an unseen page within a branch and end of branch or end of lesson.
    self.LESSON_UNSEENBRANCHPAGE = -50;
    // Cluster Jump.
    self.LESSON_CLUSTERJUMP = -80;

    // Constants used to identify the type of pages and questions.
    self.TYPE_QUESTION = 0;
    self.TYPE_STRUCTURE = 1;

    self.LESSON_PAGE_SHORTANSWER =  1;
    self.LESSON_PAGE_TRUEFALSE =    2;
    self.LESSON_PAGE_MULTICHOICE =  3;
    self.LESSON_PAGE_MATCHING =     5;
    self.LESSON_PAGE_NUMERICAL =    8;
    self.LESSON_PAGE_ESSAY =        10;
    self.LESSON_PAGE_BRANCHTABLE =  20;
    self.LESSON_PAGE_ENDOFBRANCH =  21;
    self.LESSON_PAGE_CLUSTER =      30;
    self.LESSON_PAGE_ENDOFCLUSTER = 31;

    /**
     * Calculate some offline data like progress and ongoingscore.
     *
     * @param  {Object} lesson     Lesson.
     * @param  {Object} accessInfo Result of get access info.
     * @param  {String} [password] Lesson password (if any).
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the calculated data.
     */
    function calculateOfflineData(lesson, accessInfo, password, review, siteId) {
        accessInfo = accessInfo || {};

        var reviewMode = review || accessInfo.reviewmode,
            ongoingMessage = '',
            progress,
            promises = [];

        if (!accessInfo.canmanage) {
            if (lesson.ongoing && !reviewMode) {
                ongoingMessage = self.getOngoingScoreMessage(lesson, accessInfo, review);
            }
            if (lesson.progressbar) {
                promises.push(self.calculateProgress(lesson.id, accessInfo, password, review, false, siteId).then(function(p) {
                    progress = p;
                }));
            }
        }

        return $q.all(promises).then(function() {
            return {
                reviewmode: reviewMode,
                progress: progress,
                ongoingscore: ongoingMessage
            };
        });
    }

    /**
     * Calculate the progress of the current user in the lesson.
     * Based on Moodle's calculate_progress.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#calculateProgress
     * @param  {Number} lessonId   Lesson ID.
     * @param  {Object} accessInfo Result of get access info.
     * @param  {String} [password] Lesson password (if any).
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @param  {Object[]} [pages]  Result of getPages. If not defined, it will be calculated.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with a number: the progress (scale 0-100).
     */
    self.calculateProgress = function(lessonId, accessInfo, password, review, pages, siteId) {
        siteId = siteId || $mmSite.getId();

        // Check if the user is reviewing the attempt.
        if (review) {
            return 100;
        }

        var promise = pages ? $q.when(pages) : self.getPages(lessonId, password, true, false, siteId),
            pageIndex;

        return promise.then(function(pages) {
            pageIndex = createPagesIndex(pages);

            // @todo Question pages.

            // Get the list of viewed content pages.
            return self.getContentPagesViewedIds(lessonId, accessInfo.attemptscount, siteId);
        }).then(function(viewedPagesIds) {
            var pageId = accessInfo.firstpageid,
                validPages = {};

            // Filter out the following pages:
            // - End of Cluster
            // - End of Branch
            // - Pages found inside of Clusters
            // Do not filter out Cluster Page(s) because we count a cluster as one.
            // By keeping the cluster page, we get our 1.
            while (pageId) {
                pageId = self.validPageAndView(pageIndex, pageIndex[pageId], validPages, viewedPagesIds);
            }

            // Progress calculation as a percent.
            return $mmUtil.roundToDecimals(viewedPagesIds.length / Object.keys(validPages).length, 2) * 100;
        });
    };

    /**
     * Create a list of pages indexed by page ID based on a list of pages.
     *
     * @param  {Object[]} pageList Result of get pages.
     * @return {Object}            Pages index.
     */
    function createPagesIndex(pageList) {
        // Index the pages by page ID.
        var pages = {};
        angular.forEach(pageList, function(pageData) {
            pages[pageData.page.id] = pageData.page;
        });
        return pages;
    }

    /**
     * Finishes an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#finishAttempt
     * @param  {Object} lesson       Lesson.
     * @param  {Number} courseId     Course ID the lesson belongs to.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} [outOfTime] If the user ran out of time.
     * @param  {Boolean} [review]    If the user wants to review just after finishing (1 hour margin).
     * @param  {Boolean} [offline]   Whether it's offline mode.
     * @param  {Object} [accessInfo] Result of get access info. Required if offline is true.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved in success, rejected otherwise.
     */
    self.finishAttempt = function(lesson, courseId, password, outOfTime, review, offline, accessInfo, siteId) {
        if (offline) {
            var attempt = accessInfo.attemptscount;
            return $mmaModLessonOffline.finishAttempt(lesson.id, courseId, attempt, true, outOfTime, siteId).then(function() {
                // Attempt marked, now return the response. We won't return all the possible data.
                // This code is based in Moodle's process_eol_page.
                var gradeInfo = self.lessonGrade(),
                    gradeLesson = true,
                    result = {
                        data: {},
                        messages: [],
                        warnings: []
                    },
                    messageParams,
                    promises = [];

                addResultValue(result, 'offline', true); // Mark the result as offline.
                addResultValue(result, 'gradeinfo', gradeInfo);

                if (lesson.custom && !accessInfo.canmanage) {
                    // Before we calculate the custom score make sure they answered the minimum
                    // number of questions. We only need to do this for custom scoring as we can
                    // not get the miniumum score the user should achieve. If we are not using
                    // custom scoring (so all questions are valued as 1) then we simply check if
                    // they answered more than the minimum questions, if not, we mark it out of the
                    // number specified in the minimum questions setting - which is done in lesson_grade().
                    // Get the number of answers given.
                    if (gradeInfo.nquestions < lesson.minquestions) {
                        gradeLesson = false;
                        messageParams = {
                            nquestions: gradeInfo.nquestions,
                            minquestions: lesson.minquestions
                        };
                        messages.push($translate.instant('mma.mod_lesson.numberofpagesviewednotice'), {$a: data});
                    }
                }

                if (!accessInfo.canmanage) {
                    if (gradeLesson) {
                        promises.push(self.calculateProgress(lesson.id, accessInfo, password, review, false, siteId)
                                    .then(function(progress) {
                            addResultValue(result, 'progresscompleted', progress);
                        }));

                        if (false) {
                            // @todo Handle questions.
                        } else {
                            if (lesson.timelimit) {
                                if (outOfTime) {
                                    addResultValue(result, 'eolstudentoutoftimenoanswers', true, true);
                                }
                            } else {
                                addResultValue(result, 'welldone', true, true);
                            }
                        }
                    }
                } else {
                    // Display for teacher.
                    if (lesson.grade != mmCoreGradeTypeNone) {
                        addResultValue(result, 'displayofgrade', true, true);
                    }
                }

                if (lesson.modattempts && accessInfo.canmanage) {
                    addResultValue(result, 'modattemptsnoteacher', true, true);
                }

                if (gradeLesson) {
                    addResultValue(result, 'gradelesson', 1);
                }

                return result;
            });
        }

        return self.finishAttemptOnline(lesson.id, password, outOfTime, review, siteId);

        // Add a property to the offline result.
        function addResultValue(result, name, value, addMessage) {
            result.data[name] = {
                name: name,
                value: value,
                message: addMessage ? $translate.instant('mma.mod_lesson.' + name) : ''
            };
        }
    };

    /**
     * Finishes an attempt. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#finishAttemptOnline
     * @param  {Number} lessonId     Lesson ID.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} [outOfTime] If the user ran out of time.
     * @param  {Boolean} [review]    If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved in success, rejected otherwise.
     */
    self.finishAttemptOnline = function(lessonId, password, outOfTime, review, siteId) {
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
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the access information.
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
     * Get content pages viewed in online and offline.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getContentPagesViewed
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with an object with the online and offline viewed pages.
     */
    self.getContentPagesViewed = function(lessonId, attempt, siteId) {
        var promises = [],
            type = self.TYPE_STRUCTURE,
            result = {
                online: [],
                offline: []
            };

        // Get the online pages.
        promises.push(self.getContentPagesViewedOnline(lessonId, attempt, false, false, siteId).then(function(pages) {
            result.online = pages;
        }));

        // Get the offline pages.
        promises.push($mmaModLessonOffline.getAttemptAnswersForType(lessonId, attempt, type, siteId).catch(function() {
            return [];
        }).then(function(pages) {
            result.offline = pages;
        }));

        return $q.all(promises).then(function() {
            return result;
        });
    };

    /**
     * Get IDS of content pages viewed in online and offline.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getContentPagesViewedIds
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with list of IDs.
     */
    self.getContentPagesViewedIds = function(lessonId, attempt, siteId) {
        return self.getContentPagesViewed(lessonId, attempt, siteId).then(function(result) {
            var ids = {},
                pages = result.online.concat(result.offline);

            angular.forEach(pages, function(page) {
                if (!ids[page.pageid]) {
                    ids[page.pageid] = true;
                }
            });

            return Object.keys(ids);
        });
    };

    /**
     * Get cache key for get content pages viewed WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @return {String}         Cache key.
     */
    function getContentPagesViewedCacheKey(lessonId, attempt) {
        return getContentPagesViewedCommonCacheKey(lessonId) + ':' + attempt;
    }

    /**
     * Get common cache key for get content pages viewed WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getContentPagesViewedCommonCacheKey(lessonId) {
        return 'mmaModLesson:contentPagesViewed:' + lessonId;
    }

    /**
     * Get the list of content pages viewed in the site for a certain attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getContentPagesViewedOnline
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Number} attempt        Attempt number.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the access information.
     */
    self.getContentPagesViewedOnline = function(lessonId, attempt, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                    lessonattempt: attempt
                },
                preSets = {
                    cacheKey: getContentPagesViewedCacheKey(lessonId, attempt)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_content_pages_viewed', params, preSets).then(function(result) {
                return result.pages;
            });
        });
    };

    /**
     * Get the last content page viewed.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLastContentPageViewed
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the last content page viewed.
     */
    self.getLastContentPageViewed = function(lessonId, attempt, siteId) {
        return self.getContentPagesViewed(lessonId, attempt, siteId).then(function(data) {
            var lastPage,
                maxTime = 0;

            angular.forEach(data.online, function(page) {
                if (page.timeseen > maxTime) {
                    lastPage = page;
                    maxTime = page.timeseen;
                }
            });

            angular.forEach(data.offline, function(page) {
                if (page.timemodified > maxTime) {
                    lastPage = page;
                    maxTime = page.timemodified;
                }
            });

            return lastPage;
        }).catch(function() {
            // Error getting last page, don't return anything.
        });
    };

    /**
     * Get the last page seen.
     * Based on Moodle's get_last_page_seen.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLastPageSeen
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the last page seen.
     */
    self.getLastPageSeen = function(lessonId, attempt, siteId) {
        var lastPageSeen = false;

        // @todo Check question answers.

        return self.getLastContentPageViewed(lessonId, attempt, siteId).then(function(page) {
            if (page) {
                if (false) {
                    // @todo Check if the page was seen after the last question answer.
                } else {
                    // Has not answered any questions but has viewed a branch table.
                    lastPageSeen = page.newpageid || page.pageid;
                }
            }

            return lastPageSeen;
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
     * Get cache key for get lesson with password WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getLessonWithPasswordCacheKey(lessonId) {
        return 'mmaModLesson:lessonWithPswrd:' + lessonId;
    }

    /**
     * Get a lesson protected with password.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getLessonWithPassword
     * @param  {Number} lessonId                 Lesson ID.
     * @param  {String} [password]               Password.
     * @param  {Boolean} [validatePassword=true] If true, the function will fail if the password is wrong.
     *                                           If false, it will return a lesson with the basic data if password is wrong.
     * @param  {Boolean} [forceCache]            True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache]           True to ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]                 Site ID. If not defined, current site.
     * @return {Promise}                         Promise resolved with the lesson.
     */
    self.getLessonWithPassword = function(lessonId, password, validatePassword, forceCache, ignoreCache, siteId) {
        if (typeof validatePassword == 'undefined') {
            validatePassword = true;
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId
                },
                preSets = {
                    cacheKey: getLessonWithPasswordCacheKey(lessonId)
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

            return site.read('mod_lesson_get_lesson', params, preSets).then(function(response) {
                if (typeof response.lesson.ongoing == 'undefined') {
                    // Basic data not received, password is wrong. Remove stored password.
                    self.removeStoredPassword(lessonId);

                    if (validatePassword) {
                        // Invalidate the data and reject.
                        return self.invalidateLessonWithPassword(lessonId).catch(function() {
                            // Shouldn't happen.
                        }).then(function() {
                            return $mmLang.translateAndReject('mma.mod_lesson.loginfail');
                        });
                    }
                }

                return response.lesson;
            });
        });
    };

    /**
     * Get the ongoing score message for the user (depending on the user permission and lesson settings).
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getOngoingScoreMessage
     * @param  {Object} lesson     Lesson.
     * @param  {Object} accessInfo Result of get access info.
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @return {String}            Ongoing score message.
     */
    self.getOngoingScoreMessage = function(lesson, accessInfo, review) {
        if (accessInfo.canmanage) {
            return $translate.instant('mma.mod_lesson.teacherongoingwarning');
        } else {
            var ntries = accessInfo.attemptscount;
            if (review) {
                ntries--;
            }

            var gradeInfo = self.lessonGrade(),
                data = {};

            if (lesson.custom) {
                data.score = gradeInfo.earned;
                data.currenthigh = gradeInfo.total;
                return $translate.instant('mma.mod_lesson.ongoingcustom', {$a: data});
            } else {
                data.correct = gradeInfo.earned;
                data.viewed = gradeInfo.attempts;
                return $translate.instant('mma.mod_lesson.ongoingnormal', {$a: data});
            }
        }

        return '';
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
     * @param  {Object} lesson             Lesson.
     * @param  {Number} pageId             Page ID.
     * @param  {String} [password]         Lesson password (if any).
     * @param  {Boolean} [review]          If the user wants to review just after finishing (1 hour margin).
     * @param  {Boolean} [includeContents] Include the page rendered contents.
     * @param  {Boolean} [forceCache]      True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache]     True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {Object} [accessInfo]       Result of get access info. Required if offline is true.
     * @param  {Object} [jumps]            Result of get pages possible jumps. Required if offline is true.
     * @param  {String} [siteId]           Site ID. If not defined, current site.
     * @return {Promise}                   Promise resolved with the page data.
     */
    self.getPageData = function(lesson, pageId, password, review, includeContents, forceCache, ignoreCache, accessInfo, jumps, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lesson.id,
                    pageid: pageId,
                    review: review ? 1 : 0,
                    returncontents: includeContents ? 1 : 0
                },
                preSets = {
                    cacheKey: getPageDataCacheKey(lesson.id, pageId)
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

            return site.read('mod_lesson_get_page_data', params, preSets).then(function(data) {
                if (forceCache && accessInfo) {
                    // Offline mode, check if there is any answer stored.
                    var attempt = accessInfo.attemptscount;
                    return $mmaModLessonOffline.hasAttemptAnswers(lesson.id, attempt, siteId).then(function(hasAnswers) {
                        if (!hasAnswers) {
                            // No offline answers, return the WS data.
                            return data;
                        }

                        // There are offline answers stored. Calculate the data that might be affected.
                        return calculateOfflineData(lesson, accessInfo, password, review, siteId).then(function(calculatedData) {
                            data.messages = self.getPageViewMessages(lesson, accessInfo, data.page, review, jumps);
                            return angular.extend(data, calculatedData);
                        });
                    });
                }

                return data;
            });
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
     * @param  {Number} lessonId       Lesson ID.
     * @param  {String} [password]     Lesson password (if any).
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the pages.
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
     * Get cache key for get pages possible jumps WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @return {String}          Cache key.
     */
    function getPagesPossibleJumpsCacheKey(lessonId) {
        return 'mmaModLesson:pagesJumps:' + lessonId;
    }

    /**
     * Get possible jumps for a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPagesPossibleJumps
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the jumps.
     */
    self.getPagesPossibleJumps = function(lessonId, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    lessonid: lessonId,
                },
                preSets = {
                    cacheKey: getPagesPossibleJumpsCacheKey(lessonId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_pages_possible_jumps', params, preSets).then(function(response) {
                // Index the jumps by page and jumpto.
                if (response.jumps) {
                    var jumps = {};

                    angular.forEach(response.jumps, function(jump) {
                        if (typeof jumps[jump.pageid] == 'undefined') {
                            jumps[jump.pageid] = {};
                        }
                        jumps[jump.pageid][jump.jumpto] = jump;
                    });

                    return jumps;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get different informative messages when processing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_process.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPageProcessMessages
     * @param  {Object} lesson     Lesson.
     * @param  {Object} accessInfo Result of get access info. Required if offline is true.
     * @param  {Object} result     Result of process page.
     * @param  {Boolean} review    If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} jumps      Result of get pages possible jumps.
     * @return {String[]}          Messages.
     */
    self.getPageProcessMessages = function(lesson, accessInfo, result, review, jumps) {
        var messages = [];

        if (accessInfo.canmanage) {
            // This is the warning msg for teachers to inform them that cluster and unseen does not work while logged in as a teacher.
            if (self.lessonDisplayTeacherWarning(jumps)) {
                var data = {
                    cluster: $translate.instant('mma.mod_lesson.clusterjump'),
                    unseen: $translate.instant('mma.mod_lesson.unseenpageinbranch')
                };
                messages.push($translate.instant('mma.mod_lesson.teacherjumpwarning'), {$a: data});
            }

            // Inform teacher that s/he will not see the timer.
            if (lesson.timelimit) {
                messages.push($translate.instant('mma.mod_lesson.teachertimerwarning'));
            }
        }
        // Report attempts remaining.
        if (result.attemptsremaining > 0 && lesson.review && !review) {
            messages.push($translate.instant('mma.mod_lesson.attemptsremaining'), {$a: result.attemptsremaining});
        }

        return messages;
    };

    /**
     * Get different informative messages when viewing a lesson page.
     * Please try to use WS response messages instead of this function if possible.
     * Based on Moodle's add_messages_on_page_view.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getPageViewMessages
     * @param  {Object} lesson     Lesson.
     * @param  {Object} accessInfo Result of get access info. Required if offline is true.
     * @param  {Object} page       Page loaded.
     * @param  {Boolean} review    If the user wants to review just after finishing (1 hour margin).
     * @param  {Object} jumps      Result of get pages possible jumps.
     * @return {String[]}          Messages.
     */
    self.getPageViewMessages = function(lesson, accessInfo, page, review, jumps) {
        var messages = [],
            data;

        if (!accessInfo.canmanage) {
            if (page.qtype == self.LESSON_PAGE_BRANCHTABLE && lesson.minquestions) {
                // Tell student how many questions they have seen, how many are required and their grade.
                var ntries = accessInfo.attemptscount,
                    gradeInfo = self.lessonGrade();

                if (gradeInfo.attempts) {
                    if (gradeInfo.nquestions < lesson.minquestions) {
                        data = {
                            nquestions: gradeInfo.nquestions,
                            minquestions: lesson.minquestions
                        };
                        messages.push($translate.instant('mma.mod_lesson.numberofpagesviewednotice'), {$a: data});
                    }

                    if (!review && !lesson.retake) {
                        messages.push($translate.instant('mma.mod_lesson.numberofcorrectanswers'), {$a: gradeInfo.earned});
                        if (lesson.grade != mmCoreGradeTypeNone) {
                            data = {
                                grade: $mmUtil.roundToDecimals(gradeInfo.grade * lesson.grade / 100, 1),
                                total: lesson.grade
                            };
                            messages.push($translate.instant('mma.mod_lesson.yourcurrentgradeisoutof'), {$a: data});
                        }
                    }
                }
            }
        } else {
            if (lesson.timelimit) {
                messages.push($translate.instant('mma.mod_lesson.teachertimerwarning'));
            }

            if (self.lessonDisplayTeacherWarning(jumps)) {
                // This is the warning msg for teachers to inform them that cluster
                // and unseen does not work while logged in as a teacher.
                data = {
                    cluster: $translate.instant('mma.mod_lesson.clusterjump'),
                    unseen: $translate.instant('mma.mod_lesson.unseenpageinbranch')
                };
                messages.push($translate.instant('mma.mod_lesson.teacherjumpwarning'), {$a: data});
            }
        }

        return messages;
    };

    /**
     * Finds all pages that appear to be a subtype of the provided pageid until
     * an end point specified within "ends" is encountered or no more pages exist.
     * Based on Moodle's get_sub_pages_of.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getSubpagesOf
     * @param  {Object} pages  Index of lesson pages, indexed by page ID. See createPagesIndex.
     * @param  {Number} pageId Page ID to get subpages of.
     * @param  {Number[]} end  An array of LESSON_PAGE_* types that signify an end of the subtype.
     * @return {Object[]}      List of subpages.
     */
    self.getSubpagesOf = function(pages, pageId, ends) {
        var subPages = [];

        pageId = pages[pageId].nextpageid; // Move to the first page after the given page.
        ends = ends || [];

        while (true) {
            if (!pageId || ends.indexOf(pages[pageId].qtype) != -1) {
                // No more pages or it reached a page of the searched types. Stop.
                break;
            }

            subPages.push(pages[pageId]);
            pageId = pages[pageId].nextpageid;
        }

        return subPages;
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
     * Get cache key for get timers WS calls.
     *
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} userId   User ID.
     * @return {String}          Cache key.
     */
    function getTimersCacheKey(lessonId, userId) {
        return getTimersCommonCacheKey(lessonId) + ':' + userId;
    }

    /**
     * Get common cache key for get timers WS calls.
     *
     * @param {Number} lessonId Lesson ID.
     * @return {String}         Cache key.
     */
    function getTimersCommonCacheKey(lessonId) {
        return 'mmaModLesson:timers:' + lessonId;
    }

    /**
     * Get lesson timers.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#getTimers
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Boolean} [forceCache]  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @param  {Number} [userId]       User ID. If not defined, site's current user.
     * @return {Promise}               Promise resolved with the pages.
     */
    self.getTimers = function(lessonId, forceCache, ignoreCache, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            var params = {
                    lessonid: lessonId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getTimersCacheKey(lessonId, userId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_lesson_get_user_timers', params, preSets).then(function(response) {
                return response.timers;
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
     * Invalidates content pages viewed for all attempts.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateContentPagesViewed
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateContentPagesViewed = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getContentPagesViewedCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates content pages viewed for a certain attempts.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateContentPagesViewedForAttempt
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateContentPagesViewedForAttempt = function(lessonId, attempt, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getContentPagesViewedCacheKey(lessonId, attempt));
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
     * Invalidates lesson with password.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateLessonWithPassword
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateLessonWithPassword = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getLessonWithPasswordCacheKey(lessonId));
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
     * Invalidates pages.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePages
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePages = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getPagesCacheKey(lessonId));
        });
    };

    /**
     * Invalidates pages possible jumps.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidatePagesPossibleJumps
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidatePagesPossibleJumps = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getPagesPossibleJumpsCacheKey(lessonId));
        });
    };

    /**
     * Invalidates timers for all users in a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateTimers
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateTimers = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getTimersCommonCacheKey(lessonId));
        });
    };

    /**
     * Invalidates timers for a certain user.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#invalidateTimersForUser
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User ID. If not defined, site's current user.
     * @return {Promise}         Promise resolved when the data is invalidated.
     */
    self.invalidateTimersForUser = function(lessonId, siteId, userId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();
            return site.invalidateWsCacheForKey(getTimersCacheKey(lessonId, userId));
        });
    };

    /**
     * Check if a lesson is enabled to be used in offline.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isLessonOffline
     * @param  {Object} lesson Lesson.
     * @return {Boolean}       True offline is enabled, false otherwise.
     */
    self.isLessonOffline = function(lesson) {
        return !!lesson.allowofflineattempts;
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
     * Check if a page is a question page or a content page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#isQuestionPage
     * @param  {Number} type Type of the page.
     * @return {Boolean}     True if question page, false if content page.
     */
    self.isQuestionPage = function(type) {
        return type == self.TYPE_QUESTION;
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

            return site.write('mod_lesson_launch_attempt', params);
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
     * Checks to see if a LESSON_CLUSTERJUMP or a LESSON_UNSEENBRANCHPAGE is used in a lesson.
     * Based on Moodle's lesson_display_teacher_warning.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#lessonDisplayTeacherWarning
     * @param  {Object} jumps Result of get pages possible jumps.
     * @return {Boolean}      Whether the lesson uses one of those jumps.
     */
    self.lessonDisplayTeacherWarning = function(jumps) {
        if (!jumps) {
            return false;
        }

        // Check if any jump is to cluster or unseen branch.
        for (var pageId in jumps) {
            for (var jumpto in jumps[pageId]) {
                if (jumpto == self.LESSON_CLUSTERJUMP || jumpto == self.LESSON_UNSEENBRANCHPAGE) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Calculates a user's grade for a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#lessonGrade
     * @return {Object} Object with the grade data.
     */
    self.lessonGrade = function() {
        // Initialize all variables.
        var ncorrect     = 0,
            nviewed      = 0,
            score        = 0,
            nmanual      = 0,
            manualpoints = 0,
            thegrade     = 0,
            nquestions   = 0,
            total        = 0,
            earned       = 0;

        // @todo Handle questions.

        if (total) { // Not zero.
            thegrade = $mmUtil.roundToDecimals(100 * earned / total, 5);
        }

        return {
            nquestions: nquestions,
            attempts: nviewed,
            total: total,
            earned: earned,
            grade: thegrade,
            nmanual: nmanual,
            manualpoints: manualpoints
        };
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
     * @name $mmaModLesson#processPage
     * @param  {Object} lesson       Lesson.
     * @param  {Number} courseId     Course ID the lesson belongs to.
     * @param  {Object} pageData     Result of getPageData for the page to process.
     * @param  {Object} data         Data to save.
     * @param  {String} [password]   Lesson password (if any).
     * @param  {Boolean} [review]    If the user wants to review just after finishing (1 hour margin).
     * @param  {Boolean} [offline]   Whether it's offline mode.
     * @param  {Object} [accessInfo] Result of get access info. Required if offline is true.
     * @param  {Object} [jumps]      Result of get pages possible jumps. Required if offline is true.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when done.
     */
    self.processPage = function(lesson, courseId, pageData, data, password, review, offline, accessInfo, jumps, siteId) {
        siteId = siteId || $mmSite.getId();

        var page = pageData.page,
            pageId = page.id;

        if (offline) {
            // Calculate and store the new page id so it can be stored in offline.
            var attempt = accessInfo.attemptscount,
                newPageId = jumps[pageId] && jumps[pageId][data.jumpto] ? jumps[pageId][data.jumpto].calculatedjump : pageId;

            return $mmaModLessonOffline.processPage(lesson.id, courseId, attempt, page, data, newPageId, siteId).then(function() {
                // Data stored, now it must return the data. Calculate some needed offline data.
                return calculateOfflineData(lesson, accessInfo, password, review, siteId);
            }).then(function(calculatedData) {
                // @todo Handle question pages.
                var result = {
                    newpageid: newPageId,
                    inmediatejump: true,
                    answerid: 0,
                    noanswer: false,
                    correctanswer: false,
                    isessayquestion: false,
                    response: '',
                    studentanswer: '',
                    userresponse: null,
                    feedback: '',
                    nodefaultresponse: false,
                    attemptsremaining: null,
                    maxattemptsreached: false,
                    displaymenu: pageData.displaymenu, // Keep the same value since we can't calculate it in offline.
                    warnings: []
                };

                result.messages = self.getPageProcessMessages(lesson, accessInfo, result, review, jumps);
                angular.extend(result, calculatedData);

                return result;
            });
        }

        return self.processPageOnline(lesson.id, pageId, data, password, review, siteId);
    };

    /**
     * Process a lesson page, saving its data. It will fail if offline or cannot connect.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLesson#processPageOnline
     * @param  {Number} lessonId   Lesson ID.
     * @param  {Number} pageId     Page ID.
     * @param  {Object} data       Data to save.
     * @param  {String} [password] Lesson password (if any).
     * @param  {Boolean} [review]  If the user wants to review just after finishing (1 hour margin).
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved in success, rejected otherwise.
     */
    self.processPageOnline = function(lessonId, pageId, data, password, review, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                lessonid: lessonId,
                pageid: pageId,
                data: $mmUtil.objectToArrayOfObjects(data, 'name', 'value', true),
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
     * Function to determine if a page is a valid page. It will add the page to validPages if valid. It can also
     * modify the list of viewedPagesIds for cluster pages.
     * Based on Moodle's valid_page_and_view.
     *
     * @param  {Object} pages            Index of lesson pages, indexed by page ID. See createPagesIndex.
     * @param  {Object} page             Page to check.
     * @param  {Object} validPages       Valid pages, indexed by page ID.
     * @param  {Number[]} viewedPagesIds List of viewed pages IDs.
     * @return {Number}                  Next page ID.
     */
    self.validPageAndView = function(pages, page, validPages, viewedPagesIds) {
        if (page.qtype != self.LESSON_PAGE_ENDOFCLUSTER && page.qtype != self.LESSON_PAGE_ENDOFBRANCH) {
            // Add this page as a valid page.
            validPages[page.id] = 1;
        }

        if (page.qtype == self.LESSON_PAGE_CLUSTER) {
            // Get list of pages in the cluster.
            var subPages = self.getSubpagesOf(pages, page.id, [self.LESSON_PAGE_ENDOFCLUSTER]);
            angular.forEach(subPages, function(subPage) {
                var position = viewedPagesIds.indexOf(subPage.id);
                if (position != -1) {
                    delete viewedPagesIds[position]; // Remove it.
                    // Since the user did see one page in the cluster, add the cluster pageid to the viewedPagesIds.
                    if (viewedPagesIds.indexOf(page.id) == -1) {
                        viewedPagesIds.push(page.id);
                    }
                }
            });
        }

        return page.nextpageid;
    };

    return self;
});
