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

angular.module('mm.addons.mod_regularvideo')

/**
 * regularvideo index controller.
 *
 * @module mm.addons.mod_regularvideo
 * @ngdoc controller
 * @name mmaModregularvideoIndexCtrl
 */
.controller('mmaModregularvideoIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModregularvideo, $mmCourse, $q, $log, $mmApp,
            mmaModregularvideoComponent, $mmText, $translate, $mmaModregularvideoPrefetchHandler) {
    $log = $log.getInstance('mmaModregularvideoIndexCtrl');

    var module = $stateParams.module || {},
        courseid = $stateParams.courseid;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModregularvideoComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;
    $scope.refreshIcon = 'spinner';

    function fetchContent() {
        var downloadFailed = false;
        // Prefetch the content so ALL files are downloaded, not just the ones shown in the regularvideo.
        return $mmaModregularvideoPrefetchHandler.download(module).catch(function(err) {
            // Mark download as failed but go on since the main files could have been downloaded.
            downloadFailed = true;
        }).then(function() {
            return $mmaModregularvideo.getregularvideoHtml(module.contents, module.id).then(function(content) {
                $scope.content = content;

                if (downloadFailed && $mmApp.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                }
            }).catch(function() {
                $mmUtil.showErrorModal('mma.mod_regularvideo.errorwhileloadingtheregularvideo', true);
                return $q.reject();
            }).finally(function() {
                $scope.loaded = true;
                $scope.refreshIcon = 'ion-refresh';
            });
        });
    }

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModregularvideoComponent, module.id);
    };

    $scope.doRefresh = function() {
        if ($scope.loaded) {
            $scope.refreshIcon = 'spinner';
            return $mmaModregularvideoPrefetchHandler.invalidateContent(module.id).then(function() {
                return fetchContent();
            }).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    fetchContent().then(function() {
        $mmaModregularvideo.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    });
});
