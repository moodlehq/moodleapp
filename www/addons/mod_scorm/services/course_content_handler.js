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

angular.module('mm.addons.mod_scorm')

/**
 * Mod scorm course content handler.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormCourseContentHandler
 */
.factory('$mmaModScormCourseContentHandler', function($mmCourse, $mmaModScorm, $mmEvents, $state, $mmSite, $mmaModScormHelper,
        $mmCoursePrefetchDelegate, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, mmCoreEventPackageStatusChanged,
        mmaModScormComponent) {
    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModScorm.isPluginEnabled();
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormCourseContentHandler#getController
     * @param {Object} module The module info.
     * @param {Number} courseid The course ID.
     * @return {Function}
     */
    self.getController = function(module, courseid) {
        return function($scope) {
            var downloadBtn,
                refreshBtn;

            // Create the buttons without action yet. This is to prevent a glitch in the view.
            downloadBtn = {
                hidden: true,
                icon: 'ion-ios-cloud-download',
                label: 'mm.core.download'
            };

            refreshBtn = {
                icon: 'ion-android-refresh',
                label: 'mm.core.refresh',
                hidden: true
            };

            $scope.icon = $mmCourse.getModuleIconSrc('scorm');
            $scope.title = module.name;
            $scope.buttons = [downloadBtn, refreshBtn];
            $scope.spinner = false;

            $scope.action = function(e) {
                e.preventDefault();
                e.stopPropagation();
                $state.go('site.mod_scorm', {module: module, courseid: courseid});
            };

            // Retrieve SCORM to calculate the rest of data.
            $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
                var revision = scorm.sha1hash,
                    timemodified = 0;

                function download() {
                    $mmaModScormHelper.confirmDownload(scorm).then(function() {
                        $mmaModScorm.prefetch(scorm).catch(function() {
                            if (!$scope.$$destroyed) {
                                $mmaModScormHelper.showDownloadError(scorm);
                            }
                        });
                    });
                }

                // Now add the action to the buttons.
                downloadBtn.action = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    download();
                };

                refreshBtn.action = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $mmaModScorm.invalidateContent(scorm.coursemodule).finally(function() {
                        download();
                    });
                };

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
                    if (data.siteid === $mmSite.getId() && data.componentId === scorm.coursemodule &&
                            data.component === mmaModScormComponent) {
                        showStatus(data.status);
                    }
                });

                // Get current status to decide which icon should be shown.
                $mmCoursePrefetchDelegate.getModuleStatus(module, courseid, revision, timemodified).then(showStatus);

                $scope.$on('$destroy', function() {
                    statusObserver && statusObserver.off && statusObserver.off();
                });
            });
        };
    };

    return self;
});
