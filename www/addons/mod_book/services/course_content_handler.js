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

angular.module('mm.addons.mod_book')

/**
 * Mod book course content handler.
 *
 * @module mm.addons.mod_book
 * @ngdoc service
 * @name $mmaModBookCourseContentHandler
 */
.factory('$mmaModBookCourseContentHandler', function($mmCourse, $mmaModBook, $mmEvents, $state, $mmSite, $mmUtil, $mmFilepool,
            $mmCoursePrefetchDelegate, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, mmCoreDownloaded,
            mmCoreEventPackageStatusChanged, mmaModBookComponent) {

    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModBook.isPluginEnabled();
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookCourseContentHandler#getController
     * @param {Object} module The module info.
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
                    $mmaModBook.prefetchContent(module).catch(function() {
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

                    $mmaModBook.invalidateContent(module.id).finally(function() {
                        $mmaModBook.prefetchContent(module).catch(function() {
                            if (!$scope.$$destroyed) {
                                $mmUtil.showErrorModal('mm.core.errordownloading', true);
                            }
                        });
                    });
                }
            };

            $scope.title = module.name;
            $scope.icon = $mmCourse.getModuleIconSrc('book');
            $scope.buttons = [downloadBtn, refreshBtn];
            $scope.spinner = false;

            $scope.action = function(e) {
                e.preventDefault();
                e.stopPropagation();
                $state.go('site.mod_book', {module: module, courseid: courseid});
            };

            // Show buttons according to module status.
            function showStatus(status) {
                if (status) {
                    $scope.spinner = status === mmCoreDownloading;
                    downloadBtn.hidden = status !== mmCoreNotDownloaded;
                    // Always show refresh button if a book is downloaded because revision and timemodified aren't reliable.
                    refreshBtn.hidden = status !== mmCoreOutdated && status !== mmCoreDownloaded;
                }
            }

            // Listen for changes on this module status.
            var statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
                if (data.siteid === $mmSite.getId() && data.componentId === module.id && data.component === mmaModBookComponent) {
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
