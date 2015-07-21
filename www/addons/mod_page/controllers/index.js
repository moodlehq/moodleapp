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
.controller('mmaModPageIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModPage, $mmSite, $log, $mmApp,
            mmaModPageComponent) {
    $log = $log.getInstance('mmaModPageIndexCtrl');

    var module = $stateParams.module || {};

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModPageComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;

    function fetchContent() {
        var downloadFailed = false;
        // Prefetch the content so ALL files are downloaded, not just the ones shown in the page.
        return $mmaModPage.downloadAllContent(module).catch(function(err) {
            // Mark download as failed but go on since the main files could have been downloaded.
            downloadFailed = true;
        }).finally(function() {
            return $mmaModPage.getPageHtml(module.contents, module.id).then(function(content) {
                $scope.content = content;

                if (downloadFailed && $mmApp.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    $mmUtil.showErrorModal('mm.core.errordownloadingsomefiles', true);
                }
            }).catch(function() {
                $mmUtil.showErrorModal('mma.mod_page.errorwhileloadingthepage', true);
            }).finally(function() {
                $scope.loaded = true;
            });
        });
    }

    $scope.doRefresh = function() {
        $mmaModPage.invalidateContent(module.id).then(function() {
            return fetchContent();
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    fetchContent().then(function() {
        if (module.instance) {
            $mmSite.write('mod_page_view_page', {
                urlid: module.instance
            });
        }
    });
});
