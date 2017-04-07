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

angular.module('mm.addons.mod_feedback')

/**
 * Mod feedback handlers.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc service
 * @name $mmaModFeedbackHandlers
 */
.factory('$mmaModFeedbackHandlers', function($mmCourse, $mmaModFeedback, $state, $mmContentLinksHelper, $mmUtil, $mmEvents, $mmSite,
        mmaModFeedbackComponent, $mmaModFeedbackPrefetchHandler, mmCoreDownloading, mmCoreNotDownloaded,
        mmCoreEventPackageStatusChanged, mmCoreOutdated, $mmCoursePrefetchDelegate, $mmContentLinkHandlerFactory) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModFeedback.isPluginEnabled();
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
                var downloadBtn = {
                        hidden: true,
                        icon: 'ion-ios-cloud-download-outline',
                        label: 'mm.core.download',
                        action: function(e) {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            download();
                        }
                    },
                    refreshBtn = {
                        hidden: true,
                        icon: 'ion-android-refresh',
                        label: 'mm.core.refresh',
                        action: function(e) {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            $mmaModFeedback.invalidateContent(module.id, courseId).finally(function() {
                                download();
                            });
                        }
                    };

                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('feedback');
                $scope.class = 'mma-mod_feedback-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_feedback', {module: module, moduleid: module.id, courseid: courseId});
                };

                function download() {

                    $scope.spinner = true; // Show spinner since this operation might take a while.
                    // We need to call getDownloadSize, the package might have been updated.
                    $mmaModFeedbackPrefetchHandler.getDownloadSize(module, courseId).then(function(size) {
                        $mmUtil.confirmDownloadSize(size).then(function() {
                            $mmaModFeedbackPrefetchHandler.prefetch(module, courseId).catch(function() {
                                if (!$scope.$$destroyed) {
                                    $mmUtil.showErrorModal('mm.core.errordownloading', true);
                                }
                            });
                        }).catch(function() {
                            // User hasn't confirmed, stop spinner.
                            $scope.spinner = false;
                        });
                    }).catch(function(error) {
                        $scope.spinner = false;
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
                            data.component === mmaModFeedbackComponent) {
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
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModFeedback', 'feedback', $mmaModFeedback);

    /**
     * Content links handler for a feedback analysis.
     * Match mod/feedback/analysis.php with a valid feedback id.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHandlers#analysisLinksHandler
     */
    self.analysisLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/feedback\/analysis\.php.*([\&\?]id=\d+)/, '$mmCourseDelegate_mmaModFeedback');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.analysisLinksHandler.isEnabled = $mmaModFeedback.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.analysisLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                if (typeof params.id == 'undefined') {
                    // Id not defined. Cannot treat the URL.
                    return false;
                }

                var modal = $mmUtil.showModalLoading(),
                    moduleId = parseInt(params.id, 10);

                return $mmCourse.getModuleBasicInfo(moduleId).then(function(module) {
                    var stateParams = {
                        module: module,
                        moduleid: module.id,
                        feedbackid: module.instance,
                        courseid: module.course
                    };
                    return $mmContentLinksHelper.goInSite('site.mod_feedback-analysis', stateParams, siteId);
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Content links handler for feedback complete questions.
     * Match mod/feedback/complete.php with a valid feedback id and optional page.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHandlers#completeLinksHandler
     */
    self.completeLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/feedback\/complete\.php.*([\?\&](id|gopage)=\d+)/, '$mmCourseDelegate_mmaModFeedback');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.completeLinksHandler.isEnabled = $mmaModFeedback.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.completeLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                if (typeof params.id == 'undefined') {
                    // Id not defined. Cannot treat the URL.
                    return false;
                }

                var modal = $mmUtil.showModalLoading(),
                    moduleId = parseInt(params.id, 10);

                return $mmCourse.getModuleBasicInfo(moduleId).then(function(module) {
                    var stateParams = {
                        module: module,
                        moduleid: module.id,
                        feedbackid: module.instance,
                        courseid: module.course,
                        preview: false
                    };
                    if (typeof params.gopage == 'undefined') {
                        stateParams.page = parseInt(params.gopage, 10);
                    }
                    return $mmContentLinksHelper.goInSite('site.mod_feedback-form', stateParams, siteId);
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Content links handler for feedback print questions.
     * Match mod/feedback/print.php with a valid feedback id.
     *
     * @module mm.addons.mod_feedback
     * @ngdoc method
     * @name $mmaModFeedbackHandlers#printLinksHandler
     */
    self.printLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/feedback\/print\.php.*([\?\&](id)=\d+)/, '$mmCourseDelegate_mmaModFeedback');

    // Check if the printLinksHandler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.printLinksHandler.isEnabled = $mmaModFeedback.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.printLinksHandler.getActions = function(siteIds, url, params, courseId) {
        return [{
            action: function(siteId) {
                if (typeof params.id == 'undefined') {
                    // Id not defined. Cannot treat the URL.
                    return false;
                }

                var modal = $mmUtil.showModalLoading(),
                    moduleId = parseInt(params.id, 10);

                return $mmCourse.getModuleBasicInfo(moduleId).then(function(module) {
                    var stateParams = {
                        module: module,
                        moduleid: module.id,
                        courseid: module.course,
                        preview: true
                    };
                    return $mmContentLinksHelper.goInSite('site.mod_feedback-form', stateParams, siteId);
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };


    return self;
});
