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
 * Assign submission controller.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name mmaModAssignSubmissionReviewCtrl
 */
.controller('mmaModAssignSubmissionReviewCtrl', function($scope, $stateParams, $q, $mmaModAssign, $mmCourse, $mmEvents,
        mmaModAssignSubmissionInvalidatedEvent, mmaModAssignEventSubmitGrade) {
    var assign,
        blindMarking;

    $scope.courseid = $stateParams.courseid;
    $scope.moduleid = $stateParams.moduleid;
    $scope.submitid = $stateParams.submitid;
    $scope.blindid = $stateParams.blindid;
    $scope.showSubmission = typeof $stateParams.showSubmission != 'undefined' ? $stateParams.showSubmission : true;

    function fetchSubmission() {
        return $mmaModAssign.getAssignment($scope.courseid, $scope.moduleid).then(function(assignment) {
            assign = assignment;
            $scope.title = assign.name;

            blindMarking = assign.blindmarking && !assign.revealidentities;

            return $mmaModAssign.isGradingEnabled().then(function(enabled) {
                if (enabled) {
                    return $mmCourse.getModuleBasicGradeInfo($scope.moduleid).then(function(gradeInfo) {
                        if (gradeInfo) {
                            // Grades can be saved if simple grading.
                            if (gradeInfo.advancedgrading && gradeInfo.advancedgrading[0] &&
                                    typeof gradeInfo.advancedgrading[0].method != 'undefined') {
                                var method = gradeInfo.advancedgrading[0].method || 'simple';
                                $scope.canSaveGrades = method == 'simple';
                            } else {
                                $scope.canSaveGrades = true;
                            }
                        }
                    });
                }
            });
        });
    }

    // Submit grade action.
    $scope.submitGrade = function() {
        // Call trigger to save.
        $mmEvents.trigger(mmaModAssignEventSubmitGrade);
    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [$mmaModAssign.invalidateAssignmentData($scope.courseid)];
        if (assign) {
            promises.push($mmaModAssign.invalidateSubmissionData(assign.id));
            promises.push($mmaModAssign.invalidateAssignmentUserMappingsData(assign.id));
            promises.push($mmaModAssign.invalidateSubmissionStatusData(assign.id, $scope.submitid, blindMarking));
        }
        return $q.all(promises).finally(function() {
            $scope.$broadcast(mmaModAssignSubmissionInvalidatedEvent);
            return fetchSubmission();
        });
    }

    fetchSubmission().finally(function() {
        $scope.assignmentSubmissionLoaded = true;
    });

    // Pull to refresh.
    $scope.refreshSubmission = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
