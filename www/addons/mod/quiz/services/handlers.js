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

angular.module('mm.addons.mod_quiz')

/**
 * Mod Quiz handlers.
 *
 * @module mm.addons.mod_quiz
 * @ngdoc service
 * @name $mmaModQuizHandlers
 */
.factory('$mmaModQuizHandlers', function($mmCourse, $mmaModQuiz, $state, $q, $mmContentLinksHelper, $mmUtil, $mmCourseHelper,
            $mmSite, $mmCoursePrefetchDelegate, $mmaModQuizPrefetchHandler, $mmEvents, mmCoreEventPackageStatusChanged,
            mmaModQuizComponent, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, $mmaModQuizHelper, $mmaModQuizSync) {

    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHandlers#courseContentHandler
     */
    self.courseContentHandler = function() {
        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModQuiz.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @param {Object} module The module info.
         * @param {Number} courseId The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseId) {
            return function($scope) {
                var downloadBtn,
                    refreshBtn;

                downloadBtn = {
                    hidden: true,
                    icon: 'ion-ios-cloud-download-outline',
                    label: 'mm.core.download',
                    action: download
                };

                refreshBtn = {
                    icon: 'ion-android-refresh',
                    label: 'mm.core.refresh',
                    hidden: true,
                    action: download
                };

                $scope.icon = $mmCourse.getModuleIconSrc('quiz');
                $scope.title = module.name;
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_quiz', {module: module, courseid: courseId});
                };

                function download(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    $scope.spinner = true; // Show spinner since this operation might take a while.
                    $mmaModQuizPrefetchHandler.prefetch(module, courseId, true).catch(function(error) {
                        $scope.spinner = false;
                        if (!$scope.$$destroyed) {
                            $mmaModQuizHelper.showError(error, 'mm.core.errordownloading');
                        }
                    });
                }

                // Show buttons according to module status.
                function showStatus(status) {
                    if (status) {
                        $scope.spinner = status === mmCoreDownloading;
                        downloadBtn.hidden = status !== mmCoreNotDownloaded;
                        refreshBtn.hidden = status !== mmCoreOutdated;
                    }
                }

                // Listen for changes on this module status.
                var statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
                    if (data.siteid === $mmSite.getId() && data.componentId === module.id &&
                            data.component === mmaModQuizComponent) {
                        showStatus(data.status);
                    }
                });

                // Get current status to decide which icon should be shown.
                $mmCoursePrefetchDelegate.getModuleStatus(module, courseId).then(showStatus);

                $scope.$on('$destroy', function() {
                    statusObserver && statusObserver.off && statusObserver.off();
                });
            };
        };

        return self;
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {},
            patterns = ['/mod/quiz/view.php', '/mod/quiz/review.php', '/mod/quiz/grade.php'];

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isEnabled(siteId, courseId) {
            return $mmaModQuiz.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }
                return courseId || $mmCourse.canGetModuleWithoutCourseId(siteId);
            });
        }

        /**
         * Get a quiz ID by attempt ID.
         *
         * @param  {Number} attemptId Attempt ID.
         * @return {Promise}          Promise resolved with the quiz ID.
         */
        function getQuizIdByAttemptId(attemptId) {
            return $mmaModQuiz.getAttemptReview(attemptId).then(function(reviewData) {
                if (reviewData.attempt && reviewData.attempt.quiz) {
                    return reviewData.attempt.quiz;
                }
                return $q.reject();
            }).catch(function(error) {
                error = error || 'An error occurred while loading the required data.';
                $mmUtil.showErrorModal(error);
                return $q.reject();
            });
        }

        /**
         * Get actions to perform with the link.
         *
         * @param {String[]} siteIds  Site IDs the URL belongs to.
         * @param {String} url        URL to treat.
         * @param {Number} [courseId] Course ID related to the URL.
         * @return {Promise}          Promise resolved with the list of actions.
         *                            See {@link $mmContentLinksDelegate#registerLinkHandler}.
         */
        self.getActions = function(siteIds, url, courseId) {
            // Check it's a quiz URL.
            if (url.indexOf(patterns[0]) > -1) {
                // Quiz index.
                return $mmContentLinksHelper.treatModuleIndexUrl(siteIds, url, isEnabled, courseId);
            } else if (url.indexOf(patterns[1]) > -1) {
                // Quiz review.
                var params = $mmUtil.extractUrlParams(url),
                    attemptId = params.attempt,
                    page = parseInt(params.page, 10);

                if (attemptId != 'undefined') {
                    // If courseId is not set we check if it's set in the URL as a param.
                    courseId = courseId || params.courseid || params.cid;
                    attemptId = parseInt(attemptId, 10);

                    // Pass false because all sites should have the same siteurl.
                    return $mmContentLinksHelper.filterSupportedSites(siteIds, isEnabled, false, courseId).then(function(ids) {
                        if (!ids.length) {
                            return [];
                        } else {
                            // Return actions.
                            return [{
                                message: 'mm.core.view',
                                icon: 'ion-eye',
                                sites: ids,
                                action: function(siteId) {
                                    // We want to retrieve the quiz ID by attempt ID. We'll use getAttemptReview for that.
                                    var modal = $mmUtil.showModalLoading(),
                                        quizId;

                                    return getQuizIdByAttemptId(attemptId).then(function(qid) {
                                        quizId = qid;

                                        // Get the courseId if we don't have it.
                                        if (courseId) {
                                            return $q.when(courseId);
                                        } else {
                                            return $mmCourseHelper.getModuleCourseIdByInstance(quizId, 'quiz', siteId);
                                        }
                                    }).then(function(courseId) {
                                        var stateParams = {
                                            quizid: quizId,
                                            attemptid: attemptId,
                                            courseid: courseId,
                                            page: params.showall ? -1 : (isNaN(page) ? -1 : page)
                                        };
                                        $mmContentLinksHelper.goInSite('site.mod_quiz-review', stateParams, siteId);
                                    }).finally(function() {
                                        modal.dismiss();
                                    });
                                }
                            }];
                        }
                    });
                }
            } else if (url.indexOf(patterns[2]) > -1) {
                // Quiz grade.
                // @todo Go to review user best attempt if it isn't current user.
                return $mmContentLinksHelper.treatModuleGradeUrl(siteIds, url, isEnabled, courseId);
            }


            return $q.when([]);
        };

        /**
         * Check if the URL is handled by this handler. If so, returns the URL of the site.
         *
         * @param  {String} url URL to check.
         * @return {String}     Site URL. Undefined if the URL doesn't belong to this handler.
         */
        self.handles = function(url) {
            for (var i = 0; i < patterns.length; i++) {
                var position = url.indexOf(patterns[i]);
                if (position > -1) {
                    return url.substr(0, position);
                }
            }
        };

        return self;
    };

    /**
     * Synchronization handler.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHandlers#syncHandler
     */
    self.syncHandler = function() {

        var self = {};

        /**
         * Execute the process.
         * Receives the ID of the site affected, undefined for all sites.
         *
         * @param  {String} [siteId] ID of the site affected, undefined for all sites.
         * @return {Promise}         Promise resolved when done, rejected if failure.
         */
        self.execute = function(siteId) {
            return $mmaModQuizSync.syncAllQuizzes(siteId);
        };

        /**
         * Get the time between consecutive executions.
         *
         * @return {Number} Time between consecutive executions (in ms).
         */
        self.getInterval = function() {
            return 600000; // 10 minutes.
        };

        /**
         * Whether it's a synchronization process or not.
         *
         * @return {Boolean} True if is a sync process, false otherwise.
         */
        self.isSync = function() {
            return true;
        };

        /**
         * Whether the process uses network or not.
         *
         * @return {Boolean} True if uses network, false otherwise.
         */
        self.usesNetwork = function() {
            return true;
        };

        return self;
    };

    return self;
});
