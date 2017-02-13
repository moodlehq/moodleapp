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
            mmaModQuizComponent, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, $mmaModQuizHelper, $mmaModQuizSync,
            $mmContentLinkHandlerFactory) {

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
     * Content links handler for module index page.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModQuiz', 'quiz', $mmaModQuiz);

    /**
     * Content links handler for quiz grade page.
     * @todo Go to review user best attempt if it isn't current user.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHandlers#gradeLinksHandler
     */
    self.gradeLinksHandler = $mmContentLinksHelper.createModuleGradeLinkHandler('mmaModQuiz', 'quiz', $mmaModQuiz);

    /**
     * Content links handler for quiz review page.
     *
     * @module mm.addons.mod_quiz
     * @ngdoc method
     * @name $mmaModQuizHandlers#reviewLinksHandler
     */
    self.reviewLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/quiz\/review\.php.*([\&\?]attempt=\d+)/, '$mmCourseDelegate_mmaModQuiz');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.reviewLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;
        return $mmContentLinksHelper.isModuleIndexEnabled($mmaModQuiz, siteId, courseId);
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.reviewLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        var attemptId = parseInt(params.attempt, 10),
            page = parseInt(params.page, 10);

        return [{
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
    };

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
