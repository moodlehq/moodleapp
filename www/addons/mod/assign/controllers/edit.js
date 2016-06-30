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
 * Controller to add/edit an assign submission.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name mmaModAssignEditCtrl
 */
.controller('mmaModAssignEditCtrl', function($scope, $stateParams, $mmaModAssign, $mmUtil, $translate, mmaModAssignComponent, $q,
        $mmText, $mmSite) {

    var courseId = $stateParams.courseid,
        userId = $mmSite.getUserId(), // Right now we can only edit current user's submissions.
        isBlind = !!$stateParams.blindid,
        editStr = $translate.instant('mma.mod_assign.editsubmission');

    $scope.title = editStr; // Temporary title.
    $scope.assignComponent = mmaModAssignComponent;
    $scope.courseId = courseId;
    $scope.moduleId = $stateParams.moduleid;

    function fetchAssignment() {
        // Get assignment data.
        return $mmaModAssign.getAssignment(courseId, $scope.moduleId).then(function(assign) {
            $scope.title = assign.name || $scope.title;
            $scope.assign = assign;

            // Get submission status.
            return $mmaModAssign.getSubmissionStatus(assign.id, userId, isBlind).then(function(response) {
                console.log(response);
                if (!response.lastattempt.canedit) {
                    // Can't edit. Reject.
                    return $q.reject($translate.instant('mm.core.nopermissions', {$a: editStr}));
                }

                $scope.userSubmission = assign.teamsubmission ?
                        response.lastattempt.teamsubmission : response.lastattempt.submission;

                // Only show submission statement if we are editing our own submission.
                if (assign.requiresubmissionstatement && !assign.submissiondrafts && userId == $mmSite.getUserId()) {
                    $scope.submissionStatement = assign.submissionstatement;
                } else {
                    $scope.submissionStatement = false;
                }
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
    // function refreshAllData() {
    //     var promises = [$mmaModAssign.invalidateAssignmentData(courseId)];
    //     if ($scope.assign) {
    //         promises.push($mmaModAssign.invalidateSubmissionStatusData($scope.assign.id, userId, isBlind));
    //     }

    //     return $q.all(promises).finally(function() {
    //         return fetchAssignment();
    //     });
    // }

    fetchAssignment().finally(function() {
        $scope.assignmentLoaded = true;
    });

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description);
    };

    // $scope.refreshAssignment = function() {
    //     if ($scope.assignmentLoaded) {
    //         refreshAllData().finally(function() {
    //             $scope.$broadcast('scroll.refreshComplete');
    //         });
    //     }
    // };
});
