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
 * Page index controller.
 *
 * @module mm.addons.mod_page
 * @ngdoc controller
 * @name mmaModPageIndexCtrl
 */
.controller('mmaModPageIndexCtrl', function($scope, $stateParams, $translate, $mmUtil, $mmaModPage, $mmCourse, $q, $log, $mmApp,
            mmaModPageComponent, $mmText, $mmaModPagePrefetchHandler, $mmCourseHelper) {
    $log = $log.getInstance('mmaModPageIndexCtrl');

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModPageComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;
    $scope.refreshIcon = 'spinner';

    function fetchContent(refresh) {
        // Load module contents if needed.
        return $mmCourse.loadModuleContents(module, courseId).then(function() {
            var downloadFailed = false;
            // Prefetch the content so ALL files are downloaded, not just the ones shown in the page.
            return $mmaModPagePrefetchHandler.download(module).catch(function() {
                // Mark download as failed but go on since the main files could have been downloaded.
                downloadFailed = true;
            }).then(function() {
                return $mmaModPage.getPageHtml(module.contents, module.id).then(function(content) {
                    // All data obtained, now fill the context menu.
                    $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModPageComponent);

                    $scope.content = content;

                    if (downloadFailed && $mmApp.isOnline()) {
                        // We could load the main file but the download failed. Show error message.
                        $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                    }
                });
            });
        }).catch(function() {
            $mmUtil.showErrorModal('mma.mod_page.errorwhileloadingthepage', true);
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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModPageComponent, module.id);
    };

    $scope.doRefresh = function() {
        if ($scope.loaded) {
            $scope.refreshIcon = 'spinner';
            return $mmaModPagePrefetchHandler.invalidateContent(module.id).then(function() {
                return fetchContent(true);
            }).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    fetchContent().then(function() {
        $mmaModPage.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    });
});
