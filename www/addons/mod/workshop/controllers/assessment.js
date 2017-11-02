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
 * Workshop assessment controller.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc controller
 * @name mmaModWorkshopAssessmentCtrl
 */
.controller('mmaModWorkshopAssessmentCtrl', function($scope, $stateParams, $mmUtil, $mmEvents, $q, $mmSite, $mmCourse,
        $mmaModWorkshop, mmaModWorkshopAssessmentInvalidatedEvent) {

    $scope.assessment = $stateParams.assessment || {};
    $scope.submission = $stateParams.submission || {};
    $scope.profile = $stateParams.profile || {};
    $scope.assessmentId = $scope.assessment && ($scope.assessment.assessmentid || $scope.assessment.id);

    var courseId = $stateParams.courseid || false,
        workshopId = $stateParams.submission.workshopid || false;

    function fetchAssessmentData() {
        return $mmaModWorkshop.getWorkshopById(courseId, workshopId).then(function(workshopData) {
            $scope.workshop = workshopData;
            $scope.title = $scope.workshop.name;
            $scope.strategy = $scope.workshop.strategy;
            return $mmCourse.getModuleBasicGradeInfo(workshopData.coursemodule);
        }).then(function(gradeInfo) {
            $scope.maxGrade = gradeInfo.grade;
            return $mmaModWorkshop.getWorkshopAccessInformation(workshopId);
        }).then(function(accessData) {
            $scope.access = accessData;
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            $scope.assessmentLoaded = true;
        });
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];

        promises.push($mmaModWorkshop.invalidateWorkshopData(courseId));
        promises.push($mmaModWorkshop.invalidateWorkshopAccessInformationData(workshopId));
        promises.push($mmaModWorkshop.invalidateReviewerAssesmentsData(workshopId));

        if ($scope.assessmentId) {
            promises.push($mmaModWorkshop.invalidateAssessmentFormData(workshopId, $scope.assessmentId));
            promises.push($mmaModWorkshop.invalidateAssessmentData(workshopId, $scope.assessmentId));
        }

        return $q.all(promises).finally(function() {
            $mmEvents.trigger(mmaModWorkshopAssessmentInvalidatedEvent);
            return fetchAssessmentData();
        });
    }

    fetchAssessmentData();

    // Pull to refresh.
    $scope.refreshAssessment = function() {
        if ($scope.assessmentLoaded) {
            return refreshAllData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };
});