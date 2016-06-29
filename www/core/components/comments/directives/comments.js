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

angular.module('mm.core.comments')

/**
 * Directive to fetch and render comments list resume.
 *
 * @module mm.core.comments
 * @ngdoc directive
 * @name mmComments
 */
.directive('mmComments', function($mmComments, $state) {
    return {
        restrict: 'E',
        priority: 100,
        scope: {
            contextLevel: '@',
            instanceId: '@',
            component: '@',
            itemId: '@',
            area: '@?',
            page: '@?',
            title: '@?'
        },
        templateUrl: 'core/components/comments/templates/comments.html',
        link: function(scope, el, attr) {
            var params;

            scope.commentsCount = -1;
            scope.commentsLoaded = false;

            // Shows the comments on a new State.
            scope.showComments = function() {
                if (scope.commentsCount > 0) {
                    // Open a new state with the interpolated contents.
                    $state.go('site.mm_commentviewer', params);
                }
            };

            $mmComments.getComments(attr.contextLevel, attr.instanceId, attr.component, attr.itemId, attr.area, attr.page)
                    .then(function(comments) {
                params = {
                    contextLevel: attr.contextLevel,
                    instanceId: attr.instanceId,
                    component: attr.component,
                    itemId: attr.itemId,
                    area: attr.area,
                    page: attr.page,
                    title: attr.title
                };
                scope.commentsCount = comments && comments.length ? comments.length : 0;
                scope.commentsLoaded = true;
            }).catch(function() {
                // Silently fail.
                scope.commentsLoaded = true;
            });
        }
    };
});
