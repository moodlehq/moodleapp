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
 * Course content directive.
 *
 * @module mm.core.course
 * @ngdoc directive
 * @name mmCourseContent
 */
.directive('mmCourseContent', function($log, $mmCourseDelegate, $state) {
    $log = $log.getInstance('mmCourseContent');

    var customController = function() {};

    // Directive link function.
    function link(scope, element, attrs) {
        var module = JSON.parse(attrs.module),
            courseid = attrs.courseid,
            data;

        data = $mmCourseDelegate.getDataFromContentHandlerFor(module.modname, module, courseid);
        if (data.controller) {
            customController = data.controller;
            delete data.controller;
        }

        scope = angular.extend(scope, data);
        customController(scope);
    }

    // Directive controller.
    function controller($scope) {
        $scope.handleClick = function(e, button) {
            e.stopPropagation();
            e.preventDefault();
            button.callback($scope);
        };
        $scope.jump = function(e, state, stateParams) {
            e.stopPropagation();
            e.preventDefault();
            $state.go(state, stateParams);
        };
    }

    return {
        controller: controller,
        link: link,
        replace: true,
        restrict: 'E',
        scope: {},
        templateUrl: 'core/components/course/templates/content.html',
    };
});
