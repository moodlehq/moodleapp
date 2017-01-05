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

angular.module('mm.core')

/**
 * This directive adds a "bar" with arrows to navigate forward/backward and a "info" icon to display more data.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmNavigationBar
 * @description
 * This directive will show two arrows at the left and right of the screen to navigate to previous/next item when clicked.
 * If no previous/next item is defined, that arrow won't be shown. It will also show a button to show more info.
 *
 * @param {Mixed}    [previous] Previous item. If not defined, the previous arrow won't be shown.
 * @param {Mixed}    [next]     Next item. If not defined, the next arrow won't be shown.
 * @param {Function} [action]   Function to call when an arrow is clicked. Will receive as a param the item to load.
 * @param {String}   [info]     Info to show when clicking the info button. If not defined, the info button won't be shown.
 * @param {String}   [title]    Title to show when seeing the info (new state).
 * @param {String} [component]   Component the bar belongs to.
 * @param {Number} [componentId] Component ID.
 */
.directive('mmNavigationBar', function($state, $translate) {
    return {
        restrict: 'E',
        scope: {
            previous: '=?',
            next: '=?',
            action: '=?',
            info: '=?',
            component: '@?',
            componentId: '@?'
        },
        templateUrl: 'core/templates/navigationbar.html',
        link: function(scope, element, attrs) {
            scope.title = attrs.title || $translate.instant('mm.core.info');
            scope.showInfo = function() {
                $state.go('site.mm_textviewer', {
                    title: scope.title,
                    content: scope.info,
                    component: attrs.component,
                    componentId: attrs.componentId
                });
            };
        }
    };
});
