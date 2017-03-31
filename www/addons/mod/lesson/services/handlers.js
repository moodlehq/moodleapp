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
            mmCoreNotDownloaded, mmCoreOutdated) {

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

                    $mmaModLessonPrefetchHandler.getDownloadSize(module, courseId).then(function(size) {
                        $mmUtil.confirmDownloadSize(size).then(function() {
                            $mmaModLessonPrefetchHandler.prefetch(module, courseId).catch(function() {
                                if (!$scope.$$destroyed) {
                                    $mmUtil.showErrorModal('mm.core.errordownloading', true);
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

    return self;
});
