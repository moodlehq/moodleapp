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

angular.module('mm.core.course')

/**
 * Mod content controller.
 *
 * @todo MDL-50114 The description might be missing because this data is based on the course
 *       contents which does not always include it.
 * @module mm.core.course
 * @ngdoc controller
 * @name mmCourseModContentCtrl
 */
.controller('mmCourseModContentCtrl', function($log, $stateParams, $scope, $mmCourseDelegate, $mmCourse, $translate, $mmText) {
    $log = $log.getInstance('mmCourseModContentCtrl');
    var module = $stateParams.module || {};

    $scope.isDisabledInSite = $mmCourseDelegate.isModuleDisabledInSite(module.modname);
    $scope.isSupportedByTheApp = $mmCourseDelegate.hasContentHandler(module.modname);
    $scope.moduleName = $mmCourse.translateModuleName(module.modname);
    $scope.isContributedPlugin = $scope.moduleName == $translate.instant('mm.core.mod_external-tool');

    $scope.description = module.description;
    $scope.title = module.name;
    $scope.url = module.url;

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false);
    };
});
