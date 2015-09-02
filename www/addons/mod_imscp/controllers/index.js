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
.controller('mmaModImscpIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModImscp, $log, mmaModImscpComponent,
            $ionicPopover, $timeout, $q, $mmCourse, $mmApp) {
    $log = $log.getInstance('mmaModImscpIndexCtrl');

    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        currentItem;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModImscpComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;

    // Initialize empty previous/next to prevent showing arrows for an instant before they're hidden.
    $scope.previousItem = '';
    $scope.nextItem = '';

    $scope.items = $mmaModImscp.createItemList(module.contents);
    currentItem = $scope.items[0].href;

    function loadItem(itemId) {
        currentItem = itemId;
        $scope.previousItem = $mmaModImscp.getPreviousItem($scope.items, itemId);
        $scope.nextItem = $mmaModImscp.getNextItem($scope.items, itemId);
        var src = $mmaModImscp.getFileSrc(module, itemId);
        if (src === $scope.src) {
            // Re-loading same page. Set it to empty and then re-set the src in the next digest so it detects it has changed.
            $scope.src = '';
            $timeout(function() {
                $scope.src = src;
            });
        } else {
            $scope.src = src;
        }
    }

    function fetchContent() {
        if (module.contents) {
            var downloadFailed = false;
            return $mmaModImscp.downloadAllContent(module).catch(function() {
                // Mark download as failed but go on since the main files could have been downloaded.
                downloadFailed = true;
            }).finally(function() {
                return $mmaModImscp.getIframeSrc(module).then(function() {
                    loadItem(currentItem);

                    if (downloadFailed && $mmApp.isOnline()) {
                        // We could load the main file but the download failed. Show error message.
                        $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                    }
                }).catch(function() {
                    $mmUtil.showErrorModal('mma.mod_imscp.deploymenterror', true);
                    return $q.reject();
                }).finally(function() {
                    $scope.loaded = true;
                });
            });
        } else {
            $mmUtil.showErrorModal('mma.mod_imscp.deploymenterror', true);
            return $q.reject();
        }
    }

    $scope.doRefresh = function() {
        $mmaModImscp.invalidateContent(module.id).then(function() {
            return fetchContent();
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.loadItem = function(itemId) {
        $scope.popover.hide();
        loadItem(itemId);
    };

    $scope.getNumberForPadding = function(n) {
        return new Array(n);
    };

    $ionicPopover.fromTemplateUrl('addons/mod_imscp/templates/toc.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });

    fetchContent().then(function() {
        $mmaModImscp.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    });
});
