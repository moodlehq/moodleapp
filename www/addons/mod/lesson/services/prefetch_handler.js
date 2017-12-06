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
 * Mod lesson prefetch handler.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLessonPrefetchHandler
 */
.factory('$mmaModLessonPrefetchHandler', function($mmaModLesson, $q, $mmPrefetchFactory, mmaModLessonComponent, $mmUtil, $mmGroups,
    $mmSite, $mmFilepool, $rootScope, $timeout, $ionicModal, mmCoreDontShowError, $mmCourse, $mmLang) {

    var self = $mmPrefetchFactory.createPrefetchHandler(mmaModLessonComponent, false);

    // RegExp to check if a module has updates based on the result of $mmCoursePrefetchDelegate#getCourseUpdates.
    // Don't check timers to decrease positives. If a user performs some action it will be reflected in other items.
    self.updatesNames = /^configuration$|^.*files$|^grades$|^gradeitems$|^pages$|^answers$|^questionattempts$|^pagesviewed$/;

    /**
     * Download the module.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#download
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.download = function(module, courseId) {
        // Lessons cannot be downloaded right away, only prefetched.
        return self.prefetch(module, courseId);
    };

    /**
     * Get the lesson password if needed. If not stored, it can ask the user to enter it.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#gatherLessonPassword
     * @param  {Number} lessonId     Lesson ID.
     * @param  {Boolean} forceCache  True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {Boolean} askPassword True if we should ask for password if needed, false otherwise.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved with an object containing access info, password and the lesson (if needed).
     */
    self.gatherLessonPassword = function(lessonId, forceCache, ignoreCache, askPassword, siteId) {
        siteId = siteId || $mmSite.getId();

        // Get access information to check if password is needed.
        return $mmaModLesson.getAccessInformation(lessonId, forceCache, ignoreCache, siteId).then(function(info) {
            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                var passwordNeeded = info.preventaccessreasons.length == 1 && $mmaModLesson.isPasswordProtected(info);
                if (passwordNeeded) {
                    // The lesson requires a password. Check if there is one in DB.
                    return $mmaModLesson.getStoredPassword(lessonId).catch(function() {
                        // No password found.
                    }).then(function(pwd) {
                        if (pwd) {
                            return validatePassword(info, pwd);
                        } else {
                            return $q.reject();
                        }
                    }).catch(function() {
                        // No password or error validating it. Ask for it if allowed.
                        if (askPassword) {
                            return askUserPassword(info);
                        }
                        return $q.reject(info.preventaccessreasons[0].message);
                    });
                } else  {
                    // Lesson cannot be played, reject.
                    return $q.reject(info.preventaccessreasons[0].message);
                }
            }

            // Password not needed.
            return {accessinfo: info};
        });

        // Validate the password.
        function validatePassword(info, pwd) {
            return $mmaModLesson.getLessonWithPassword(lessonId, pwd, true, forceCache, ignoreCache, siteId).then(function(lesson) {
                // Password is ok, store it and return the data.
                return $mmaModLesson.storePassword(lesson.id, pwd).then(function() {
                    return {password: pwd, lesson: lesson, accessinfo: info};
                });
            });
        }

        // Ask password.
        function askUserPassword(info) {
            var scope = $rootScope.$new();
            scope.data = {
                password: ''
            };

            // Init the modal.
            return $ionicModal.fromTemplateUrl('addons/mod/lesson/templates/password-modal.html', {
                scope: scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                var resolved = false,
                    deferred = $q.defer();

                scope.modal = modal;
                modal.show();

                scope.submitPassword = function(pwd) {
                    modal.hide();
                    scope.$destroy();

                    resolved = true;
                    validatePassword(info, pwd).then(deferred.resolve).catch(function(error) {
                        // Wait a bit to reject to prevent Ionic bug: https://github.com/driftyco/ionic/issues/9069
                        $timeout(function() {
                            deferred.reject(error);
                        }, 400);
                    });
                };

                scope.closeModal = function() {
                    modal.hide();
                    scope.$destroy();

                    if (!resolved) {
                        // Wait a bit to reject to prevent Ionic bug: https://github.com/driftyco/ionic/issues/9069
                        $timeout(function() {
                            deferred.reject(mmCoreDontShowError);
                        }, 400);
                    }
                };

                scope.$on('$destroy', function() {
                    modal.remove();
                });

                return deferred.promise;
            });
        }
    };

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#getDownloadSize
     * @param  {Object} module       Module to get the size.
     * @param  {Number} courseId     Course ID the module belongs to.
     * @param  {Boolean} single      True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}             Resolved With the file size and a boolean to indicate if it is the total size or only partial.
     */
    self.getDownloadSize = function(module, courseId, single) {
        var lesson,
            password,
            result,
            siteId = $mmSite.getId();

        return $mmaModLesson.getLesson(courseId, module.id, siteId).then(function(lessonData) {
            lesson = lessonData;

            // Get the lesson password if it's needed.
            return self.gatherLessonPassword(lesson.id, false, true, single, siteId);
        }).then(function(data) {
            password = data.password;
            lesson = data.lesson || lesson;

            // Get intro files and media files.
            var files = lesson.mediafiles || [];
            files = files.concat(self.getIntroFilesFromInstance(module, lesson));

            result = $mmUtil.sumFileSizes(files);

            // Get the pages to calculate the size.
            return $mmaModLesson.getPages(lesson.id, password);
        }).then(function(pages) {
            angular.forEach(pages, function(page) {
                result.size += page.filessizetotal;
            });

            return result;
        });
    };

    /**
     * Get the downloaded size of a module.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#getDownloadedSize
     * @param {Object} module   Module to get the downloaded size.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadedSize = function(module, courseId) {
        return $mmFilepool.getFilesSizeByComponent($mmSite.getId(), self.component, module.id);
    };

    /**
     * Get revision of a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseId Course ID the module belongs to.
     * @return {Number}         Promise resolved with revision.
     */
    self.getRevision = function(module, courseId) {
        // Lessons will always be controlled using the getCourseUpdates.
        return 0;
    };

    /**
     * Get timemodified of a lesson.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#getTimemodified
     * @param {Object} module    Module to get the timemodified.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with timemodified.
     */
    self.getTimemodified = function(module, courseId) {
        var siteId = $mmSite.getId(),
            lesson,
            password,
            timemodified = 0;

        return $mmaModLesson.getLesson(courseId, module.id, siteId).then(function(lessonData) {
            lesson = lessonData;

            // Get the lesson password if it's needed.
            return self.gatherLessonPassword(lesson.id, false, false, false, siteId);
        }).then(function(data) {
            password = data.password;
            lesson = data.lesson || lesson;

            var promises = [],
                files = lesson.mediafiles || [];
            files = files.concat(self.getIntroFilesFromInstance(module, lesson));

            timemodified = Math.max(lesson.timemodified || 0, $mmFilepool.getTimemodifiedFromFileList(files));

            // Get the list of pages.
            promises.push($mmaModLesson.getPages(lesson.id, password, false, false, siteId).then(function(pages) {
                // Check the timemodified of each page. Don't check the files in each page because it requires a WS call
                // per page and it will fail if the user hasn't started the lesson yet.
                angular.forEach(pages, function(data) {
                    timemodified = Math.max(timemodified, data.page.timemodified || data.page.timecreated || 0);
                });
            }));

            // Get the user timer to check the last user action.
            promises.push($mmaModLesson.getTimers(lesson.id, false, false, siteId).then(function(timers) {
                var lastTimer = timers[timers.length - 1];
                if (lastTimer) {
                    timemodified = Math.max(timemodified, lastTimer.starttime || 0,
                            lastTimer.lessontime || 0, lastTimer.timemodifiedoffline || 0);
                }
            }).catch(function() {
                // Ignore errors.
            }));

            return $q.all(promises);
        }).then(function() {
            return timemodified;
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId) {
        return $mmaModLesson.invalidateContent(moduleId, courseId);
    };

    /**
     * Invalidates WS calls needed to determine module status.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#invalidateModule
     * @param  {Object} module   Module to invalidate.
     * @param  {Number} courseId Course ID the module belongs to.
     * @return {Promise}         Promise resolved when done.
     */
    self.invalidateModule = function(module, courseId) {
        // Invalidate data to determine if module is downloadable.
        return $mmaModLesson.getLesson(courseId, module.id, false, true).then(function(lesson) {
            var promises = [];

            promises.push($mmaModLesson.invalidateLessonData(courseId));
            promises.push($mmaModLesson.invalidateAccessInformation(lesson.id));

            return $q.all(promises);
        });
    };

    /**
     * Check if a lesson is downloadable.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#isDownloadable
     * @param {Object} module    Module to check.
     * @param {Number} courseId  Course ID the module belongs to.
     * @return {Promise}         Promise resolved with true if downloadable, resolved with false otherwise.
     */
    self.isDownloadable = function(module, courseId) {
        var siteId = $mmSite.getId();
        return $mmaModLesson.getLesson(courseId, module.id, siteId).then(function(lesson) {
            if (!$mmaModLesson.isLessonOffline(lesson)) {
                return false;
            }

            // Check if there is any prevent access reason.
            return $mmaModLesson.getAccessInformation(lesson.id, false, false, siteId).then(function(info) {
                // It's downloadable if there are no prevent access reasons or there is just 1 and it's password.
                return !info.preventaccessreasons || !info.preventaccessreasons.length ||
                        (info.preventaccessreasons.length == 1 && $mmaModLesson.isPasswordProtected(info));
            });
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#isEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isEnabled = function() {
        return $mmaModLesson.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when the prefetch is finished. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return self.prefetchPackage(module, courseId, single, prefetchLesson, $mmSite.getId());
    };

    /**
     * Prefetch a lesson.
     *
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @param  {String} siteId   Site ID.
     * @return {Promise}         Promise resolved with an object with 'revision' and 'timemod'.
     */
    function prefetchLesson(module, courseId, single, siteId) {
        var lesson,
            password,
            accessInfo;

        return $mmaModLesson.getLesson(courseId, module.id, siteId).then(function(lessonData) {
            lesson = lessonData;

            // Get the lesson password if it's needed.
            return self.gatherLessonPassword(lesson.id, false, true, single, siteId);
        }).then(function(data) {
            password = data.password;
            lesson = data.lesson || lesson;
            accessInfo = data.accessinfo;

            if (!$mmaModLesson.leftDuringTimed(accessInfo)) {
                // The user didn't left during a timed session. Call launch retake to make sure there is a started retake.
                return $mmaModLesson.launchRetake(lesson.id, password, false, false, siteId).then(function() {
                    var promises = [];

                    // New data generated, update the download time and refresh the access info.
                    promises.push($mmFilepool.updatePackageDownloadTime(siteId, self.component, module.id).catch(function() {
                        // Ignore errors.
                    }));
                    promises.push($mmaModLesson.getAccessInformation(lesson.id, false, true, siteId).then(function(info) {
                        accessInfo = info;
                    }));

                    return $q.all(promises);
                });
            }
        }).then(function() {
            var promises = [],
                files,
                retake = accessInfo.attemptscount;

            // Download intro files and media files.
            files = lesson.mediafiles || [];
            files = files.concat(self.getIntroFilesFromInstance(module, lesson));

            promises.push($mmFilepool.addFilesToQueueByUrl(siteId, files, self.component, module.id));

            // Get the list of pages.
            promises.push($mmaModLesson.getPages(lesson.id, password, false, true, siteId).then(function(pages) {
                var subPromises = [],
                    hasRandomBranch = false;

                // Get the data for each page.
                angular.forEach(pages, function(data) {
                    // Check if any page has a RANDOMBRANCH jump.
                    angular.forEach(data.jumps, function(jump) {
                        if (jump == $mmaModLesson.LESSON_RANDOMBRANCH) {
                            hasRandomBranch = true;
                        }
                    });

                    // Get the page data.
                    subPromises.push($mmaModLesson.getPageData(lesson, data.page.id, password, false, true, false,
                            true, undefined, undefined, siteId).then(function(pageData) {

                        // Download the page files.
                        var pageFiles = pageData.contentfiles || [];

                        angular.forEach(pageData.answers, function(answer) {
                            if (answer.answerfiles && answer.answerfiles.length) {
                                pageFiles = pageFiles.concat(answer.answerfiles);
                            }
                            if (answer.responsefiles && answer.responsefiles.length) {
                                pageFiles = pageFiles.concat(answer.responsefiles);
                            }
                        });

                        return $mmFilepool.addFilesToQueueByUrl(siteId, pageFiles, self.component, module.id);
                    }));
                });

                // Prefetch the list of possible jumps for offline navigation. Do it here so we know hasRandomBranch.
                subPromises.push($mmaModLesson.getPagesPossibleJumps(lesson.id, false, true, siteId).catch(function(error) {
                    if (hasRandomBranch) {
                        // The WebSevice probably failed because RANDOMBRANCH aren't supported if the user hasn't seen any page.
                        return $mmLang.translateAndReject('mma.mod_lesson.errorprefetchrandombranch');
                    } else {
                        return $q.reject(error);
                    }
                }));

                return $q.all(subPromises);
            }));

            // Prefetch user timers to be able to calculate timemodified in offline.
            promises.push($mmaModLesson.getTimers(lesson.id, false, true, siteId).catch(function() {
                // Ignore errors.
            }));


            // Prefetch viewed pages in last retake to calculate progress.
            promises.push($mmaModLesson.getContentPagesViewedOnline(lesson.id, retake, false, true, siteId));

            // Prefetch question attempts in last retake for offline calculations.
            promises.push($mmaModLesson.getQuestionsAttemptsOnline(lesson.id, retake, false, undefined, false, true, siteId));

            // Get module info to be able to handle links.
            promises.push($mmCourse.getModuleBasicInfo(module.id, siteId));

            if (accessInfo.canviewreports) {
                // Prefetch reports data.
                promises.push($mmGroups.getActivityAllowedGroupsIfEnabled(module.id, undefined, siteId).then(function(groups) {
                    var subPromises = [];

                    angular.forEach(groups, function(group) {
                        subPromises.push($mmaModLesson.getRetakesOverview(lesson.id, group.id, false, true, siteId));
                    });

                    // Always get group 0, even if there are no groups.
                    subPromises.push($mmaModLesson.getRetakesOverview(lesson.id, 0, false, true, siteId).then(function(data) {
                        // Prefetch the last retake for each user.
                        var retakePromises = [];

                        angular.forEach(data && data.students, function(student) {
                            if (!student.attempts || !student.attempts.length) {
                                return;
                            }

                            var lastRetake = student.attempts[student.attempts.length - 1];
                            if (!lastRetake) {
                                return;
                            }

                            retakePromises.push($mmaModLesson.getUserRetake(
                                    lesson.id, lastRetake.try, student.id, false, true, siteId));
                        });

                        return $q.all(retakePromises);
                    }));

                    return $q.all(subPromises);
                }));
            }

            return $q.all(promises);
        }).then(function() {
            // Return revision and timemodified.
            return {
                revision: 0,
                timemod: $mmUtil.timestamp()
            };
        });
    }

    return self;
});
