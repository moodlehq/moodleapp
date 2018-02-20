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

angular.module('mm.addons.mod_data')

/**
 * Mod data handlers.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataHandlers
 */
.factory('$mmaModDataHandlers', function($mmCourse, $mmaModData, $state, $mmContentLinksHelper, $mmUtil, $mmEvents, $mmSite, $q,
        mmaModDataComponent, $mmaModDataPrefetchHandler, mmCoreDownloading, mmCoreNotDownloaded, $mmContentLinkHandlerFactory,
        mmCoreEventPackageStatusChanged, mmCoreOutdated, $mmCoursePrefetchDelegate, mmaModDataEventEntryChanged, $translate,
        $mmaModDataSync) {
    var self = {};

    /**
     * Course content handler.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHandlers#courseContent
     */
    self.courseContent = function() {

        var self = {};

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean}
         */
        self.isEnabled = function() {
            return $mmaModData.isPluginEnabled();
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
                            $mmaModData.invalidateContent(module.id, courseId).finally(function() {
                                download();
                            });
                        }
                    };

                $scope.title = module.name;
                $scope.icon = $mmCourse.getModuleIconSrc('data');
                $scope.class = 'mma-mod_data-handler';
                $scope.buttons = [downloadBtn, refreshBtn];
                $scope.spinner = true; // Show spinner while calculating status.

                $scope.action = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    $state.go('site.mod_data', {module: module, moduleid: module.id, courseid: courseId});
                };

                function download() {

                    $scope.spinner = true; // Show spinner since this operation might take a while.
                    // We need to call getDownloadSize, the package might have been updated.
                    $mmaModDataPrefetchHandler.getDownloadSize(module, courseId).then(function(size) {
                        $mmUtil.confirmDownloadSize(size).then(function() {
                            return $mmaModDataPrefetchHandler.prefetch(module, courseId).catch(function(error) {
                                if (!$scope.$$destroyed) {
                                    $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                                    return $q.reject();
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
                    }
                }

                // Listen for changes on this module status.
                var statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
                    if (data.siteid === $mmSite.getId() && data.componentId === module.id &&
                            data.component === mmaModDataComponent) {
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
     * Content links handler for module index page.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHandlers#indexLinksHandler
     */
    self.indexLinksHandler = $mmContentLinksHelper.createModuleIndexLinkHandler('mmaModData', 'data', $mmaModData);


    /**
     * Content links handler for database show entry.
     * Match mod/data/view.php?d=6&rid=5 with a valid data id and entryid.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHandlers#showEntryLinksHandler
     */
    self.showEntryLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/data\/view\.php.*([\?\&](d|rid|page|group|mode)=\d+)/, '$mmCourseDelegate_mmaModData');

    // Check if the showEntryLinksHandler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.showEntryLinksHandler.isEnabled = $mmaModData.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.showEntryLinksHandler.getActions = function(siteIds, url, params, courseId) {
        if (typeof params.d == 'undefined') {
            // Id not defined. Cannot treat the URL.
            return false;
        }

        if ((!params.mode || params.mode != "single") && typeof params.rid == 'undefined') {
            return false;
        }

        return [{
            action: function(siteId) {
                var modal = $mmUtil.showModalLoading(),
                    dataId = parseInt(params.d, 10),
                    rId = parseInt(params.rid, 10) || false,
                    group = parseInt(params.group, 10) || false,
                    page = parseInt(params.page, 10) || false;

                return $mmCourse.getModuleBasicInfoByInstance(dataId, 'data', siteId).then(function(module) {
                    var stateParams = {
                        moduleid: module.id,
                        module: module,
                        courseid: module.course
                    };

                    if (group) {
                        stateParams.group = group;
                    }

                    if (params.mode && params.mode == "single") {
                        stateParams.page = page || 1;
                    } else if (rId) {
                        stateParams.entryid = rId;
                    }


                    return $mmContentLinksHelper.goInSite('site.mod_data-entry', stateParams, siteId);
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Convenience function to help get courseId.
     * @param {Number} dataId   Database Id.
     * @param {Number} siteId   Site Id, if not set, current site will be used.
     * @param {Number} courseId Course Id if already set.
     * @return {Promise}        Resolved with course Id when done.
     */
    function getActivityCourseIdIfNotSet(dataId, siteId, courseId) {
        if (courseId) {
            return $q.when(courseId);
        }

        return $mmCourse.getModuleBasicInfoByInstance(dataId, 'data', siteId).then(function(module) {
            return module.course;
        });
    }

    /**
     * Content links handler for database approve/disapprove entry.
     * Match mod/data/view.php?d=6&approve=5 with a valid data id and entryid.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHandlers#approveEntryLinksHandler
     */
    self.approveEntryLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/data\/view\.php.*([\?\&](d|approve|disapprove)=\d+)/, '$mmCourseDelegate_mmaModData');

    // Check if the approveEntryLinksHandler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.approveEntryLinksHandler.isEnabled = $mmaModData.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.approveEntryLinksHandler.getActions = function(siteIds, url, params, courseId) {
        if (typeof params.d == 'undefined' || (typeof params.approve == 'undefined' && typeof params.disapprove == 'undefined')) {
            // Required fields not defined. Cannot treat the URL.
            return false;
        }

        return [{
            action: function(siteId) {
                var modal = $mmUtil.showModalLoading(),
                    dataId = parseInt(params.d, 10),
                    entryId = parseInt(params.approve, 10) || parseInt(params.disapprove, 10),
                    approve = parseInt(params.approve, 10) ? true : false;

                return getActivityCourseIdIfNotSet(dataId, siteId, courseId).then(function(cId) {
                    courseId = cId;

                    // Approve/disapprove entry.
                    return $mmaModData.approveEntry(dataId, entryId, approve, courseId, siteId).catch(function(message) {
                        modal.dismiss();
                        $mmUtil.showErrorModalDefault(message, 'mma.mod_data.errorapproving', true);

                        return $q.reject();
                    });
                }).then(function() {
                    var promises = [];
                    promises.push($mmaModData.invalidateEntryData(dataId, entryId, siteId));
                    promises.push($mmaModData.invalidateEntriesData(dataId, siteId));

                    return $q.all(promises);
                }).then(function() {
                    $mmEvents.trigger(mmaModDataEventEntryChanged, {dataId: dataId, entryId: entryId, siteId: siteId});

                    modal.dismiss();
                    $mmUtil.showToast(approve ? 'mma.mod_data.recordapproved' : 'mma.mod_data.recorddisapproved', true, 3000);
                }).finally(function() {
                    // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Content links handler for database delete entry.
     * Match mod/data/view.php?d=6&delete=5 with a valid data id and entryid.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHandlers#deleteEntryLinksHandler
     */
    self.deleteEntryLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/data\/view\.php.*([\?\&](d|delete)=\d+)/, '$mmCourseDelegate_mmaModData');

    // Check if the deleteEntryLinksHandler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.deleteEntryLinksHandler.isEnabled = $mmaModData.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.deleteEntryLinksHandler.getActions = function(siteIds, url, params, courseId) {
        if (typeof params.d == 'undefined' || typeof params.delete == 'undefined') {
            // Required fields not defined. Cannot treat the URL.
            return false;
        }

        return [{
            action: function(siteId) {
                // Confirm before delete.
                return $mmUtil.showConfirm($translate.instant('mma.mod_data.confirmdeleterecord')).then(function() {
                    var modal = $mmUtil.showModalLoading(),
                        dataId = parseInt(params.d, 10),
                        entryId = parseInt(params.delete, 10);

                    return getActivityCourseIdIfNotSet(dataId, siteId, courseId).then(function(cId) {
                        courseId = cId;

                        // Delete entry.
                        return $mmaModData.deleteEntry(dataId, entryId, courseId, siteId, true).catch(function(message) {
                            modal.dismiss();
                            $mmUtil.showErrorModalDefault(message, 'mma.mod_data.errordeleting', true);

                            return $q.reject();
                        });
                    }).then(function() {
                        var promises = [];
                        promises.push($mmaModData.invalidateEntryData(dataId, entryId, siteId));
                        promises.push($mmaModData.invalidateEntriesData(dataId, siteId));

                        return $q.all(promises);
                    }).then(function() {
                        $mmEvents.trigger(mmaModDataEventEntryChanged, {dataId: dataId, entryId: entryId, siteId: siteId,
                                deleted: true});

                        modal.dismiss();
                        $mmUtil.showToast('mma.mod_data.recorddeleted', true, 3000);
                    }).finally(function() {
                        // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
                        modal.dismiss();
                    });
                });
            }
        }];
    };

    /**
     * Content links handler for database add or edit entry.
     * Match mod/data/edit.php?d=6&rid=6 with a valid data and optional record id.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHandlers#editEntryLinksHandler
     */
    self.editEntryLinksHandler = $mmContentLinkHandlerFactory.createChild(
                /\/mod\/data\/edit\.php.*([\?\&](d|rid)=\d+)/, '$mmCourseDelegate_mmaModData');

    // Check if the showEntryLinksHandler is enabled for a certain site. See $mmContentLinkHandlerFactory#isEnabled.
    self.editEntryLinksHandler.isEnabled = $mmaModData.isPluginEnabled;

    // Get actions to perform with the link. See $mmContentLinkHandlerFactory#getActions.
    self.editEntryLinksHandler.getActions = function(siteIds, url, params, courseId) {
        if (typeof params.d == 'undefined') {
            // Id not defined. Cannot treat the URL.
            return false;
        }

        return [{
            action: function(siteId) {
                var modal = $mmUtil.showModalLoading(),
                    dataId = parseInt(params.d, 10),
                    rId = parseInt(params.rid, 10) || false;

                return $mmCourse.getModuleBasicInfoByInstance(dataId, 'data', siteId).then(function(module) {
                    var stateParams = {
                        moduleid: module.id,
                        module: module,
                        courseid: module.course
                    };

                    if (rId) {
                        stateParams.entryid = rId;
                    }

                    return $mmContentLinksHelper.goInSite('site.mod_data-edit', stateParams, siteId);
                }).finally(function() {
                    modal.dismiss();
                });
            }
        }];
    };

    /**
     * Synchronization handler.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHandlers#syncHandler
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
            return $mmaModDataSync.syncAllDatabases(siteId);
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
