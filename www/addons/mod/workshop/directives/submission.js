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
.directive('mmaModWorkshopSubmission', function(mmaModWorkshopComponent, $mmUser, $state, $mmSite, $mmaModWorkshop, $q,
        $mmaModWorkshopOffline, $mmaModWorkshopHelper, $ionicHistory) {
    return {
        scope: {
            submission: '=',
            assessment: '=?',
            module: '=',
            workshop: '=',
            access: '=',
            summary: '=?',
            courseid: '='
        },
        restrict: 'E',
        templateUrl: 'addons/mod/workshop/templates/submission.html',
        link: function(scope) {
            var promises = [];

            scope.component = mmaModWorkshopComponent;
            scope.componentId = scope.module.instance;

            scope.userId = scope.submission.authorid || scope.submission.userid || $mmSite.getUserId();
            scope.submission.title = scope.submission.title || scope.submission.submissiontitle;
            scope.submission.timemodified = scope.submission.timemodified || scope.submission.submissionmodified;
            scope.submission.id = scope.submission.id || scope.submission.submissionid;

            if (scope.workshop.phase == $mmaModWorkshop.PHASE_ASSESSMENT) {
                if (scope.submission.reviewedby && scope.submission.reviewedby.length) {
                    scope.submission.reviewedbycount = scope.submission.reviewedby.reduce(function (a, b){
                        return a + (b.grade ? 1 : 0);
                    }, 0);
                }

                if (scope.submission.reviewerof && scope.submission.reviewerof.length) {
                    scope.submission.reviewerofcount = scope.submission.reviewerof.reduce(function (a, b){
                        return a + (b.grade ? 1 : 0);
                    }, 0);
                }
            }

            scope.offline = (scope.submission && scope.submission.offline) || (scope.assessment && scope.assessment.offline);

            if (scope.submission.id) {
                promises.push($mmaModWorkshopOffline.getEvaluateSubmission(scope.workshop.id, scope.submission.id)
                        .then(function(offlineSubmission) {
                    scope.submission.submissiongradeover = offlineSubmission.gradeover;
                    scope.offline = true;
                }).catch(function() {
                    // Ignore errors.
                }));
            }

            if (scope.userId) {
                promises.push($mmUser.getProfile(scope.userId, scope.courseid, true).then(function(profile) {
                    scope.profile = profile;
                }));
            }

            scope.viewDetails = !scope.summary && scope.workshop.phase == $mmaModWorkshop.PHASE_CLOSED && $ionicHistory.currentView().stateName !== 'site.mod_workshop-submission';
            if (scope.viewDetails && scope.submission.gradeoverby) {
                promises.push($mmUser.getProfile(scope.submission.gradeoverby, scope.courseid, true).then(function(profile) {
                    scope.evaluateByProfile = profile;
                }));
            }

            scope.gotoSubmission = function() {
                if (scope.submission.timemodified) {
                    var stateParams = {
                        module: scope.module,
                        workshop: scope.workshop,
                        access: scope.access,
                        courseid: scope.courseid,
                        profile: scope.profile,
                        submission: scope.submission,
                        assessment: scope.assessment,
                        submissionid: scope.submission.id
                    };

                    $state.go('site.mod_workshop-submission', stateParams);
                }
            };

            scope.showGrade = $mmaModWorkshopHelper.showGrade;

            return $q.all(promises).finally(function() {
                scope.loaded = true;
            });
        }
    };
});
