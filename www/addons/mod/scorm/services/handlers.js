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
        mmaModScormComponent, $q, $mmContentLinksHelper, $mmaModScormSync, $mmaModScormPrefetchHandler) {
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

                    function download(isOutdated) {
                        // We need to call getScorm again, the package might have been updated.
                        $scope.spinner = true; // Show spinner since this operation might take a while.
                        $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
                            $mmaModScormHelper.confirmDownload(scorm, isOutdated).then(function() {
                                return $mmaModScormPrefetchHandler.prefetch(module, courseid).catch(function(error) {
                                    if (!$scope.$$destroyed) {
                                        $mmaModScormHelper.showDownloadError(scorm, error);
                                        return $q.reject();
                                    }
                                });
                            }).catch(function() {
                                // User hasn't confirmed, stop spinner.
                                $scope.spinner = false;
                            });
                        }).catch(function(error) {
                            $scope.spinner = false;
                            $mmaModScormHelper.showDownloadError(scorm, error);
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
                        $mmaModScorm.invalidateAllScormData(scorm.id).finally(function() {
                            download(true);
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
                }).catch(function() {
                    // Error getting SCORM, hide the spinner.
                    $scope.spinner = false;
                });
            };
        };

        return self;
    };

    /**
     * Content links handler for module index page.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModScorm', 'scorm', $mmaModScorm);

    /**
     * Content links handler for quiz grade page.
     * @todo Go to user attempts list if it isn't current user.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHandlers#gradeLinksHandler
     */
    self.gradeLinksHandler = $mmContentLinksHelper.createModuleGradeLinkHandler('mmaModScorm', 'scorm', $mmaModScorm);

    /**
     * Synchronization handler.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormHandlers#syncHandler
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
            return $mmaModScormSync.syncAllScorms(siteId);
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
