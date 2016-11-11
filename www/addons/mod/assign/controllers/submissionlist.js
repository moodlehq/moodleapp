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
 * Assign submission list controller.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name mmaModAssignSubmissionListCtrl
 */
.controller('mmaModAssignSubmissionListCtrl', function($scope, $stateParams, $mmaModAssign, $mmUtil, $translate, $q,
        mmaModAssignComponent, mmaModAssignSubmissionInvalidatedEvent, mmaModAssignSubmissionStatusSubmitted,
        mmaModAssignNeedGrading) {

    var courseId = $stateParams.courseid,
        selectedStatus = $stateParams.status;

    if (selectedStatus) {
        if (selectedStatus == mmaModAssignNeedGrading) {
            $scope.title = $translate.instant('mma.mod_assign.numberofsubmissionsneedgrading');
        } else {
            $scope.title = $translate.instant('mma.mod_assign.submissionstatus_' + selectedStatus);
        }
    } else {
        $scope.title = $translate.instant('mma.mod_assign.numberofparticipants');
    }
    $scope.assignComponent = mmaModAssignComponent;
    $scope.courseId = courseId;
    $scope.moduleId = $stateParams.moduleid;

    function fetchAssignment() {
        // Get assignment data.
        return $mmaModAssign.getAssignment(courseId, $scope.moduleId).then(function(assign) {
            $scope.title = assign.name || $scope.title;
            $scope.assign = assign;
            $scope.haveAllParticipants = true;

            // Get assignment submissions.
            return $mmaModAssign.getSubmissions(assign.id).then(function(data) {
                var participants = false,
                    blindMarking = assign.blindmarking && !assign.revealidentities;

                if (!data.canviewsubmissions) {
                    // You should not be here.
                    return $q.reject();
                }

                // We want to show the user data on each submission.
                return $mmaModAssign.listParticipants(assign.id).then(function(p) {
                    participants = p;
                    $scope.haveAllParticipants = true;
                }).catch(function() {
                    $scope.haveAllParticipants = false;
                    return $q.when();
                }).finally(function() {
                    return $mmaModAssign.getSubmissionsUserData(data.submissions, courseId, assign.id, blindMarking, participants)
                            .then(function(submissions) {

                        var searchStatus = mmaModAssignNeedGrading == selectedStatus ?
                                mmaModAssignSubmissionStatusSubmitted : selectedStatus,
                            promises = [];

                        $scope.submissions = [];
                        angular.forEach(submissions, function(submission) {
                            if (!searchStatus || searchStatus == submission.status) {
                                var promise;

                                if (mmaModAssignNeedGrading == selectedStatus) {
                                    promise = $mmaModAssign.needsSubmissionToBeGraded(submission, assign.id);
                                } else {
                                    promise = $q.when(true);
                                }
                                promises.push(promise.then(function(add) {
                                    if (!add) {
                                        return;
                                    }
                                    submission.statusTranslated = $translate.instant('mma.mod_assign.submissionstatus_' +
                                        submission.status);
                                    submission.statusClass = $mmaModAssign.getSubmissionStatusClass(submission.status);
                                    submission.gradingStatusTranslationId =
                                        $mmaModAssign.getSubmissionGradingStatusTranslationId(submission.gradingstatus);
                                    submission.gradingClass = $mmaModAssign.getSubmissionGradingStatusClass(submission.gradingstatus);
                                    $scope.submissions.push(submission);
                                }));
                            }
                        });
                        return $q.all(promises);
                    });
                });
            });
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('Error getting assigment data.');
            }
            return $q.reject();
        });
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [$mmaModAssign.invalidateAssignmentData(courseId)];
        if ($scope.assign) {
            promises.push($mmaModAssign.invalidateAllSubmissionData($scope.assign.id));
            promises.push($mmaModAssign.invalidateAssignmentUserMappingsData($scope.assign.id));
            promises.push($mmaModAssign.invalidateListParticipantsData($scope.assign.id));
        }

        return $q.all(promises).finally(function() {
            $scope.$broadcast(mmaModAssignSubmissionInvalidatedEvent);
            return fetchAssignment();
        });
    }

    fetchAssignment().finally(function() {
        $scope.assignmentLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshSubmissionList = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
