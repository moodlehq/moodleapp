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

.constant('mmaModLessonRetakesStore', 'mma_mod_lesson_retakes')
.constant('mmaModLessonPageAttemptsStore', 'mma_mod_lesson_page_attempts')

.config(function($mmSitesFactoryProvider, mmaModLessonRetakesStore, mmaModLessonPageAttemptsStore) {
    var stores = [
        {
            name: mmaModLessonRetakesStore,
            keyPath: 'lessonid', // Only 1 offline retake per lesson.
            indexes: [
                {
                    name: 'retake'
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
            name: mmaModLessonPageAttemptsStore,
            keyPath: ['lessonid', 'retake', 'pageid', 'timemodified'], // A user can attempt several times per page and retake.
            indexes: [
                {
                    name: 'lessonid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'retake'
                },
                {
                    name: 'pageid'
                },
                {
                    name: 'type' // Type of the page: mmaModLessonTypeQuestion or mmaModLessonTypeStructure.
                },
                {
                    name: 'timemodified'
                },
                {
                    name: 'lessonAndPage',
                    keyPath: ['lessonid', 'pageid']
                },
                {
                    name: 'lessonAndRetake',
                    keyPath: ['lessonid', 'retake']
                },
                {
                    name: 'lessonAndRetakeAndType',
                    keyPath: ['lessonid', 'retake', 'type']
                },
                {
                    name: 'lessonAndRetakeAndPage',
                    keyPath: ['lessonid', 'retake', 'pageid']
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
.factory('$mmaModLessonOffline', function($log, $mmSitesManager, $mmUtil, $q, $mmSite, mmaModLessonRetakesStore,
             mmaModLessonPageAttemptsStore, mmaModLessonTypeQuestion) {

    $log = $log.getInstance('$mmaModLessonOffline');

    var self = {};

    /**
     * Delete an offline attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#deleteAttempt
     * @param  {Number} lessonId     Lesson ID.
     * @param  {Number} retake       Lesson retake number.
     * @param  {Number} pageId       Page ID.
     * @param  {Number} timemodified The timemodified of the attempt.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when done.
     */
    self.deleteAttempt = function(lessonId, retake, pageId, timemodified, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModLessonPageAttemptsStore, [lessonId, retake, pageId, timemodified]);
        });
    };

    /**
     * Delete offline lesson retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#deleteRetake
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done.
     */
    self.deleteRetake = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModLessonRetakesStore, lessonId);
        });
    };

    /**
     * Delete offline attempts for a retake and page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#deleteRetakeAttemptsForPage
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Lesson retake number.
     * @param  {Number} pageId   Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done.
     */
    self.deleteRetakeAttemptsForPage = function(lessonId, retake, pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            // Get the attempts and delete them.
            return self.getRetakeAttemptsForPage(lessonId, retake, pageId, siteId).then(function(attempts) {
                var promises = [];

                angular.forEach(attempts, function(attempt) {
                    var timeMod = attempt.timemodified;
                    promises.push(site.getDb().remove(mmaModLessonPageAttemptsStore, [lessonId, retake, pageId, timeMod]));
                });

                return $q.all(promises);
            });
        });
    };

    /**
     * Mark a retake as finished.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#finishRetake
     * @param  {Number} lessonId   Lesson ID.
     * @param  {Number} courseId   Course ID the lesson belongs to.
     * @param  {Number} retake     Retake number.
     * @param  {Boolean} finished  Whether retake is finished.
     * @param  {Boolean} outOfTime If the user ran out of time.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved in success, rejected otherwise.
     */
    self.finishRetake = function(lessonId, courseId, retake, finished, outOfTime, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get current stored retake.
        return getRetakeWithFallback(lessonId, courseId, retake, siteId).then(function(entry) {
            return $mmSitesManager.getSite(siteId).then(function(site) {
                entry.finished = !!finished;
                entry.outoftime = !!outOfTime;
                entry.timemodified = $mmUtil.timestamp();

                return site.getDb().insert(mmaModLessonRetakesStore, entry);
            });
        });
    };

    /**
     * Get all the offline page attempts in a certain site.
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

            return db.getAll(mmaModLessonPageAttemptsStore);
        });
    };

    /**
     * Get all the lessons that have offline data in a certain site.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAllLessonsWithData
     * @param {String} [siteId] Site ID. If not set, use current site.
     * @return {Promise}        Promise resolved with an object containing the lessons.
     */
    self.getAllLessonsWithData = function(siteId) {
        var promises = [],
            lessons = {};

        promises.push(getLessons(self.getAllAttempts(siteId)));
        promises.push(getLessons(self.getAllRetakes(siteId)));

        return $q.all(promises).then(function() {
            return lessons;
        });

        function getLessons(promise) {
            return promise.then(function(entries) {
                angular.forEach(entries, function(entry) {
                    if (!lessons[entry.lessonid]) {
                        lessons[entry.lessonid] = {
                            id: entry.lessonid,
                            courseid: entry.courseid
                        };
                    }
                });
            }).catch(function() {
                // Ignore errors.
            });
        }
    };

    /**
     * Get all the offline retakes in a certain site.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAllRetakes
     * @param {String} [siteId] Site ID. If not set, use current site.
     * @return {Promise}        Promise resolved when the offline retakes are retrieved.
     */
    self.getAllRetakes = function(siteId) {
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            if (!db) {
                return $q.reject();
            }

            return db.getAll(mmaModLessonRetakesStore);
        });
    };

    /**
     * Retrieve the last offline attempt stored in a retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getLastQuestionPageAttempt
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt (undefined if no attempts).
     */
    self.getLastQuestionPageAttempt = function(lessonId, retake, siteId) {
        siteId = siteId || $mmSite.getId();

        return getRetakeWithFallback(lessonId, 0, retake, siteId).then(function(retakeData) {
            if (!retakeData.lastquestionpage) {
                // No question page attempted.
                return;
            }

            return self.getRetakeAttemptsForPage(lessonId, retake, retakeData.lastquestionpage, siteId).then(function(attempts) {
                // Return the attempt with highest timemodified.
                return attempts.reduce(function(a, b) {
                    return a.timemodified > b.timemodified ? a : b;
                });
            });
        }).catch(function() {
            // Error, return undefined.
        });
    };

    /**
     * Retrieve all offline attempts for a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getLessonAttempts
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempts.
     */
    self.getLessonAttempts = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonPageAttemptsStore, 'lessonid', lessonId);
        });
    };

    /**
     * Get attempts for question pages and retake in a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getQuestionsAttempts
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {Boolean} correct True to only fetch correct attempts, false to get them all.
     * @param  {Number} [pageId] If defined, only get attempts on this page.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempts.
     */
    self.getQuestionsAttempts = function(lessonId, retake, correct, pageId, siteId) {
        var promise;
        if (pageId) {
            // Page ID is set, only get the attempts for that page.
            promise = self.getRetakeAttemptsForPage(lessonId, retake, pageId, siteId);
        } else {
            // Page ID not specified, get all the attempts.
            promise = self.getRetakeAttemptsForType(lessonId, retake, mmaModLessonTypeQuestion, siteId);
        }

        return promise.then(function(attempts) {
            if (correct) {
                return attempts.filter(function(attempt) {
                    return !!attempt.correct;
                });
            }
            return attempts;
        });
    };

    /**
     * Retrieve a retake from site DB.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getRetake
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the retake.
     */
    self.getRetake = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModLessonRetakesStore, lessonId);
        });
    };

    /**
     * Retrieve all offline attempts for a retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getRetakeAttempts
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the retake attempts.
     */
    self.getRetakeAttempts = function(lessonId, retake, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonPageAttemptsStore, 'lessonAndRetake', [lessonId, retake]);
        });
    };

    /**
     * Retrieve offline attempts for a retake and page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getRetakeAttemptsForPage
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Lesson retake number.
     * @param  {Number} pageId   Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the retake attempts.
     */
    self.getRetakeAttemptsForPage = function(lessonId, retake, pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonPageAttemptsStore, 'lessonAndRetakeAndPage', [lessonId, retake, pageId]);
        });
    };

    /**
     * Retrieve offline attempts for certain pages for a retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getRetakeAttemptsForType
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {Number} type     Type of the pages to get: mmaModLessonTypeQuestion or mmaModLessonTypeStructure.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the retake attempts.
     */
    self.getRetakeAttemptsForType = function(lessonId, retake, type, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonPageAttemptsStore, 'lessonAndRetakeAndType', [lessonId, retake, type]);
        });
    };
    /**
     * Get stored retake. If not found or doesn't match the retake number, return a new one.
     *
     * @param  {Number} lessonId  Lesson ID.
     * @param  {Number} courseId  Course ID the lesson belongs to.
     * @param  {Number} retake    Retake number.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the retake.
     */
    function getRetakeWithFallback(lessonId, courseId, retake, siteId) {
        // Get current stored retake.
        return self.getRetake(lessonId, siteId).then(function(retakeData) {
            if (retakeData.retake != retake) {
                // The stored retake doesn't match the retake number, create a new one.
                return $q.reject();
            }
            return retakeData;
        }).catch(function() {
            // No retake, create a new one.
            return {
                lessonid: lessonId,
                retake: retake,
                courseid: courseId,
                finished: false
            };
        });
    }

    /**
     * Check if there is a finished retake for a certain lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#hasFinishedRetake
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean.
     */
    self.hasFinishedRetake = function(lessonId, siteId) {
        return self.getRetake(lessonId, siteId).then(function(retake) {
            return !!retake.finished;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Check if a lesson has offline data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#hasOfflineData
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean.
     */
    self.hasOfflineData = function(lessonId, siteId) {
        var promises = [],
            hasData = false;

        promises.push(self.getRetake(lessonId, siteId).then(function() {
            hasData = true;
        }).catch(function() {
            // Ignore errors.
        }));

        promises.push(self.getLessonAttempts(lessonId, siteId).then(function(attempts) {
            hasData = hasData || !!attempts.length;
        }).catch(function() {
            // Ignore errors.
        }));

        return $q.all(promises).then(function() {
            return hasData;
        });
    };

    /**
     * Check if there are offline attempts for a retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#hasRetakeAttempts
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with a boolean.
     */
    self.hasRetakeAttempts = function(lessonId, retake, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonPageAttemptsStore, 'lessonAndRetake', [lessonId, retake]);
        }).then(function(list) {
            return !!list.length;
        }).catch(function() {
            return false;
        });
    };

    /**
     * Process a lesson page, saving its data.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#processPage
     * @param  {Number} lessonId    Lesson ID.
     * @param  {Number} courseId    Course ID the lesson belongs to.
     * @param  {Number} retake      Retake number.
     * @param  {Object} page        Page.
     * @param  {Object} data        Data to save.
     * @param  {Number} newPageId   New page ID (calculated).
     * @param  {Number} [answerId]  The answer ID that the user answered.
     * @param  {Boolean} [correct]  If answer is correct. Only for question pages.
     * @param  {Mixed} [userAnswer] The user's answer (userresponse from checkAnswer).
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved in success, rejected otherwise.
     */
    self.processPage = function(lessonId, courseId, retake, page, data, newPageId, answerId, correct, userAnswer, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var entry = {
                lessonid: lessonId,
                retake: retake,
                pageid: page.id,
                courseid: courseId,
                data: data,
                type: page.type,
                newpageid: newPageId,
                correct: !!correct,
                answerid: parseInt(answerId, 10),
                userAnswer: userAnswer,
                timemodified: $mmUtil.timestamp()
            };

            return site.getDb().insert(mmaModLessonPageAttemptsStore, entry);
        }).then(function() {
            if (page.type == mmaModLessonTypeQuestion) {
                // It's a question page, set it as last question page attempted.
                return self.setLastQuestionPageAttempted(lessonId, courseId, retake, page.id, siteId);
            }
        });
    };

    /**
     * Set the last question page attempted in a retake.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#setLastQuestionPageAttempted
     * @param  {Number} lessonId  Lesson ID.
     * @param  {Number} courseId  Course ID the lesson belongs to.
     * @param  {Number} retake    Retake number.
     * @param  {Number} lastPage  ID of the last question page attempted.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved in success, rejected otherwise.
     */
    self.setLastQuestionPageAttempted = function(lessonId, courseId, retake, lastPage, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get current stored retake.
        return getRetakeWithFallback(lessonId, courseId, retake, siteId).then(function(entry) {
            return $mmSitesManager.getSite(siteId).then(function(site) {
                entry.lastquestionpage = lastPage;
                entry.timemodified = $mmUtil.timestamp();

                return site.getDb().insert(mmaModLessonRetakesStore, entry);
            });
        });
    };

    return self;
});
