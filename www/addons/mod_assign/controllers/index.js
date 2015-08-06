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
 * Assign index controller.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name mmaModAssignIndexCtrl
 */
.controller('mmaModAssignIndexCtrl', function($scope, $stateParams, $mmaModAssign, $mmUtil,
        mmaModAssignComponent, mmaModAssignSubmissionComponent) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.assigncomponent = mmaModAssignComponent;
    $scope.submissioncomponent = mmaModAssignSubmissionComponent;
    $scope.assignurl = module.url;
    $scope.courseid = courseid;

    function fetchAssignment(refresh) {
        // Get assignment data.
        return $mmaModAssign.getAssignment(courseid, module.id, refresh).then(function(assign) {
            $scope.title = assign.name;
            $scope.description = assign.intro;
            $scope.assign = assign;

            // Get assignment submissions.
            return $mmaModAssign.getSubmissions(assign.id, refresh).then(function(data) {
                $scope.canviewsubmissions = data.canviewsubmissions;

                if (data.canviewsubmissions) {
                    // We want to show the user data on each submission.
                    return $mmaModAssign.getSubmissionsUserData(data.submissions, courseid).then(function(submissions) {
                        angular.forEach(submissions, function(submission) {
                            submission.text = $mmaModAssign.getSubmissionText(submission);
                            submission.attachments = $mmaModAssign.getSubmissionAttachments(submission);
                        });
                        $scope.submissions = submissions;
                    });
                }
            }, function() {
                if (error) {
                    $mmUtil.showErrorModal(error);
                } else {
                    $translate('mm.core.error').then(function(error) {
                        $mmUtil.showErrorModal(error + ': get_assignment_submissions');
                    });
                }
            });
        }, function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $translate('mm.core.error').then(function(error) {
                    $mmUtil.showErrorModal(error + ': get_assignment');
                });
            }
        });
    }

    fetchAssignment().finally(function() {
        $scope.assignmentLoaded = true;
    });

    $scope.refreshAssignment = function() {
        fetchAssignment(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
