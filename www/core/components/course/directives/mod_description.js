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
 * Course Mod Description directive.
 *
 * To use to display the description of a module.
 *
 * @module mm.core.course
 * @ngdoc directive
 * @name mmCourseModDescription
 * @description
 *
 * This directive is meant to display a module description in a similar way throughout
 * all the modules. It has its own scope and so will use the attribute 'description' to
 * know what scope variable to look for in the parent scope.
 *
 * If the description is asynchronous you should set the attribute 'watch' to true.
 * This attribute is directly shared with mmFormatText which needs it.
 *
 * You can add a note at the right side of the description by using the 'note' attribute.
 *
 * You can also pass a component and componentId to be used in format-text.
 *
 * Module descriptions are shortened by default, allowing the user to see the full description by clicking in it.
 * If you want the whole description to be shown you can use the 'showfull' attribute.
 *
 * @example
 *
 * <mm-course-mod-description description="myDescription"></mm-course-mod-description>
 *
 * <mm-course-mod-description description="myAsyncDesc" watch="true"></mm-course-mod-description>
 */
.directive('mmCourseModDescription', function() {
    return {
        compile: function(element, attrs) {
            if (attrs.watch) {
                element.find('mm-format-text').attr('watch', attrs.watch);
            }

            return function(scope) { // Link function.
                scope.showfull = !!attrs.showfull;
            };
        },
        restrict: 'E',
        scope: {
            description: '=',
            note: '=?',
            component: '@?',
            componentId: '@?'
        },
        templateUrl: 'core/components/course/templates/mod_description.html'
    };
});
