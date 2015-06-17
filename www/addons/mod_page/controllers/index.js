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
.controller('mmaModPageIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModPage, $mmSite, $log, mmaModPageComponent) {
    $log = $log.getInstance('mmaModPageIndexCtrl');

    var module = $stateParams.module || {};

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModPageComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;
    $scope.loaded = false;

    function fetchContent() {
        return $mmaModPage.getPageHtml(module.contents, module.id).then(function(content) {
            $scope.content = content;
        }).catch(function() {
            $mmUtil.showErrorModal('mma.mod_page.errorwhileloadingthepage');
        }).finally(function() {
            $scope.loaded = true;
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
