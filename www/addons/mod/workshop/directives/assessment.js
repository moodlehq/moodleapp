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
 * Directive to render an assessment.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc directive
 * @name mmaModWorkshopAssessment
 * @description
 * Directive to render assessments.
 */
.directive('mmaModWorkshopAssessment', function($mmUser, $state, $mmSite, $mmaModWorkshopHelper, $mmUtil, $mmaModWorkshopOffline,
        $q) {
    return {
        scope: {
            assessment: '=',
            summary: '=?',
            courseid: '=',
            submission: '=',
            module: '=?',
            workshop: '=',
            access: '='
        },
        restrict: 'E',
        templateUrl: 'addons/mod/workshop/templates/assessment.html',
        link: function(scope) {
            var canAssess = scope.access && scope.access.assessingallowed,
                userId = scope.assessment.userid || scope.assessment.reviewerid,
                currentUser = userId == $mmSite.getUserId(),
                promises = [];
                assessmentId = scope.assessment.assessmentid || scope.assessment.id;

            scope.gotoAssessment = function() {
                if (!scope.canSelfAssess && scope.canViewAssessment) {
                    var stateParams = {
                        assessment: scope.assessment,
                        submission: scope.submission,
                        submissionid: scope.assessment.submissionid,
                        profile: scope.profile,
                        courseid: scope.courseid,
                        assessmentid: assessmentId
                    };

                    if (!scope.submission) {
                        var modal = $mmUtil.showModalLoading('mm.core.sending', true);
                        return $mmaModWorkshopHelper.getSubmissionById(scope.workshop.id, scope.assessment.submissionid)
                                .then(function(submissionData) {

                            stateParams.submission = submissionData;
                            $state.go('site.mod_workshop-assessment', stateParams);
                        }).catch(function(message) {
                            $mmUtil.showErrorModal(message, 'Cannot load submission');
                        }).finally(function() {
                            modal.dismiss();
                        });
                    }

                    $state.go('site.mod_workshop-assessment', stateParams);
                }
            };

            scope.gotoOwnAssessment = function() {
                if (scope.canSelfAssess) {
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
                    return false;
                }
            };

            scope.canViewAssessment = scope.assessment.grade;
            scope.canSelfAssess = canAssess && currentUser;

            scope.showGrade = $mmaModWorkshopHelper.showGrade;

            if (userId) {
                promises.push($mmUser.getProfile(userId, scope.courseid, true).then(function(profile) {
                    scope.profile = profile;
                }));
            }

            var assessOffline;
            if (currentUser) {
                assessOffline = $mmaModWorkshopOffline.getAssessment(scope.workshop.id, assessmentId) .then(function(offlineAssess) {
                    scope.offline = true;
                    scope.assessment.weight = offlineAssess.inputdata.weight;
                });
            } else {
                assessOffline = $mmaModWorkshopOffline.getEvaluateAssessment(scope.workshop.id, assessmentId).then(function(offlineAssess) {
                    scope.offline = true;
                    scope.assessment.gradinggradeover = offlineAssess.gradinggradeover;
                    scope.assessment.weight = offlineAssess.weight;
                });
            }

            promises.push(assessOffline.catch(function() {
                scope.offline = false;
                // Ignore errors.
            }));

            return $q.all(promises).finally(function() {
                scope.loaded = true;
            });
        }
    };
});
