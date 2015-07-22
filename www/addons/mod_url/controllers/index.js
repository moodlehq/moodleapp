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
.controller('mmaModUrlIndexCtrl', function($scope, $stateParams, $mmaModUrl, $mmCourse) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid;
    $scope.title = module.name;
    $scope.description = module.description;
    $scope.url = (module.contents && module.contents[0] && module.contents[0].fileurl) ? module.contents[0].fileurl : undefined;

    $scope.go = function() {
        $mmaModUrl.logView(module.instance).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
        $mmaModUrl.open($scope.url);
    };
});
