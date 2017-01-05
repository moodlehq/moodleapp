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
 * Mod resource handlers.
 *
 * @module mm.addons.mod_resource
 * @ngdoc service
 * @name $mmaModResourceHandlers
 */
.factory('$mmaModResourceHandlers', function($mmCourse, $mmaModResource, $mmEvents, $state, $mmSite, $mmCourseHelper,
            $mmCoursePrefetchDelegate, $mmUtil, $mmFS, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated,
            mmCoreEventPackageStatusChanged, mmaModResourceComponent, $q, $mmContentLinksHelper, $mmaModResourcePrefetchHandler) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourceHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModResource.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @param {Object} module   The module info.
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
                    action: function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        download(false);
                    }
                };

                refreshBtn = {
                    icon: 'ion-android-refresh',
                    label: 'mm.core.refresh',
                    hidden: true,
                    action: function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        download(true);
                    }
                };

                $scope.title = module.name;
                $scope.class = 'mma-mod_resource-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                // Show resource icon while calculating the right icon to show.
                $scope.icon = $mmCourse.getModuleIconSrc('resource');
                $mmCourse.loadModuleContents(module, courseId).then(function() {
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
                });

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_resource', {module: module, courseid: courseId});
                };

                function download(refresh) {
                    var dwnBtnHidden = downloadBtn.hidden,
                        rfrshBtnHidden = refreshBtn.hidden;

                    // Show spinner since this operation might take a while.
                    $scope.spinner = true;
                    downloadBtn.hidden = true;
                    refreshBtn.hidden = true;

                    // Get download size to ask for confirm if it's high.
                    $mmaModResourcePrefetchHandler.getDownloadSize(module, courseId).then(function(size) {
                        $mmCourseHelper.prefetchModule($scope, $mmaModResourcePrefetchHandler, module, size, refresh, courseId)
                                .catch(function() {
                            // Error or cancelled, leave the buttons as they were.
                            $scope.spinner = false;
                            downloadBtn.hidden = dwnBtnHidden;
                            refreshBtn.hidden = rfrshBtnHidden;
                        });
                    }).catch(function(error) {
                        // Error, leave the buttons as they were.
                        $scope.spinner = false;
                        downloadBtn.hidden = dwnBtnHidden;
                        refreshBtn.hidden = rfrshBtnHidden;

                        if (error) {
                            $mmUtil.showErrorModal(error);
                        } else {
                            $mmUtil.showErrorModal('mm.core.errordownloading', true);
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
                            data.component === mmaModResourceComponent) {
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
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourceHandlers#linksHandler
     */
    self.linksHandler = function() {

        var self = {};

        /**
         * Whether or not the handler is enabled for a certain site.
         *
         * @param  {String} siteId     Site ID.
         * @param  {Number} [courseId] Course ID related to the URL.
         * @return {Promise}           Promise resolved with true if enabled.
         */
        function isEnabled(siteId, courseId) {
            return $mmaModResource.isPluginEnabled(siteId).then(function(enabled) {
                if (!enabled) {
                    return false;
                }
                return courseId || $mmCourse.canGetModuleWithoutCourseId(siteId);
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
            // Check it's a resource URL.
            if (typeof self.handles(url) != 'undefined') {
                return $mmContentLinksHelper.treatModuleIndexUrl(siteIds, url, isEnabled, courseId);
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
            var position = url.indexOf('/mod/resource/view.php');
            if (position > -1) {
                return url.substr(0, position);
            }
        };

        return self;
    };

    return self;
});
