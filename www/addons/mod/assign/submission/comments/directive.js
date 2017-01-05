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

angular.module('mm.addons.mod_assign')

/**
 * Directive to render assign submission comments.
 *
 * @module mm.addons.mod_assign
 * @ngdoc directive
 * @name mmaModAssignSubmissionComments
 */
.directive('mmaModAssignSubmissionComments', function($state, $mmComments, mmaModAssignSubmissionInvalidatedEvent) {
    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/assign/submission/comments/template.html',
        link: function(scope) {
            // Shows the comments on a new State.
            scope.showComments = function() {
                var params = {
                    contextLevel: 'module',
                    instanceId: scope.cmid,
                    component: 'assignsubmission_comments',
                    itemId: scope.submissionId,
                    area: 'submission_comments',
                    title: scope.plugin.name
                };
                // Open a new state with the interpolated contents.
                $state.go('site.mm_commentviewer', params);
            };

            scope.submissionId = scope.submission.id;
            scope.cmid = scope.assign.cmid;

            var obsLoaded = scope.$on(mmaModAssignSubmissionInvalidatedEvent, function() {
                $mmComments.invalidateCommentsData('module', scope.cmid, 'assignsubmission_comments', scope.submissionId,
                    'submission_comments');
            });

            scope.$on('$destroy', obsLoaded);
        }
    };
});
