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
 * Mod Lesson handlers.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc service
 * @name $mmaModLessonHandlers
 */
.factory('$mmaModLessonHandlers', function($mmCourse, $mmaModLesson, $state, $mmaModLessonPrefetchHandler, $mmUtil, $mmEvents,
            $mmSite, $mmCoursePrefetchDelegate, mmCoreEventPackageStatusChanged, mmaModLessonComponent, mmCoreDownloading,
            mmCoreNotDownloaded, mmCoreOutdated, $mmaModLessonSync, $mmCourseHelper, $mmContentLinksHelper, $q,
            $mmContentLinkHandlerFactory) {

    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHandlers#courseContentHandler
     */
    self.courseContentHandler = function() {
        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModLesson.isPluginEnabled();
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
                var downloadBtn  = {
                        hidden: true,
                        icon: 'ion-ios-cloud-download-outline',
                        label: 'mm.core.download',
                        action: download
                    },
                    refreshBtn = {
                        icon: 'ion-android-refresh',
                        label: 'mm.core.refresh',
                        hidden: true,
                        action: download
                    };

                $scope.icon = $mmCourse.getModuleIconSrc('lesson');
                $scope.title = module.name;
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_lesson', {module: module, courseid: courseId});
                };

                function download(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    var wasDwnHidden = downloadBtn.hidden,
                        wasRefreshHidden = refreshBtn.hidden;

                    // Show spinner since this operation might take a while.
                    $scope.spinner = true;
                    downloadBtn.hidden = true;
                    refreshBtn.hidden = true;

                    $mmaModLessonPrefetchHandler.getDownloadSize(module, courseId, true).then(function(size) {
                        $mmUtil.confirmDownloadSize(size).then(function() {
                            return $mmaModLessonPrefetchHandler.prefetch(module, courseId, true).catch(function(error) {
                                if (!$scope.$$destroyed) {
                                    $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                                    return $q.reject();
                                }
                            });
                        }).catch(function() {
                            // User hasn't confirmed, stop spinner.
                            $scope.spinner = false;
                            downloadBtn.hidden = wasDwnHidden;
                            refreshBtn.hidden = wasRefreshHidden;
                        });
                    }).catch(function(error) {
                        $scope.spinner = false;
                        downloadBtn.hidden = wasDwnHidden;
                        refreshBtn.hidden = wasRefreshHidden;
                        $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
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
                            data.component === mmaModLessonComponent) {
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
     * Synchronization handler.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHandlers#syncHandler
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
            return $mmaModLessonSync.syncAllLessons(siteId);
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

    /**
     * Content links handler for lesson view.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHandlers#viewLinksHandler
     */
    self.viewLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/lesson\/view\.php.*([\&\?]id=\d+)/, '$mmCourseDelegate_mmaModLesson');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.viewLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;
        return $mmContentLinksHelper.isModuleIndexEnabled($mmaModLesson, siteId, courseId);
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.viewLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        return [{
            action: function(siteId) {
                // Ignore the pageid param. If we open the lesson player with a certain page and the user hasn't started
                // the lesson, an error is thrown: could not find lesson_timer records.
                if (params.userpassword) {
                    navigateToModuleWithPassword(parseInt(params.id, 10), courseId, params.userpassword, siteId);
                } else {
                    $mmCourseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId);
                }
            }
        }];
    };

    /**
     * Navigate to a lesson module (index page) with a fixed password.
     *
     * @param  {Number} moduleId   Module ID.
     * @param  {Number} [courseId] Course ID.
     * @param  {String} [password] Password.
     * @param  {String} siteId     Site ID.
     * @return {Promise}           Promise resolved when navigated.
     */
    function navigateToModuleWithPassword(moduleId, courseId, password, siteId) {
        var modal = $mmUtil.showModalLoading();

        // Get the module.
        return $mmCourse.getModuleBasicInfo(moduleId, siteId).then(function(module) {
            courseId = courseId || module.course;

            // Store the password so it's automatically used.
            return $mmaModLesson.storePassword(parseInt(module.instance, 10), password).catch(function() {
                // Ignore errors.
            }).then(function() {
                return $mmCourseHelper.navigateToModule(moduleId, siteId, courseId, module.section);
            });
        }).catch(function() {
            // Error, go to index page.
            return $mmCourseHelper.navigateToModule(moduleId, siteId, courseId);
        }).finally(function() {
            modal.dismiss();
        });
    }

    /**
     * Content links handler for report overview.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHandlers#overviewLinksHandler
     */
    self.overviewLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/lesson\/report\.php.*([\&\?]id=\d+)/, '$mmCourseDelegate_mmaModLesson');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.overviewLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;
        if (params.action == 'reportdetail' && !params.userid) {
            // Individual details are only available if the teacher is seeing a certain user.
            return false;
        }

        return $mmContentLinksHelper.isModuleIndexEnabled($mmaModLesson, siteId, courseId);
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.overviewLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        return [{
            action: function(siteId) {
                if (!params.action || params.action == 'reportoverview') {
                    // Go to overview.
                    openReportOverview(parseInt(params.id, 10), courseId, parseInt(params.group, 10), siteId);
                } else if (params.action == 'reportdetail') {
                    openUserRetake(parseInt(params.id, 10), parseInt(params.userid, 10), courseId,
                            parseInt(params.try, 10), siteId);
                }
            }
        }];
    };

    /**
     * Open report overview.
     *
     * @param  {Number} moduleId   Module ID.
     * @param  {Number} [courseId] Course ID.
     * @param  {String} [groupId]  Group ID.
     * @param  {String} siteId     Site ID.
     * @return {Promise}           Promise resolved when navigated.
     */
    function openReportOverview(moduleId, courseId, groupId, siteId) {
        var modal = $mmUtil.showModalLoading();

        // Get the module object.
        return $mmCourse.getModuleBasicInfo(moduleId, siteId).then(function(module) {
            courseId = courseId || module.course;

            var stateParams = {
                module: module,
                courseid: courseId ? parseInt(courseId, 10) : courseId,
                action: 'report',
                group: groupId
            };
            $mmContentLinksHelper.goInSite('site.mod_lesson', stateParams, siteId);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error processing link.');
            return $q.reject();
        }).finally(function() {
            modal.dismiss();
        });
    }

    /**
     * Open a user's retake.
     *
     * @param  {Number} moduleId   Module ID.
     * @param  {Number} userId     User ID.
     * @param  {Number} [courseId] Course ID.
     * @param  {Number} [retake]   Retake to open.
     * @param  {String} [groupId]  Group ID.
     * @param  {String} siteId     Site ID.
     * @return {Promise}           Promise resolved when navigated.
     */
    function openUserRetake(moduleId, userId, courseId, retake, siteId) {
        var modal = $mmUtil.showModalLoading();

        // Get the module object.
        return $mmCourse.getModuleBasicInfo(moduleId, siteId).then(function(module) {
            courseId = courseId || module.course;

            var stateParams = {
                lessonid: module.instance,
                courseid: courseId ? parseInt(courseId, 10) : courseId,
                userid: userId,
                retake: retake || 0
            };
            $mmContentLinksHelper.goInSite('site.mod_lesson-userretake', stateParams, siteId);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error processing link.');
            return $q.reject();
        }).finally(function() {
            modal.dismiss();
        });
    }

    /**
     * Content links handler for lesson grade link.
     *
     * @module mm.addons.mod_lesson
     * @ngdoc method
     * @name $mmaModLessonHandlers#gradeLinksHandler
     */
    self.gradeLinksHandler = $mmContentLinksHelper.createModuleGradeLinkHandler('mmaModLesson', 'lesson', $mmaModLesson, viewGrade);

    /**
     * Treat a grade link to a user different than current one.
     *
     * @param  {String} url        URL to treat.
     * @param  {Object} params     Params of the URL.
     * @param  {Number} [courseId] Course ID related to the URL.
     * @param  {String} siteId     Site ID.
     * @return {[type]}          [description]
     */
    function viewGrade(url, params, courseId, siteId) {
        siteId = siteId || $mmSite.getId();

        var moduleId = parseInt(params.id, 10),
            modal = $mmUtil.showModalLoading(),
            module;

        return $mmCourse.getModuleBasicInfo(moduleId, siteId).then(function(mod) {
            module = mod;
            courseId = module.course || courseId || params.courseid || params.cid;

            // Check if the user can see the user reports in the lesson.
            return $mmaModLesson.getAccessInformation(module.instance);
        }).then(function(info) {
            if (info.canviewreports) {
                // User can view reports, go to view the report.
                return $state.go('redirect', {
                    siteid: siteId,
                    state: 'site.mod_lesson-userretake',
                    params: {
                        courseid: courseId,
                        lessonid: module.instance,
                        userid: parseInt(params.userid, 10)
                    }
                });
            } else {
                // User cannot view the report, go to lesson index.
                return $mmCourseHelper.navigateToModule(moduleId, siteId, courseId, module.section);
            }
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            modal.dismiss();
        });
    }

    return self;
});
