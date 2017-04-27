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

angular.module('mm.addons.mod_glossary')

/**
 * Mod glossary handlers.
 *
 * @module mm.addons.mod_glossary
 * @ngdoc service
 * @name $mmaModGlossaryHandlers
 */
.factory('$mmaModGlossaryHandlers', function($mmCourse, $mmaModGlossary, $state, $q, $mmContentLinksHelper, $mmUtil, $mmEvents,
            $mmCourseHelper, $mmaModGlossaryPrefetchHandler, mmaModGlossaryComponent, mmCoreEventPackageStatusChanged,
            $mmCoursePrefetchDelegate, mmCoreDownloading, mmCoreDownloaded, mmCoreNotDownloaded, mmCoreOutdated, $mmSite,
            $mmaModGlossarySync, $mmContentLinkHandlerFactory) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModGlossary.isPluginEnabled();
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
                            $scope.spinner = true; // Show spinner while invalidating.
                            $mmaModGlossary.invalidateContent(module.id, courseId).finally(function() {
                                download();
                            });
                        }
                    };

                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('glossary');
                $scope.class = 'mma-mod_glossary-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_glossary', {module: module, courseid: courseId});
                };

                function download() {

                    $scope.spinner = true; // Show spinner since this operation might take a while.

                    // Get download size to ask for confirm if it's high.
                    $mmaModGlossaryPrefetchHandler.getDownloadSize(module, courseId).then(function(size) {
                        $mmUtil.confirmDownloadSize(size).then(function() {
                            $mmaModGlossaryPrefetchHandler.prefetch(module, courseId).catch(function() {
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
                        $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                    });
                }

                // Show buttons according to module status.
                function showStatus(status) {
                    if (status) {
                        $scope.spinner = status === mmCoreDownloading;
                        downloadBtn.hidden = status !== mmCoreNotDownloaded;
                        refreshBtn.hidden = status !== mmCoreOutdated;
                        if (!$mmCoursePrefetchDelegate.canCheckUpdates()) {
                            // Always show refresh button if downloaded because it costs a lot to get timemodified.
                            refreshBtn.hidden = refreshBtn.hidden && status !== mmCoreDownloaded;
                        }
                    }
                }

                // Listen for changes on this module status.
                var statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
                    if (data.siteid === $mmSite.getId() && data.componentId === module.id &&
                            data.component === mmaModGlossaryComponent) {
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
     * Content links handler for glossary index.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModGlossary', 'glossary', $mmaModGlossary);

    /**
     * Content links handler for a glossary entry.
     * Match mod/glossary/showentry.php with a valid entry id.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHandlers#entryLinksHandler
     */
    self.entryLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/glossary\/showentry\.php.*([\&\?]eid=\d+)/, '$mmCourseDelegate_mmaModGlossary');

    // Check if the handler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.entryLinksHandler.isEnabled = function(siteId, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;
        return $mmContentLinksHelper.isModuleIndexEnabled($mmaModGlossary, siteId, courseId);
    };

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.entryLinksHandler.getActions = function(siteIds, url, params, courseId) {
        courseId = courseId || params.courseid || params.cid;

        return [{
            action: function(siteId) {
                var modal = $mmUtil.showModalLoading(),
                    entryId = parseInt(params.eid, 10),
                    promise;

                if (courseId) {
                    promise = $q.when(courseId);
                } else {
                    promise = getEntry(entryId, siteId).then(function(entry) {
                        return $mmCourseHelper.getModuleCourseIdByInstance(entry.glossaryid, 'glossary', siteId);
                    });
                }

                return promise.then(function(courseId) {
                    var stateParams = {
                        entryid: entryId,
                        cid: courseId
                    };
                    $mmContentLinksHelper.goInSite('site.mod_glossary-entry', stateParams, siteId);
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Get an entry.
     *
     * @param  {Number} entryId Entry ID.
     * @param  {String} siteId  Site ID.
     * @return {Promise}        Promise resolved with the entry.
     */
    function getEntry(entryId, siteId) {
        return $mmaModGlossary.getEntry(entryId, siteId).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_glossary.errorloadingentry', true);
            return $q.reject();
        });
    }

    /**
     * Synchronization handler.
     *
     * @module mm.addons.mod_glossary
     * @ngdoc method
     * @name $mmaModGlossaryHandlers#syncHandler
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
            return $mmaModGlossarySync.syncAllGlossaries(siteId);
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
