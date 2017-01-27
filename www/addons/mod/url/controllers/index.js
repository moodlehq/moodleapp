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

angular.module('mm.addons.mod_url')

/**
 * URL index controller.
 *
 * @module mm.addons.mod_url
 * @ngdoc controller
 * @name mmaModUrlIndexCtrl
 */
.controller('mmaModUrlIndexCtrl', function($scope, $stateParams, $mmaModUrl, $mmCourse, $mmText, $translate, $q, $mmUtil,
            mmaModUrlComponent) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid;

    $scope.title = module.name;
    $scope.moduleUrl = module.url;
    $scope.component = mmaModUrlComponent;
    $scope.componentId = module.id;
    $scope.canGetUrl = $mmaModUrl.isGetUrlWSAvailable();

    function fetchContent() {
        // Fetch the module data.
        var promise;
        if ($scope.canGetUrl) {
            promise = $mmaModUrl.getUrl(courseId, module.id);
        } else {
            promise = $mmCourse.getModule(module.id, courseId);
        }
        return promise.then(function(mod) {
            if (!$scope.canGetUrl) {
                if (!mod.contents.length) {
                    // If the data was cached maybe we don't have contents. Reject.
                    return $q.reject();
                }
            }

            $scope.title = mod.name;
            $scope.description = mod.intro || mod.description;

            $scope.url = $scope.canGetUrl ? mod.externalurl : 
                            ((mod.contents[0] && mod.contents[0].fileurl) ? mod.contents[0].fileurl : undefined);
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            $scope.loaded = true;
            $scope.refreshIcon = 'ion-refresh';
        });
    }

    fetchContent();

    $scope.go = function() {
        $mmaModUrl.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
        $mmaModUrl.open($scope.url);
    };

    $scope.doRefresh = function() {
        if ($scope.loaded) {
            $scope.refreshIcon = 'spinner';
            return $mmaModUrl.invalidateContent(module.id, courseId).then(function() {
                return fetchContent();
            }).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModUrlComponent, module.id);
    };
});
