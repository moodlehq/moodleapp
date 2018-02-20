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

angular.module('mm.addons.mod_resource')

/**
 * Resource index controller.
 *
 * @module mm.addons.mod_resource
 * @ngdoc controller
 * @name mmaModResourceIndexCtrl
 */
.controller('mmaModResourceIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModResource, $log, $mmApp, $mmCourse, $timeout,
        $mmText, $translate, mmaModResourceComponent, $mmaModResourcePrefetchHandler, $mmCourseHelper, $mmaModResourceHelper, $q) {
    $log = $log.getInstance('mmaModResourceIndexCtrl');

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.externalUrl = module.url;
    $scope.mode = false;
    $scope.loaded = false;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModResourceComponent;
    $scope.componentId = module.id;
    $scope.canGetResource = $mmaModResource.isGetResourceWSAvailable();

    function fetchContent(refresh) {
        // Load module contents if needed. Passing refresh is needed to force reloading contents.
        return $mmCourse.loadModuleContents(module, courseId, null, false, refresh).then(function() {
            if (!module.contents || !module.contents.length) {
                return $q.reject();
            }

            // Get the resource instance to get the latest name/description and to know if it's embedded.
            if ($scope.canGetResource) {
                return $mmaModResource.getResourceData(courseId, module.id).catch(function() {
                    // Ignore errors.
                });
            } else {
                return $mmCourse.getModule(module.id, courseId).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function(mod) {
            if (mod) {
                $scope.title = mod.name;
                $scope.description = mod.intro || mod.description;
            }

            if ($mmaModResource.isDisplayedInIframe(module)) {
                $scope.mode = 'iframe';

                var downloadFailed = false;
                return $mmaModResourcePrefetchHandler.download(module).catch(function() {
                    // Mark download as failed but go on since the main files could have been downloaded.
                    downloadFailed = true;
                }).then(function() {
                    return $mmaModResource.getIframeSrc(module).then(function(src) {
                        if ($scope.src && src.toString() == $scope.src.toString()) {
                            // Re-loading same page. Set it to empty and then re-set the src
                            // in the next digest so it detects it has changed.
                            $scope.src = '';
                            $timeout(function() {
                                $scope.src = src;
                            });
                        } else {
                            $scope.src = src;
                        }

                        if (downloadFailed && $mmApp.isOnline()) {
                            // We could load the main file but the download failed. Show error message.
                            $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                        }
                    });
                });
            } else if ($mmaModResource.isDisplayedEmbedded(module, mod && mod.display)) {
                $scope.mode = 'embedded';
                return $mmaModResource.getEmbeddedHtml(module).then(function(html) {
                    $scope.content = html;
                });
            } else {
                $scope.mode = 'external';

                $scope.open = function() {
                    $mmaModResourceHelper.openFile(module, courseId);
                };
            }
        }).then(function() {
            // All data obtained, now fill the context menu.
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModResourceComponent);
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_resource.errorwhileloadingthecontent', true);
            return $q.reject();
        }).finally(function() {
            $scope.loaded = true;
            $scope.refreshIcon = 'ion-refresh';
        });
    }

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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false,
                    mmaModResourceComponent, module.id);
    };

    $scope.doRefresh = function() {
        if ($scope.loaded) {
            $scope.refreshIcon = 'spinner';
            return $mmaModResource.invalidateContent(module.id, courseId).then(function() {
                return fetchContent(true);
            }).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    fetchContent().then(function() {
        $mmaModResource.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    });
});
