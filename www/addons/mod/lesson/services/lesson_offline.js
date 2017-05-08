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

.constant('mmaModLessonAttemptsStore', 'mma_mod_lesson_attempts')
.constant('mmaModLessonAnswersStore', 'mma_mod_lesson_answers')

.config(function($mmSitesFactoryProvider, mmaModLessonAttemptsStore, mmaModLessonAnswersStore) {
    var stores = [
        {
            name: mmaModLessonAttemptsStore,
            keyPath: 'lessonid', // Only 1 offline attempt per lesson.
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
            keyPath: ['lessonid', 'attempt', 'pageid', 'timemodified'], // A user can answer several times per page and attempt.
            indexes: [
                {
                    name: 'lessonid'
                },
                {
                    name: 'courseid'
                },
                {
                    name: 'attempt'
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
                    name: 'lessonAndAttempt',
                    keyPath: ['lessonid', 'attempt']
                },
                {
                    name: 'lessonAndAttemptAndType',
                    keyPath: ['lessonid', 'attempt', 'type']
                },
                {
                    name: 'lessonAndAttemptAndPage',
                    keyPath: ['lessonid', 'attempt', 'pageid']
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
.factory('$mmaModLessonOffline', function($log, $mmSitesManager, $mmUtil, $q, mmaModLessonAttemptsStore, mmaModLessonAnswersStore,
            $mmSite, mmaModLessonTypeQuestion) {

    $log = $log.getInstance('$mmaModLessonOffline');

    var self = {};

    /**
     * Delete offline answer.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#deleteAnswer
     * @param  {Number} lessonId     Lesson ID.
     * @param  {Number} attempt      Attempt number.
     * @param  {Number} pageId       Page ID.
     * @param  {Number} timemodified The time modified of the answer.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when done.
     */
    self.deleteAnswer = function(lessonId, attempt, pageId, timemodified, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModLessonAnswersStore, [lessonId, attempt, pageId, timemodified]);
        });
    };

    /**
     * Delete offline attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#deleteAttempt
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done.
     */
    self.deleteAttempt = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModLessonAttemptsStore, lessonId);
        });
    };

    /**
     * Delete offline answers for an attempt and page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#deleteAttemptAnswersForPage
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Number} pageId   Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done.
     */
    self.deleteAttemptAnswersForPage = function(lessonId, attempt, pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            // Get the answers and delete them.
            return self.getAttemptAnswersForPage(lessonId, attempt, pageId, siteId).then(function(answers) {
                var promises = [];

                angular.forEach(answers, function(answer) {
                    promises.push(site.getDb().remove(mmaModLessonAnswersStore, [lessonId, attempt, pageId, answer.timemodified]));
                });

                return $q.all(promises);
            });
        });
    };

    /**
     * Mark an attempt as finished.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#finishAttempt
     * @param  {Number} lessonId   Lesson ID.
     * @param  {Number} courseId   Course ID the lesson belongs to.
     * @param  {Number} attempt    Attempt number.
     * @param  {Boolean} finished  Whether attempt is finished.
     * @param  {Boolean} outOfTime If the user ran out of time.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved in success, rejected otherwise.
     */
    self.finishAttempt = function(lessonId, courseId, attempt, finished, outOfTime, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get current stored attempt.
        return getAttemptWithFallback(lessonId, courseId, attempt, siteId).then(function(entry) {
            return $mmSitesManager.getSite(siteId).then(function(site) {
                entry.finished = !!finished;
                entry.outoftime = !!outOfTime;
                entry.timemodified = $mmUtil.timestamp();

                return site.getDb().insert(mmaModLessonAttemptsStore, entry);
            });
        });
    };

    /**
     * Get all the offline answers in a certain site.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAllAnswers
     * @param {String} [siteId] Site ID. If not set, use current site.
     * @return {Promise}        Promise resolved when the offline answers are retrieved.
     */
    self.getAllAnswers = function(siteId) {
        return $mmSitesManager.getSiteDb(siteId).then(function(db) {
            if (!db) {
                return $q.reject();
            }

            return db.getAll(mmaModLessonAnswersStore);
        });
    };

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
        promises.push(getLessons(self.getAllAnswers(siteId)));

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
     * Retrieve offline answers for an attempt and page.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getAttemptAnswersForPage
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {Number} pageId   Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt answers.
     */
    self.getAttemptAnswersForPage = function(lessonId, attempt, pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonAnswersStore, 'lessonAndAttemptAndPage', [lessonId, attempt, pageId]);
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
     * @param  {Number} type     Type of the pages to get: mmaModLessonTypeQuestion or mmaModLessonTypeStructure.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt answers.
     */
    self.getAttemptAnswersForType = function(lessonId, attempt, type, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonAnswersStore, 'lessonAndAttemptAndType', [lessonId, attempt, type]);
        });
    };
    /**
     * Get stored attempt. If not found or doesn't match the attempt number, return a new one.
     *
     * @param  {Number} lessonId  Lesson ID.
     * @param  {Number} courseId  Course ID the lesson belongs to.
     * @param  {Number} attempt   Attempt number.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with the attempt.
     */
    function getAttemptWithFallback(lessonId, courseId, attempt, siteId) {
        // Get current stored attempt.
        return self.getAttempt(lessonId, siteId).then(function(attemptData) {
            if (attemptData.attempt != attempt) {
                // The stored attempt doesn't match the attempt number, create a new one.
                return $q.reject();
            }
            return attemptData;
        }).catch(function() {
            // No attempt, create a new one.
            return {
                lessonid: lessonId,
                attempt: attempt,
                courseid: courseId,
                finished: false
            };
        });
    }

    /**
     * Retrieve the last offline answer stored in an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getLastQuestionPageAnswer
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} attempt  Attempt number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the attempt (undefined if no attempts).
     */
    self.getLastQuestionPageAnswer = function(lessonId, attempt, siteId) {
        siteId = siteId || $mmSite.getId();

        return getAttemptWithFallback(lessonId, 0, attempt, siteId).then(function(attemptData) {
            if (!attemptData.lastquestionpage) {
                // No question page answered.
                return;
            }

            return self.getAttemptAnswersForPage(lessonId, attempt, attemptData.lastquestionpage, siteId).then(function(answers) {
                // Return the answer with highest timemodified.
                return answers.reduce(function(a, b) {
                    return a.timemodified > b.timemodified ? a : b;
                });
            });
        }).catch(function() {
            // Error, return undefined.
        });
    };

    /**
     * Retrieve all offline answers for a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getLessonAnswers
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the answers.
     */
    self.getLessonAnswers = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModLessonAnswersStore, 'lessonid', lessonId);
        });
    };

    /**
     * Get questions attempts for a lesson and attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#getQuestionsAttempts
     * @param  {Number} lessonId       Lesson ID.
     * @param  {Number} attempt        Attempt number.
     * @param  {Boolean} correct       True to only fetch correct attempts, false to get them all.
     * @param  {Number} [pageId]       If defined, only get attempts on this page.
     * @param  {String} [siteId]       Site ID. If not defined, current site.
     * @return {Promise}               Promise resolved with the questions attempts.
     */
    self.getQuestionsAttempts = function(lessonId, attempt, correct, pageId, siteId) {
        var promise;
        if (pageId) {
            // Page ID is set, only get the answers for that page.
            promise = self.getAttemptAnswersForPage(lessonId, attempt, pageId, siteId);
        } else {
            // Page ID not specified, get all the question answers.
            promise = self.getAttemptAnswersForType(lessonId, attempt, mmaModLessonTypeQuestion, siteId);
        }

        return promise.then(function(answers) {
            if (correct) {
                return answers.filter(function(answer) {
                    return !!answer.correct;
                });
            }
            return answers;
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
     * Check if there is a finished attempt for a certain lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#hasFinishedAttempt
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean.
     */
    self.hasFinishedAttempt = function(lessonId, siteId) {
        return self.getAttempt(lessonId, siteId).then(function(attempt) {
            return !!attempt.finished;
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

        promises.push(self.getAttempt(lessonId, siteId).then(function() {
            hasData = true;
        }).catch(function() {
            // Ignore errors.
        }));

        promises.push(self.getLessonAnswers(lessonId, siteId).then(function(answers) {
            hasData = hasData || !!answers.length;
        }).catch(function() {
            // Ignore errors.
        }));

        return $q.all(promises).then(function() {
            return hasData;
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
     * @param  {Number} attempt     Attempt number.
     * @param  {Object} page        Page.
     * @param  {Object} data        Data to save.
     * @param  {Number} newPageId   New page ID (calculated).
     * @param  {Number} [answerId]  The answer ID that the user answered.
     * @param  {Boolean} [correct]  If answer is correct. Only for question pages.
     * @param  {Mixed} [userAnswer] The user's answer (userresponse from checkAnswer).
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved in success, rejected otherwise.
     */
    self.processPage = function(lessonId, courseId, attempt, page, data, newPageId, answerId, correct, userAnswer, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var entry = {
                lessonid: lessonId,
                attempt: attempt,
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

            return site.getDb().insert(mmaModLessonAnswersStore, entry);
        }).then(function() {
            if (page.type == mmaModLessonTypeQuestion) {
                // It's a question page, set it as last question page answered.
                return self.setLastQuestionPageAnswered(lessonId, courseId, attempt, page.id, siteId);
            }
        });
    };

    /**
     * Set the last question page answered in an attempt.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonOffline#setLastQuestionPageAnswered
     * @param  {Number} lessonId  Lesson ID.
     * @param  {Number} courseId  Course ID the lesson belongs to.
     * @param  {Number} attempt   Attempt number.
     * @param  {Number} lastPage  ID of the last question page answered.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved in success, rejected otherwise.
     */
    self.setLastQuestionPageAnswered = function(lessonId, courseId, attempt, lastPage, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get current stored attempt.
        return getAttemptWithFallback(lessonId, courseId, attempt, siteId).then(function(entry) {
            return $mmSitesManager.getSite(siteId).then(function(site) {
                entry.lastquestionpage = lastPage;
                entry.timemodified = $mmUtil.timestamp();

                return site.getDb().insert(mmaModLessonAttemptsStore, entry);
            });
        });
    };

    return self;
});
