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

angular.module('mm.addons.mod_forum')

/**
 * Mod forum handlers.
 *
 * @module mm.addons.mod_forum
 * @ngdoc service
 * @name $mmaModForumHandlers
 */
.factory('$mmaModForumHandlers', function($mmCourse, $mmaModForum, $state, $mmUtil, $mmContentLinksHelper, $mmEvents, $mmSite,
            $mmaModForumPrefetchHandler, $mmCoursePrefetchDelegate, mmCoreDownloading, mmCoreNotDownloaded, mmCoreOutdated,
            mmaModForumComponent, mmCoreEventPackageStatusChanged, $mmaModForumSync, $mmContentLinkHandlerFactory) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHandlers#courseContent
     */
    self.courseContent = function() {
        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @module mm.addons.mod_forum
         * @ngdoc method
         * @name $mmaModForumCourseContentHandler#isEnabled
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModForum.isPluginEnabled();
        };

        /**
         * Get the controller.
         *
         * @module mm.addons.mod_forum
         * @ngdoc method
         * @name $mmaModForumCourseContentHandler#isEnabled
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

                            $scope.spinner = true; // Show spinner since invalidateContent might take a while.
                            $mmaModForum.invalidateContent(module.id, courseId).finally(function() {
                                download();
                            });
                        }
                    };

                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('forum');
                $scope.class = 'mma-mod_forum-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_forum', {module: module, courseid: courseId});
                };

                function download() {

                    $scope.spinner = true; // Show spinner since this operation might take a while.

                    // Get download size to ask for confirm if it's high.
                    $mmaModForumPrefetchHandler.getDownloadSize(module, courseId).then(function(size) {
                        $mmUtil.confirmDownloadSize(size).then(function() {
                            $mmaModForumPrefetchHandler.prefetch(module, courseId).catch(function() {
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
                            data.component === mmaModForumComponent) {
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
     * Content links handler for forum index.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModForum', 'forum', $mmaModForum);

    /**
     * Content links handler for a forum discussion.
     * Match mod/forum/discuss.php with a valid discussion number.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHandlers#discussionLinksHandler
     */
    self.discussionLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/forum\/discuss\.php.*([\&\?]d=\d+)/, '$mmCourseDelegate_mmaModForum');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.discussionLinksHandler.isEnabled = $mmaModForum.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.discussionLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        return [{
            action: function(siteId) {
                var stateParams = {
                    discussionid: parseInt(params.d, 10),
                    cid: courseId ? parseInt(courseId, 10) : courseId
                };
                $mmContentLinksHelper.goInSite('site.mod_forum-discussion', stateParams, siteId);
            }
        }];
    };

    /**
     * Synchronization handler.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumHandlers#syncHandler
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
            return $mmaModForumSync.syncAllForums(siteId);
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
