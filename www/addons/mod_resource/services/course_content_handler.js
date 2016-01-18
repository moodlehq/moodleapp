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

angular.module('mm.addons.mod_resource')

/**
 * Mod resource course content handler.
 *
 * @module mm.addons.mod_resource
 * @ngdoc service
 * @name $mmaModResourceCourseContentHandler
 */
.factory('$mmaModResourceCourseContentHandler', function($mmCourse, $mmaModResource, $mmEvents, $state, $mmSite, $mmUtil,
            $mmCoursePrefetchDelegate, $mmFilepool, $mmFS, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated,
            mmCoreEventPackageStatusChanged, mmaModResourceComponent) {

    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourceCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmSite.canDownloadFiles();
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourceCourseContentHandler#getController
     * @param {Object} module   The module info.
     * @param {Number} courseid The course ID.
     * @return {Function}
     */
    self.getController = function(module, courseid) {
        return function($scope) {
            var downloadBtn,
                refreshBtn,
                revision = $mmFilepool.getRevisionFromFileList(module.contents),
                timemodified = $mmFilepool.getTimemodifiedFromFileList(module.contents);

            downloadBtn = {
                hidden: true,
                icon: 'ion-ios-cloud-download-outline',
                label: 'mm.core.download',
                action: function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $mmaModResource.prefetchContent(module).catch(function() {
                        if (!$scope.$$destroyed) {
                            $mmUtil.showErrorModal('mm.core.errordownloading', true);
                        }
                    });
                }
            };

            refreshBtn = {
                icon: 'ion-android-refresh',
                label: 'mm.core.refresh',
                hidden: true,
                action: function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $mmaModResource.invalidateContent(module.id).finally(function() {
                        $mmaModResource.prefetchContent(module).catch(function() {
                            if (!$scope.$$destroyed) {
                                $mmUtil.showErrorModal('mm.core.errordownloading', true);
                            }
                        });
                    });
                }
            };

            $scope.title = module.name;

            if (module.contents.length) {
                var filename = module.contents[0].filename,
                    extension = $mmFS.getFileExtension(filename);
                if (module.contents.length == 1 || (extension != "html" && extension != "htm")) {
                    $scope.icon = $mmFS.getFileIcon(filename);
                } else {
                    $scope.icon = $mmCourse.getModuleIconSrc('resource');
                }
            } else {
                $scope.icon = $mmCourse.getModuleIconSrc('resource');
            }
            $scope.buttons = [downloadBtn, refreshBtn];
            $scope.spinner = false;

            $scope.action = function(e) {
                e.preventDefault();
                e.stopPropagation();
                $state.go('site.mod_resource', {module: module, courseid: courseid});
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
                if (data.siteid === $mmSite.getId() && data.componentId === module.id &&
                        data.component === mmaModResourceComponent) {
                    showStatus(data.status);
                }
            });

            // Get current status to decide which icon should be shown.
            $mmCoursePrefetchDelegate.getModuleStatus(module, courseid, revision, timemodified).then(showStatus);

            $scope.$on('$destroy', function() {
                statusObserver && statusObserver.off && statusObserver.off();
            });
        };
    };

    return self;
});
