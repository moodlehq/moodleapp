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
 * Course Module directive.
 *
 * To use to display a module row.
 *
 * @module mm.core.course
 * @ngdoc directive
 * @name mmCourseModule
 * @description
 *
 * This directive is meant to display a module row.
 *
 * @example
 *
 * <mm-course-module module="module" completion-changed="completionChanged"></mm-course-module>
 */
.directive('mmCourseModule', function() {
    return {
        restrict: 'E',
        scope: {
            module: '=',
            completionChanged: '=?'
        },
        templateUrl: 'core/components/course/templates/module.html'
    };
});
