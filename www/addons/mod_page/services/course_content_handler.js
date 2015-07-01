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
 * Mod page course content handler.
 *
 * @module mm.addons.mod_page
 * @ngdoc service
 * @name $mmaModPageCourseContentHandler
 */
.factory('$mmaModPageCourseContentHandler', function($mmCourse, $mmaModPage, $mmFilepool, $mmEvents, $state) {
    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPageCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_page
     * @ngdoc method
     * @name $mmaModPageCourseContentHandler#isEnabled
     * @param {Object} module The module info.
     * @return {Function}
     */
    self.getController = function(module) {
        return function($scope) {
            var downloadBtn,
                refreshBtn,
                observers = {};

            function addObservers(eventNames) {
                angular.forEach(eventNames, function(e) {
                    observers[e] = $mmEvents.on(e, function(data) {
                        if (data.success && typeof observers[e] !== 'undefined') {
                            observers[e].off();
                            delete observers[e];
                        }
                        if (Object.keys(observers).length < 1) {
                            $scope.spinner = false;
                            downloadBtn.hidden = true;
                            refreshBtn.hidden = true;
                        }
                    });
                });
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

                    addObservers($mmaModPage.getFileEventNames(module));
                    $mmaModPage.prefetchContent(module);
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

                    $mmaModPage.invalidateContent(module.id).then(function() {
                        addObservers($mmaModPage.getFileEventNames(module));
                        $mmaModPage.prefetchContent(module);
                    });
                }
            };

            $scope.title = module.name;
            $scope.icon = $mmCourse.getModuleIconSrc('page');
            $scope.action = function(e) {
                $state.go('site.mod_page', {module: module});
            };
            $scope.buttons = [downloadBtn, refreshBtn];
            $scope.spinner = false;

            $mmaModPage.getFilesStatus(module).then(function(result) {
                if (result.status == $mmFilepool.FILENOTDOWNLOADED) {
                    downloadBtn.hidden = false;
                } else if (result.status == $mmFilepool.FILEDOWNLOADING) {
                    $scope.spinner = true;
                    addObservers(result.eventNames);
                } else if (result.status == $mmFilepool.FILEOUTDATED) {
                    refreshBtn.hidden = false;
                }
            });

            $scope.$on('$destroy', function() {
                angular.forEach(observers, function(observer) {
                    observer.off();
                });
            });
        };
    };

    return self;
});
