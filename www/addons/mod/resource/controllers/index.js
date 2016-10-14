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
        $mmText, $translate, mmaModResourceComponent, $mmaModResourcePrefetchHandler) {
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

    function fetchContent() {
        // Load module contents if needed.
        return $mmCourse.loadModuleContents(module, courseId).then(function() {
            if (!module.contents || !module.contents.length) {
                $mmUtil.showErrorModal('mma.mod_resource.errorwhileloadingthecontent', true);
                return $q.reject();
            }

            if ($mmaModResource.isDisplayedInIframe(module)) {
                $scope.mode = 'iframe';
                var downloadFailed = false;
                return $mmaModResourcePrefetchHandler.download(module).catch(function() {
                    // Mark download as failed but go on since the main files could have been downloaded.
                    downloadFailed = true;
                }).finally(function() {
                    $mmaModResource.getIframeSrc(module).then(function(src) {
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
                        $mmaModResource.logView(module.instance).then(function() {
                            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
                        });
                        if (downloadFailed && $mmApp.isOnline()) {
                            // We could load the main file but the download failed. Show error message.
                            $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                        }
                    }).catch(function() {
                        $mmUtil.showErrorModal('mma.mod_resource.errorwhileloadingthecontent', true);
                    }).finally(function() {
                        $scope.loaded = true;
                        $scope.refreshIcon = 'ion-refresh';
                    });
                });
            } else {
                $scope.loaded = true;
                $scope.refreshIcon = 'ion-refresh';
                $scope.mode = 'external';

                $scope.open = function() {
                    var modal = $mmUtil.showModalLoading();

                    $mmaModResource.openFile(module.contents, module.id).then(function() {
                        $mmaModResource.logView(module.instance).then(function() {
                            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
                        });
                    }).catch(function(error) {
                        if (error && typeof error == 'string') {
                            $mmUtil.showErrorModal(error);
                        } else {
                            $mmUtil.showErrorModal('mma.mod_resource.errorwhileloadingthecontent', true);
                        }
                    }).finally(function() {
                        modal.dismiss();
                    });
                };
            }
        });
    }

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false,
                    mmaModResourceComponent, module.id);
    };

    $scope.doRefresh = function() {
        if ($scope.loaded) {
            $scope.refreshIcon = 'spinner';
            return $mmaModResourcePrefetchHandler.invalidateContent(module.id).then(function() {
                return fetchContent();
            }).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    fetchContent();
});
