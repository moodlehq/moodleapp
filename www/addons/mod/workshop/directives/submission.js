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

angular.module('mm.addons.mod_workshop')

/**
 * Directive to render a submission.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc directive
 * @name mmaModWorkshopSubmission
 * @description
 * Directive to render submission.
 */
.directive('mmaModWorkshopSubmission', function(mmaModWorkshopComponent, $mmUser, $state, $mmSite) {
    return {
        scope: {
            submission: '=',
            module: '=',
            access: '=?',
            summary: '=?',
            courseid: '='
        },
        restrict: 'E',
        templateUrl: 'addons/mod/workshop/templates/submission.html',
        link: function(scope, element, attributes) {
            scope.component = mmaModWorkshopComponent;
            scope.componentId = scope.module.instance;

            scope.userId = scope.submission.authorid || scope.submission.userid || $mmSite.getUserId();

            scope.gotoSubmission = function() {
                if (scope.submission.submissionmodified) {
                    var stateParams = {
                        module: scope.module,
                        access: scope.access,
                        courseid: scope.courseid,
                        profile: scope.profile,
                        submission: scope.submission,
                        submissionid: scope.submission.submissionid
                    };

                    $state.go('site.mod_workshop-submission', stateParams);
                }
            };

            return $mmUser.getProfile(scope.userId, scope.courseid, true).then(function(profile) {
                scope.profile = profile;
            }).finally(function() {
                scope.loaded = true;
            });
        }
    };
});
