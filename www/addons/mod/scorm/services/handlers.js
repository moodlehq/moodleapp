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
 * Mod scorm handlers.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormHandlers
 */
.factory('$mmaModScormHandlers', function($mmCourse, $mmaModScorm, $mmEvents, $state, $mmSite, $mmaModScormHelper,
        $mmCoursePrefetchDelegate, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, mmCoreEventPackageStatusChanged,
        mmaModScormComponent, $q, $mmContentLinksHelper, $mmUtil) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModScorm.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
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
                    icon: 'ion-ios-cloud-download-outline',
                    label: 'mm.core.download'
                };

                refreshBtn = {
                    icon: 'ion-android-refresh',
                    label: 'mm.core.refresh',
                    hidden: true
                };

                $scope.icon = $mmCourse.getModuleIconSrc('scorm');
                $scope.title = module.name;
                $scope.class = 'mma-mod_scorm-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_scorm', {module: module, courseid: courseid});
                };

                // Retrieve SCORM to calculate the rest of data.
                $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
                    var revision = scorm.sha1hash,
                        timemodified = 0;

                    function download() {
                        // We need to call getScorm again, the package might have been updated.
                        $scope.spinner = true; // Show spinner since this operation might take a while.
                        $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
                            $mmaModScormHelper.confirmDownload(scorm).then(function() {
                                $mmaModScorm.prefetch(scorm).catch(function() {
                                    if (!$scope.$$destroyed) {
                                        $mmaModScormHelper.showDownloadError(scorm);
                                    }
                                });
                            }).catch(function() {
                                // User hasn't confirmed, stop spinner.
                                $scope.spinner = false;
                            });
                        }).catch(function(error) {
                            $scope.spinner = false;
                            if (error) {
                                $mmUtil.showErrorModal(error);
                            } else {
                                $mmaModScormHelper.showDownloadError(scorm);
                            }
                        });
                    }

                    // Now add the action to the buttons.
                    downloadBtn.action = function(e) {
                        if (e) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        download();
                    };

                    refreshBtn.action = function(e) {
                        if (e) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
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
    };

    /**
     * Content links handler.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHandlers#linksHandler
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
            return $mmaModScorm.isPluginEnabled(siteId).then(function(enabled) {
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
            // Check it's a SCORM URL.
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
            var position = url.indexOf('/mod/scorm/view.php');
            if (position > -1) {
                return url.substr(0, position);
            }
        };

        return self;
    };

    return self;
});
