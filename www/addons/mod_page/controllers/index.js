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
.controller('mmaModPageIndexCtrl', function($scope, $stateParams, $mmUtil, $mmaModPage,
        $translate, $log, mmaModPageComponent) {
    $log = $log.getInstance('mmaModPageIndexCtrl');

    var module = $stateParams.module || {},
        showLoading = true;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.component = mmaModPageComponent;
    $scope.componentId = module.id;
    $scope.externalUrl = module.url;

    function fetchContent() {
        $translate('mm.core.loading').then(function(str) {
            if (showLoading) {
                $mmUtil.showModalLoading(str);
            }
        });

        return $mmaModPage.getPageHtml(module.contents, module.id).then(function(content) {
            $scope.content = content;
        }, function() {
            showLoading = false;
            $mmUtil.showErrorModal('mma.mod_page.errorwhileloadingthepage', true);
        }).finally(function() {
            $mmUtil.closeModalLoading();
        });
    }

    $scope.doRefresh = function() {
        showLoading = false;
        $mmaModPage.invalidateContent(module.id)
        .then(function() {
            return fetchContent();
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    fetchContent();
});
