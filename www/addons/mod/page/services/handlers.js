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

angular.module('mm.addons.mod_page')

/**
 * Mod page handlers.
 *
 * @module mm.addons.mod_page
 * @ngdoc service
 * @name $mmaModPageHandlers
 */
.factory('$mmaModPageHandlers', function($mmCourse, $mmaModPage, $mmEvents, $state, $mmSite, $mmCourseHelper, $mmUtil,
            $mmCoursePrefetchDelegate, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated, mmCoreEventPackageStatusChanged,
            mmaModPageComponent, $mmContentLinksHelper, $mmaModPagePrefetchHandler) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPageHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModPage.isPluginEnabled();
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
                $scope.icon = $mmCourse.getModuleIconSrc('page');
                $scope.class = 'mma-mod_page-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_page', {module: module, courseid: courseid});
                };

                function download(refresh) {
                    var dwnBtnHidden = downloadBtn.hidden,
                        rfrshBtnHidden = refreshBtn.hidden;

                    // Show spinner since this operation might take a while.
                    $scope.spinner = true;
                    downloadBtn.hidden = true;
                    refreshBtn.hidden = true;

                    // Get download size to ask for confirm if it's high.
                    $mmaModPagePrefetchHandler.getDownloadSize(module, courseid).then(function(size) {
                        $mmCourseHelper.prefetchModule($scope, $mmaModPagePrefetchHandler, module, size, refresh, courseid)
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
                    if (data.siteid === $mmSite.getId() && data.componentId === module.id && data.component === mmaModPageComponent) {
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
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPageHandlers#linksHandler
     */
    self.linksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModPage', 'page', $mmaModPage);

    /**
     * Plugin file handler.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPageHandlers#pluginfileHandler
     */
    self.pluginfileHandler = function() {
        var self = {};

        /**
         * Get the RegExp of the component and filearea described in the URL.
         *
         * @module mm.addons.mod_page
         * @ngdoc method
         * @name $mmaModPagePluginfileHandler#getComponentRevisionRegExp
         * @param {Array} args    Arguments of the pluginfile URL defining component and filearea at least.
         * @return {RegExp}       To match the revision.
         */
        self.getComponentRevisionRegExp = function(args) {
            // Check filearea.
            if (args[2] == 'content') {
                // Component + Filearea + Revision
                return new RegExp('/mod_page/content/([0-9]+)/');
            }
            return false;
        };

        /**
         * Returns an string to remove revision when matching the RegExp provided.
         *
         * @module mm.addons.mod_page
         * @ngdoc method
         * @name $mmaModPagePluginfileHandler#getComponentRevisionReplace
         * @param {Array} args    Arguments of the pluginfile URL defining component and filearea at least.
         * @return {String}       String to remove revision when matching the RegExp provided.
         */
        self.getComponentRevisionReplace = function(args) {
            // Component + Filearea + Revision
            return '/mod_page/content/0/';
        };

        return self;
    };

    return self;
});
