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
.factory('$mmaModBookCourseContentHandler', function($mmCourse, $mmaModBook, $mmFilepool, $mmEvents, $state, $mmSite,
            mmCoreEventQueueEmpty) {
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
        var version = $mmSite.getInfo().version;
        // Require Moodle 2.9.
        return version && (parseInt(version) >= 2015051100);
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_book
     * @ngdoc method
     * @name $mmaModBookCourseContentHandler#getController
     * @param {Object} module The module info.
     * @return {Function}
     */
    self.getController = function(module) {
        return function($scope) {
            var downloadBtn,
                refreshBtn,
                observers = {},
                queueObserver,
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

            function addObservers(eventNames) {
                angular.forEach(eventNames, function(e) {
                    observers[e] = $mmEvents.on(e, function(data) {
                        if (data.success && typeof observers[e] !== 'undefined') {
                            observers[e].off();
                            delete observers[e];
                        }
                        if (Object.keys(observers).length < 1) {
                            setDownloaded();
                        }
                    });
                });
            }

            function clearObservers() {
                angular.forEach(observers, function(observer) {
                    observer.off();
                });
                observers = {};
            }

            function setDownloaded() {
                $scope.spinner = false;
                downloadBtn.hidden = true;
                refreshBtn.hidden = false; // Always show refresh button because revision and timemodified are not reliable.
                // Store module as downloaded.
                $mmCourse.storeModuleStatus(siteid, module.id, $mmFilepool.FILEDOWNLOADED, revision, timemodified);
            }

            downloadBtn = {
                hidden: true,
                icon: 'ion-ios-cloud-download',
                action: function(e) {
                    var eventNames;

                    e.preventDefault();
                    e.stopPropagation();

                    downloadBtn.hidden = true;
                    refreshBtn.hidden = true;
                    $scope.spinner = true;

                    $mmaModBook.getFileEventNames(module).then(function(eventNames) {
                        addObservers(eventNames);
                        $mmaModBook.prefetchContent(module);
                        // Store module as dowloading.
                        $mmCourse.storeModuleStatus(siteid, module.id, $mmFilepool.FILEDOWNLOADING, revision, timemodified);
                        addQueueObserver();
                    });
                }
            };

            refreshBtn = {
                icon: 'ion-android-refresh',
                hidden: true,
                action: function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    downloadBtn.hidden = true;
                    refreshBtn.hidden = true;
                    $scope.spinner = true;

                    $mmaModBook.invalidateContent(module.id).then(function() {
                        $mmaModBook.getFileEventNames(module).then(function(eventNames) {
                            addObservers(eventNames);
                            $mmaModBook.prefetchContent(module);
                            // Store module as dowloading.
                            $mmCourse.storeModuleStatus(siteid, module.id, $mmFilepool.FILEDOWNLOADING, revision, timemodified);
                            addQueueObserver();
                        });
                    });
                }
            };

            $scope.title = module.name;
            $scope.icon = $mmCourse.getModuleIconSrc('book');
            $scope.action = function(e) {
                $state.go('site.mod_book', {module: module});
            };
            $scope.buttons = [downloadBtn, refreshBtn];
            $scope.spinner = false;

            $mmCourse.getModuleStatus(siteid, module.id, revision, timemodified).then(function(status) {
                if (status == $mmFilepool.FILENOTDOWNLOADED) {
                    downloadBtn.hidden = false;
                } else if (status == $mmFilepool.FILEDOWNLOADING) {
                    $scope.spinner = true;
                    $mmaModBook.getDownloadedFilesEventNames(module).then(function(eventNames) {
                        if (eventNames.length) {
                            addObservers(eventNames);
                            addQueueObserver();
                        } else {
                            // No files being downloaded. Set state to 'downloaded' or 'outdated'.
                            $mmCourse.isModuleOutdated(siteid, module.id, revision, timemodified).then(function(outdated) {
                                $scope.spinner = false;
                                var status;
                                if (outdated) {
                                    status = $mmFilepool.FILEOUTDATED;
                                    downloadBtn.hidden = false;
                                } else {
                                    status = $mmFilepool.FILEDOWNLOADED;
                                }
                                $mmCourse.storeModuleStatus(siteid, module.id, status, revision, timemodified);
                            });
                        }
                    });
                } else {
                    // Show refresh button also if FILEDOWNLOADED because revision and timemodified are not reliable.
                    refreshBtn.hidden = false;
                }
            });

            $scope.$on('$destroy', function() {
                clearObservers();
            });
        };
    };

    return self;
});
