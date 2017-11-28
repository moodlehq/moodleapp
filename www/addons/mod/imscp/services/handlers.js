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

angular.module('mm.addons.mod_imscp')

/**
 * Mod IMSCP handlers.
 *
 * @module mm.addons.mod_imscp
 * @ngdoc service
 * @name $mmaModImscpHandlers
 */
.factory('$mmaModImscpHandlers', function($mmCourse, $mmaModImscp, $mmEvents, $state, $mmSite, $mmCourseHelper,
            $mmCoursePrefetchDelegate, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, mmCoreEventPackageStatusChanged,
            mmaModImscpComponent, $mmContentLinksHelper, $q, $mmaModImscpPrefetchHandler, $mmUtil) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @module mm.addons.mod_imscp
         * @ngdoc method
         * @name $mmaModImscpCourseContentHandler#isEnabled
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModImscp.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @module mm.addons.mod_imscp
         * @ngdoc method
         * @name $mmaModImscpCourseContentHandler#getController
         * @param {Object} module   The module info.
         * @param {Number} courseid The course ID.
         * @return {Function}
         */
        self.getController = function(module, courseid) {
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
                $scope.icon = $mmCourse.getModuleIconSrc('imscp');
                $scope.class = 'mma-mod_imscp-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_imscp', {module: module, courseid: courseid});
                };

                function download(refresh) {
                    var dwnBtnHidden = downloadBtn.hidden,
                        rfrshBtnHidden = refreshBtn.hidden;

                    // Show spinner since this operation might take a while.
                    $scope.spinner = true;
                    downloadBtn.hidden = true;
                    refreshBtn.hidden = true;

                    // Get download size to ask for confirm if it's high.
                    $mmaModImscpPrefetchHandler.getDownloadSize(module, courseid).then(function(size) {
                        $mmCourseHelper.prefetchModule($scope, $mmaModImscpPrefetchHandler, module, size, refresh, courseid)
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
                    if (data.siteid === $mmSite.getId() && data.componentId === module.id && data.component === mmaModImscpComponent) {
                        showStatus(data.status);
                    }
                });

                // Get current status to decide which icon should be shown.
                $mmCoursePrefetchDelegate.getModuleStatus(module, courseid).then(showStatus);

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
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpHandlers#linksHandler
     */
    self.linksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModImscp', 'imscp', $mmaModImscp);

    /**
     * Plugin file handler.
     *
     * @module mm.addons.mod_imscp
     * @ngdoc method
     * @name $mmaModImscpHandlers#pluginfileHandler
     */
    self.pluginfileHandler = function() {
        var self = {};

        /**
         * Get the RegExp of the component and filearea described in the URL.
         *
         * @module mm.addons.mod_imscp
         * @ngdoc method
         * @name $mmaModImscpPluginfileHandler#getComponentRevisionRegExp
         * @param {Array} args    Arguments of the pluginfile URL defining component and filearea at least.
         * @return {RegExp}       To match the revision.
         */
        self.getComponentRevisionRegExp = function(args) {
            // Check filearea.
            if (args[2] == 'content') {
                // Component + Filearea + Revision
                return new RegExp('/mod_imscp/content/([0-9]+)/');
            }

            if (args[2] == 'backup') {
                // Component + Filearea + Revision
                return new RegExp('/mod_imscp/backup/([0-9]+)/');
            }
            return false;
        };

        /**
         * Returns an string to remove revision when matching the RegExp provided.
         *
         * @module mm.addons.mod_imscp
         * @ngdoc method
         * @name $mmaModImscpPluginfileHandler#getComponentRevisionReplace
         * @param {Array} args    Arguments of the pluginfile URL defining component and filearea at least.
         * @return {String}       String to remove revision when matching the RegExp provided.
         */
        self.getComponentRevisionReplace = function(args) {
            // Component + Filearea + Revision
            return '/mod_imscp/' + args[2] + '/0/';
        };

        return self;
    };

    return self;
});
