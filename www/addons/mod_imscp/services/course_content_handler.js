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
 * Mod IMSCP course content handler.
 *
 * @module mm.addons.mod_imscp
 * @ngdoc service
 * @name $mmaModImscpCourseContentHandler
 */
.factory('$mmaModImscpCourseContentHandler', function($mmCourse, $mmaModImscp, $mmFilepool, $mmEvents, $state, $mmSite, $mmUtil,
            mmCoreEventQueueEmpty) {
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
        var version = $mmSite.getInfo().version;
        // Require Moodle 2.9.
        return version && (parseInt(version) >= 2015051100) && $mmSite.canDownloadFiles();
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
                refreshBtn,
                observers = {},
                queueObserver,
                previousState,
                siteid = $mmSite.getId(),
                revision = $mmCourse.getRevisionFromContents(module.contents),
                timemodified = $mmCourse.getTimemodifiedFromContents(module.contents);

            // Add queue observer to clear observers when filepool queue is empty. Needed because sometimes when "restoring"
            // downloading the spinner was shown forever, probably because a file download finished before observer was set.
            function addQueueObserver() {
                queueObserver = $mmEvents.on(mmCoreEventQueueEmpty, function() {
                    // Queue is empty. Clear observers.
                    if (queueObserver) {
                        queueObserver.off();
                    }
                    if (Object.keys(observers).length) {
                        clearObservers();
                        setDownloaded();
                    }
                    delete queueObserver;
                });
            }

            // Add observers to monitor file downloads.
            function addObservers(eventNames, isOpeningModule) {
                angular.forEach(eventNames, function(e) {
                    if (typeof observers[e] == 'undefined') {
                        observers[e] = $mmEvents.on(e, function(data) {
                            if (data.success) {
                                // Download success. Disable this observer and check if all files have been downloaded.
                                if (typeof observers[e] !== 'undefined') {
                                    observers[e].off();
                                    delete observers[e];
                                }
                                if (Object.keys(observers).length < 1) {
                                    setDownloaded();
                                }
                            } else if (data.success === false) {
                                // A download failed. Clear observers, show error message and set previous state.
                                clearObservers();
                                $mmCourse.storeModuleStatus(siteid, module.id, previousState, revision, timemodified);
                                $scope.spinner = false;
                                if (previousState === $mmFilepool.FILENOTDOWNLOADED) {
                                    downloadBtn.hidden = false;
                                } else {
                                    refreshBtn.hidden = false;
                                }
                                // Don't show error message if state left or the module is being opened.
                                if (!$scope.$$destroyed && !isOpeningModule) {
                                    $mmUtil.showErrorModal('mm.core.errordownloading', true);
                                }
                            }
                        });
                    }
                });
            }

            // Disable file download observers.
            function clearObservers() {
                angular.forEach(observers, function(observer) {
                    observer.off();
                });
                observers = {};
            }

            // Set module as 'downloaded', hiding icons and storing its state.
            function setDownloaded() {
                $scope.spinner = false;
                downloadBtn.hidden = true;
                refreshBtn.hidden = true;
                // Store module as downloaded.
                $mmCourse.storeModuleStatus(siteid, module.id, $mmFilepool.FILEDOWNLOADED, revision, timemodified);
            }

            // Show downloading spinner and hide other icons.
            function showDownloading() {
                downloadBtn.hidden = true;
                refreshBtn.hidden = true;
                $scope.spinner = true;
            }

            downloadBtn = {
                hidden: true,
                icon: 'ion-ios-cloud-download',
                label: 'mm.core.download',
                action: function(e) {
                    var eventNames;

                    e.preventDefault();
                    e.stopPropagation();

                    showDownloading();

                    $mmaModImscp.getFileEventNames(module).then(function(eventNames) {
                        previousState = $mmFilepool.FILENOTDOWNLOADED;
                        addObservers(eventNames, false);
                        $mmaModImscp.prefetchContent(module);
                        // Store module as dowloading.
                        $mmCourse.storeModuleStatus(siteid, module.id, $mmFilepool.FILEDOWNLOADING, revision, timemodified);
                        addQueueObserver();
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

                    showDownloading();

                    $mmaModImscp.invalidateContent(module.id).then(function() {
                        $mmaModImscp.getFileEventNames(module).then(function(eventNames) {
                            previousState = $mmFilepool.FILEOUTDATED;
                            addObservers(eventNames, false);
                            $mmaModImscp.prefetchContent(module);
                            // Store module as dowloading.
                            $mmCourse.storeModuleStatus(siteid, module.id, $mmFilepool.FILEDOWNLOADING, revision, timemodified);
                            addQueueObserver();
                        });
                    });
                }
            };

            $scope.title = module.name;
            $scope.icon = $mmCourse.getModuleIconSrc('imscp');
            $scope.buttons = [downloadBtn, refreshBtn];
            $scope.spinner = false;

            $scope.action = function(e) {
                if (!(downloadBtn.hidden && refreshBtn.hidden)) {
                    // Refresh or download icon shown. Let's add observers to monitor download.
                    previousState = downloadBtn.hidden ? $mmFilepool.FILEOUTDATED : $mmFilepool.FILENOTDOWNLOADED;
                    $mmaModImscp.getFileEventNames(module).then(function(eventNames) {
                        addObservers(eventNames, true);
                    });
                    $mmCourse.storeModuleStatus(siteid, module.id, $mmFilepool.FILEDOWNLOADING, revision, timemodified);
                    showDownloading();
                }
                $state.go('site.mod_imscp', {module: module, courseid: courseid});
            };

            // Check current status to decide which icon should be shown.
            $mmCourse.getModuleStatus(siteid, module.id, revision, timemodified).then(function(status) {
                if (status == $mmFilepool.FILENOTDOWNLOADED) {
                    downloadBtn.hidden = false;
                } else if (status == $mmFilepool.FILEDOWNLOADING) {
                    $scope.spinner = true;
                    $mmaModImscp.getDownloadingFilesEventNames(module).then(function(eventNames) {
                        if (eventNames.length) {
                            $mmCourse.getModulePreviousStatus(siteid, module.id).then(function(previous) {
                                previousState = previous;
                            });
                            addObservers(eventNames, false);
                            addQueueObserver();
                        } else {
                            // Weird case, state downloading but no files being downloaded. Set state to previousState.
                            $mmCourse.getModulePreviousStatus(siteid, module.id).then(function(previous) {
                                $scope.spinner = false;
                                if (previous === $mmFilepool.FILENOTDOWNLOADED) {
                                    downloadBtn.hidden = false;
                                } else if (previous === $mmFilepool.FILEOUTDATED) {
                                    refreshBtn.hidden = false;
                                }
                                $mmCourse.storeModuleStatus(siteid, module.id, previous, revision, timemodified);
                            });
                        }
                    });
                } else if (status == $mmFilepool.FILEOUTDATED) {
                    refreshBtn.hidden = false;
                }
            });
        };
    };

    return self;
});
