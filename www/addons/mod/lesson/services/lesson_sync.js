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

.constant('mmaModLessonRetakesFinishedSyncStore', 'mma_mod_lesson_retakes_finished_sync')

.config(function($mmSitesFactoryProvider, mmaModLessonRetakesFinishedSyncStore) {
    var stores = [
        {
            name: mmaModLessonRetakesFinishedSyncStore,
            keyPath: 'lessonid', // Only 1 retake per lesson.
            indexes: [
                {
                    name: 'retake'
                },
                {
                    name: 'timefinished'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Lesson synchronization service.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLessonSync
 */
.factory('$mmaModLessonSync', function($log, $mmaModLesson, $mmSite, $mmSitesManager, $q, $mmaModLessonOffline, $mmUtil,
            $mmLang, $mmApp, $mmEvents, $translate, mmaModLessonSyncTime, $mmSync, mmaModLessonAutomSyncedEvent,
            mmaModLessonComponent, $mmaModLessonPrefetchHandler, $mmCourse, $mmSyncBlock, mmaModLessonRetakesFinishedSyncStore) {

    $log = $log.getInstance('$mmaModLessonSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModLessonComponent, mmaModLessonSyncTime);

    /**
     * Unmark a retake as finished in a synchronization.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonSync#deleteRetakeFinishedInSync
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done.
     */
    self.deleteRetakeFinishedInSync = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModLessonRetakesFinishedSyncStore, lessonId);
        }).catch(function() {
            // Ignore errors, maybe there is none.
        });
    };

    /**
     * Get a retake finished in a synchronization for a certain lesson (if any).
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonSync#getRetakeFinishedInSync
     * @param  {Number} lessonId Lesson ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with the retake entry (undefined if no retake).
     */
    self.getRetakeFinishedInSync = function(lessonId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModLessonRetakesFinishedSyncStore, lessonId);
        }).catch(function() {
            // Ignore errors, return undefined.
        });
    };

    /**
     * Check if a lesson has data to synchronize.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonSync#hasDataToSync
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   Retake number.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with boolean: true if has data to sync, false otherwise.
     */
    self.hasDataToSync = function(lessonId, retake, siteId) {
        var promises = [],
            hasDataToSync = false;

        promises.push($mmaModLessonOffline.hasRetakeAttempts(lessonId, retake, siteId).then(function(hasAttempts) {
            hasDataToSync = hasDataToSync || hasAttempts;
        }).catch(function() {
            // Ignore errors.
        }));

        promises.push($mmaModLessonOffline.hasFinishedRetake(lessonId, siteId).then(function(hasFinished) {
            hasDataToSync = hasDataToSync || hasFinished;
        }));

        return $q.all(promises).then(function() {
            return hasDataToSync;
        });
    };

    /**
     * Mark a retake as finished in a synchronization.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonSync#setRetakeFinishedInSync
     * @param  {Number} lessonId Lesson ID.
     * @param  {Number} retake   The retake number.
     * @param  {Number} pageId   The page ID to start reviewing from.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done.
     */
    self.setRetakeFinishedInSync = function(lessonId, retake, pageId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().insert(mmaModLessonRetakesFinishedSyncStore, {
                lessonid: lessonId,
                retake: parseInt(retake, 10),
                pageid: parseInt(pageId, 10),
                timefinished: $mmUtil.timestamp()
            });
        });
    };

    /**
     * Try to synchronize all lessons that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonSync#syncAllLessons
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllLessons = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all lessons because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync lessons in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync lessons in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                sitePromises.push($mmaModLessonOffline.getAllLessonsWithData(siteId).then(function(lessons) {
                    // Sync all lessons that haven't been synced for a while.
                    var promises = [];

                    angular.forEach(lessons, function(lesson) {
                        promises.push(self.syncLessonIfNeeded(lesson.id, false, siteId).then(function(result) {
                            if (result && result.updated) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModLessonAutomSyncedEvent, {
                                    siteid: siteId,
                                    lessonid: lesson.id,
                                    warnings: result.warnings
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
     * Sync a lesson only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonSync#syncLessonIfNeeded
     * @param  {Number} lessonId     Lesson ID.
     * @param  {Boolean} askPassword True if we should ask for password if needed, false otherwise.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when the lesson is synced or if it doesn't need to be synced.
     */
    self.syncLessonIfNeeded = function(lessonId, askPassword, siteId) {
        return self.isSyncNeeded(lessonId, siteId).then(function(needed) {
            if (needed) {
                return self.syncLesson(lessonId, askPassword, false, siteId);
            }
        });
    };

    /**
     * Try to synchronize a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonSync#syncLesson
     * @param  {Number} lessonId     Lesson ID.
     * @param  {Boolean} askPassword True if we should ask for password if needed, false otherwise.
     * @param  {Boolean} ignoreBlock True to ignore the sync block setting.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise rejected in failure, resolved in success with an object containing:
     *                                       -warnings Array of warnings.
     *                                       -updated  True if some data was sent to the server.
     */
    self.syncLesson = function(lessonId, askPassword, ignoreBlock, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            lesson,
            courseId,
            password,
            accessInfo,
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(lessonId, siteId)) {
            // There's already a sync ongoing for this lesson, return the promise.
            return self.getOngoingSync(lessonId, siteId);
        }

        // Verify that lesson isn't blocked.
        if (!ignoreBlock && $mmSyncBlock.isBlocked(mmaModLessonComponent, lessonId, siteId)) {
            $log.debug('Cannot sync lesson ' + lessonId + ' because it is blocked.');
            var moduleName = $mmCourse.translateModuleName('lesson');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: moduleName});
        }

        $log.debug('Try to sync lesson ' + lessonId + ' in site ' + siteId);

        // Try to synchronize the attempts first.
        syncPromise = $mmaModLessonOffline.getLessonAttempts(lessonId, siteId).then(function(attempts) {
            if (!attempts.length) {
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            courseId = attempts[0].courseid;

            // Get the info, access info and the lesson password if needed.
            return $mmaModLesson.getLessonById(courseId, lessonId).then(function(lessonData) {
                lesson = lessonData;

                return $mmaModLessonPrefetchHandler.gatherLessonPassword(lessonId, false, true, askPassword, siteId);
            }).then(function(data) {
                var attemptsLength = attempts.length;

                accessInfo = data.accessinfo;
                password = data.password;
                lesson = data.lesson || lesson;

                var promises = [];

                // Filter the attempts, get only the ones that belong to the current retake.
                attempts = attempts.filter(function(attempt) {
                    if (attempt.retake != accessInfo.attemptscount) {
                        promises.push($mmaModLessonOffline.deleteAttempt(lesson.id, attempt.retake, attempt.pageid,
                                attempt.timemodified, siteId).catch(function() {
                            // Ignore errors.
                        }));
                        return false;
                    }
                    return true;
                });

                if (attempts.length != attemptsLength) {
                    // Some attempts won't be sent, add a warning.
                    result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                        component: $mmCourse.translateModuleName('lesson'),
                        name: lesson.name,
                        error: $translate.instant('mma.mod_lesson.warningretakefinished')
                    }));
                }

                return $q.all(promises);
            }).then(function() {
                if (!attempts.length) {
                    return;
                }

                // Send the attempts in the same order they were answered.
                attempts.sort(function(a, b) {
                    return a.timemodified - b.timemodified;
                });

                attempts = attempts.map(function(attempt) {
                    return {
                        func: sendAttempt,
                        params: [lesson, password, attempt, result, siteId],
                        blocking: true
                    };
                });

                return $mmUtil.executeOrderedPromises(attempts);
            });
        }).then(function() {
            // Attempts sent or there was none. If there is a finished retake, send it.
            return $mmaModLessonOffline.getRetake(lessonId, siteId).then(function(retake) {
                if (!retake.finished) {
                    // The retake isn't marked as finished, nothing to send. Delete the retake.
                    return $mmaModLessonOffline.deleteRetake(lessonId, siteId);
                } else if (!$mmApp.isOnline()) {
                    // Cannot sync in offline.
                    return $q.reject();
                }

                var promise;

                courseId = retake.courseid;

                if (lesson) {
                    // Data already retrieved when syncing attempts.
                    promise = $q.when();
                } else {
                    promise = $mmaModLesson.getLessonById(courseId, lessonId).then(function(lessonData) {
                        lesson = lessonData;

                        return $mmaModLessonPrefetchHandler.gatherLessonPassword(lessonId, false, true, askPassword, siteId);
                    }).then(function(data) {
                        accessInfo = data.accessinfo;
                        password = data.password;
                        lesson = data.lesson || lesson;
                    });
                }

                return promise.then(function() {
                    if (retake.retake != accessInfo.attemptscount) {
                        // The retake changed, add a warning if it isn't there already.
                        if (!result.warnings.length) {
                            result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                                component: $mmCourse.translateModuleName('lesson'),
                                name: lesson.name,
                                error: $translate.instant('mma.mod_lesson.warningretakefinished')
                            }));
                        }

                        return $mmaModLessonOffline.deleteRetake(lessonId, siteId);
                    }

                    // All good, finish the retake.
                    return $mmaModLesson.finishRetakeOnline(lessonId, password, false, false, siteId).then(function(response) {
                        result.updated = true;

                        if (!ignoreBlock) {
                            // Mark the retake as finished in a sync if it can be reviewed.
                            if (response.data && response.data.reviewlesson) {
                                var params = $mmUtil.extractUrlParams(response.data.reviewlesson.value);
                                if (params && params.pageid) {
                                    // The retake can be reviewed, mark it as finished. Don't block the user for this.
                                    self.setRetakeFinishedInSync(lessonId, retake.retake, params.pageid, siteId);
                                }
                            }
                        }

                        return $mmaModLessonOffline.deleteRetake(lessonId, siteId);
                    }).catch(function(error) {
                        if (error && $mmUtil.isWebServiceError(error)) {
                            // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                            result.updated = true;
                            return $mmaModLessonOffline.deleteRetake(lessonId, siteId).then(function() {
                                // Retake deleted, add a warning.
                                result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                                    component: $mmCourse.translateModuleName('lesson'),
                                    name: lesson.name,
                                    error: error
                                }));
                            });
                        } else {
                            // Couldn't connect to server, reject.
                            return $q.reject(error);
                        }
                    });
                });
            }, function() {
                // No retake stored, nothing to do.
            });
        }).then(function() {
            if (result.updated && courseId) {
                // Data has been sent to server. Now invalidate the WS calls.
                var promises = [];
                promises.push($mmaModLesson.invalidateAccessInformation(lessonId, siteId));
                promises.push($mmaModLesson.invalidateContentPagesViewed(lessonId, siteId));
                promises.push($mmaModLesson.invalidateQuestionsAttempts(lessonId, siteId));
                promises.push($mmaModLesson.invalidatePagesPossibleJumps(lessonId, siteId));
                promises.push($mmaModLesson.invalidateTimers(lessonId, siteId));

                return $mmUtil.allPromises(promises).catch(function() {
                    // Ignore errors.
                }).then(function() {
                    // Sync successful, update some data that might have been modified.
                    return $mmaModLesson.getAccessInformation(lessonId, false, false, siteId).then(function(info) {
                        var promises = [],
                            retake = info.attemptscount;

                        promises.push($mmaModLesson.getContentPagesViewedOnline(lessonId, retake, false, false, siteId));
                        promises.push($mmaModLesson.getQuestionsAttemptsOnline(
                                    lessonId, retake, false, undefined, false, false, siteId));

                        return $q.all(promises);
                    }).catch(function() {
                        // Ignore errors.
                    });

                });
            }
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(lessonId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(lessonId, syncPromise, siteId);
    };

    /**
     * Send an attempt to the site and delete it afterwards.
     *
     * @param  {Object} lesson   Lesson.
     * @param  {String} password Password (if any).
     * @param  {Object} attempt  Attempt to send.
     * @param  {Object} result   Result where to store the data.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done.
     */
    function sendAttempt(lesson, password, attempt, result, siteId) {
        return $mmaModLesson.processPageOnline(lesson.id, attempt.pageid, attempt.data, password, false, siteId).then(function() {
            result.updated = true;

            return $mmaModLessonOffline.deleteAttempt(lesson.id, attempt.retake, attempt.pageid, attempt.timemodified, siteId);
        }).catch(function(error) {
            if (error && $mmUtil.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that the attempt cannot be submitted. Delete it.
                result.updated = true;
                return $mmaModLessonOffline.deleteAttempt(lesson.id, attempt.retake, attempt.pageid, attempt.timemodified, siteId)
                        .then(function() {
                    // Attempt deleted, add a warning.
                    result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                        component: $mmCourse.translateModuleName('lesson'),
                        name: lesson.name,
                        error: error
                    }));
                });
            } else {
                // Couldn't connect to server, reject.
                return $q.reject(error);
            }
        });
    }

    return self;
});
