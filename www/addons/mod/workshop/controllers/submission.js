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
 * Workshop submission controller.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc controller
 * @name mmaModWorkshopSubmissionCtrl
 */
.controller('mmaModWorkshopSubmissionCtrl', function($scope, $stateParams, $mmaModWorkshop, $mmCourse, $q, $mmUtil, $mmSite, $state,
        $mmaModWorkshopHelper, $ionicHistory, $mmEvents, mmaModWorkshopSubmissionChangedEvent, $translate, $mmaModWorkshopOffline) {

    var submission = $stateParams.submission || {},
        module = $stateParams.module,
        workshopId = module.instance,
        access = $stateParams.access,
        userId = $mmSite.getUserId(),
        submissionId = submission.submissionid || submission.id;

    $scope.title = module.name;
    $scope.courseId = $stateParams.courseid;
    $scope.assessment = $stateParams.assessment || false;
    $scope.submissionLoaded = false;
    $scope.module = module;

    function fetchSubmissionData() {
        return $mmaModWorkshopHelper.getSubmissionById(workshopId, submissionId).then(function(submissionData) {
            var promises = [];

            console.error($scope.assessment);
            $scope.submission = submissionData;
            $scope.canEdit = (userId == submissionData.authorid && access.cansubmit && access.modifyingsubmissionallowed);
            $scope.canDelete = access.candeletesubmissions;
            if (!$scope.canDelete && userId == submissionData.authorid && $scope.canEdit) {
                // Only allow the student to delete their own submission if it's still editable and hasn't been assessed.
                promises.push($mmaModWorkshop.getSubmissionAssessments(workshopId, submissionId).then(function(assessments) {
                    $scope.canDelete = !assessments.length;
                }));
            }

            if ($scope.assessment) {
                promises.push($mmaModWorkshop.getAssessmentForm(workshopId, $scope.assessment.id, 'assessment')
                        .then(function(assessmentForm) {
                    console.error(assessmentForm);
                }));
            }

            return $q.all(promises);
        }).then(function() {
            return $mmaModWorkshopOffline.getSubmissions(workshopId).then(function(submissionsActions) {
                var actions = $mmaModWorkshopHelper.filterSubmissionActions(submissionsActions, submissionId);
                $scope.submission = $mmaModWorkshopHelper.applyOfflineData($scope.submission, actions);
            });
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            $scope.submissionLoaded = true;
        });
    }

    $scope.editSubmission = function() {
        var stateParams = {
            module: module,
            access: access,
            courseid: $scope.courseId,
            submission: $scope.submission,
            submissionid: submissionId
        };

        $state.go('site.mod_workshop-edit-submission', stateParams);
    };

    $scope.deleteSubmission = function() {
        $mmUtil.showConfirm($translate('mma.mod_workshop.submissiondeleteconfirm')).then(function() {
            var modal = $mmUtil.showModalLoading('mm.core.deleting', true),
                success = false;
            $mmaModWorkshop.deleteSubmission(workshopId, submissionId, $scope.courseId).then(function() {
                success = true;
                return $mmaModWorkshop.invalidateSubmissionData(workshopId, submissionId);
            }).catch(function(error) {
                $mmUtil.showErrorModalDefault(error, 'Cannot delete submission');
            }).finally(function() {
                modal.dismiss();
                if (success) {
                    var data = {
                        workshopid: workshopId,
                        cmid: module.cmid,
                        submissionid: submissionId
                    };

                    $mmEvents.trigger(mmaModWorkshopSubmissionChangedEvent, data);

                    $ionicHistory.goBack();
                }
            });
        });
    };

    $scope.undoDeleteSubmission = function() {
        return $mmaModWorkshopOffline.deleteSubmissionAction(workshopId, submissionId, "delete").finally(function() {

            var data = {
                workshopid: workshopId,
                cmid: module.cmid,
                submissionid: submissionId
            };
            $mmEvents.trigger(mmaModWorkshopSubmissionChangedEvent, data);
            return refreshAllData();
        });
    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];

        promises.push($mmaModWorkshop.invalidateSubmissionData(workshopId, submissionId));
        promises.push($mmaModWorkshop.invalidateSubmissionsData(workshopId));
        promises.push($mmaModWorkshop.invalidateSubmissionAssesmentsData(workshopId, submissionId));

        return $q.all(promises).finally(function() {
            return fetchSubmissionData();
        });
    }

    fetchSubmissionData().then(function() {
        $mmaModWorkshop.logViewSubmission(submissionId).then(function() {
            $mmCourse.checkModuleCompletion($scope.courseId, module.completionstatus);
        });
    });

    // Pull to refresh.
    $scope.refreshSubmission = function() {
        if ($scope.submissionLoaded) {
            return refreshAllData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };
});
