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
 * IMSCP index controller.
 *
 * @module mm.addons.mod_imscp
 * @ngdoc controller
 * @name mmaModImscpIndexCtrl
 */
.controller('mmaModImscpIndexCtrl', function($scope, $stateParams, $mmUtil, $mmCourseHelper, $mmaModImscp, mmaModImscpComponent,
            $log, $ionicPopover, $timeout, $q, $mmCourse, $mmApp, $mmText, $translate, $mmaModImscpPrefetchHandler) {
    $log = $log.getInstance('mmaModImscpIndexCtrl');

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        currentItem;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModImscpComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;
    $scope.refreshIcon = 'spinner';

    // Initialize empty previous/next to prevent showing arrows for an instant before they're hidden.
    $scope.previousItem = '';
    $scope.nextItem = '';

    function loadItem(itemId) {
        currentItem = itemId;
        $scope.previousItem = $mmaModImscp.getPreviousItem($scope.items, itemId);
        $scope.nextItem = $mmaModImscp.getNextItem($scope.items, itemId);
        var src = $mmaModImscp.getFileSrc(module, itemId);
        if ($scope.src && src.toString() == $scope.src.toString()) {
            // Re-loading same page. Set it to empty and then re-set the src in the next digest so it detects it has changed.
            $scope.src = '';
            $timeout(function() {
                $scope.src = src;
            });
        } else {
            $scope.src = src;
        }
    }

    function fetchContent(refresh) {
        var downloadFailed = false,
            promises = [];

        // Try to get the imscp data.
        promises.push($mmaModImscp.getImscp(courseId, module.id).then(function(imscp) {
            $scope.title = imscp.name || $scope.title;
            $scope.description = imscp.intro || $scope.description;
        }).catch(function() {
            // Ignore errors since this WS isn't available in some Moodle versions.
        }));

        // Download content. This function also loads module contents if needed.
        promises.push($mmaModImscpPrefetchHandler.download(module, courseId).catch(function() {
            // Mark download as failed but go on since the main files could have been downloaded.
            downloadFailed = true;

            if (!module.contents.length) {
                // Try to load module contents for offline usage.
                return $mmCourse.loadModuleContents(module, courseId).catch(function(error) {
                    // Error getting module contents, fail.
                    $mmUtil.showErrorModalDefault(error, 'mm.course.errorgetmodule', true);
                    return $q.reject();
                });
            }
        }));

        return $q.all(promises).then(function() {

            $scope.items = $mmaModImscp.createItemList(module.contents);
            if ($scope.items.length && typeof currentItem == 'undefined') {
                currentItem = $scope.items[0].href;
            }

            return $mmaModImscp.getIframeSrc(module).then(function() {
                // All data obtained, now fill the context menu.
                $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModImscpComponent);

                loadItem(currentItem);

                if (downloadFailed && $mmApp.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                }
            }).catch(function() {
                $mmUtil.showErrorModal('mma.mod_imscp.deploymenterror', true);
                return $q.reject();
            });
        }).finally(function() {
            $scope.loaded = true;
            $scope.refreshIcon = 'ion-refresh';
        });
    }

    $scope.doRefresh = function() {
        if ($scope.loaded) {
            $scope.refreshIcon = 'spinner';
            return $mmaModImscp.invalidateContent(module.id, courseId).finally(function() {
                return fetchContent(true);
            }).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    $scope.loadItem = function(itemId) {
        if (!itemId) {
            // Not valid, probably a category.
            return;
        }

        $scope.popover.hide();
        loadItem(itemId);
    };

    $scope.getNumberForPadding = function(n) {
        return new Array(n);
    };

    // Confirm and Remove action.
    $scope.removeFiles = function() {
        $mmCourseHelper.confirmAndRemove(module, courseId);
    };

    // Context Menu Prefetch action.
    $scope.prefetch = function() {
        $mmCourseHelper.contextMenuPrefetch($scope, module, courseId);
    };

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModImscpComponent, module.id);
    };

    $timeout(function() {
        $ionicPopover.fromTemplateUrl('addons/mod/imscp/templates/toc.html', {
            scope: $scope
        }).then(function(popover) {
            $scope.popover = popover;
        });
    });

    fetchContent().then(function() {
        $mmaModImscp.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    });
});
