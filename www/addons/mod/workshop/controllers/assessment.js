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
.controller('mmaModWorkshopAssessmentCtrl', function($scope, $stateParams, $mmUtil, $mmEvents, $q, $mmSite, $mmaModWorkshopOffline,
        $mmCourse, $mmaModWorkshop, mmaModWorkshopAssessmentInvalidatedEvent, $mmGradesHelper, mmaModWorkshopAssessmentSavedEvent,
        $translate, $mmaModWorkshopHelper, $mmSyncBlock, mmaModWorkshopComponent, mmaModWorkshopEventAutomSynced, $mmUser) {

    $scope.assessment = $stateParams.assessment || {};
    $scope.submission = $stateParams.submission || {};
    $scope.profile = $stateParams.profile || {};
    $scope.assessmentId = $scope.assessment && ($scope.assessment.assessmentid || $scope.assessment.id);
    $scope.evaluating = false;
    $scope.courseId = $stateParams.courseid || false;

    var courseId = $scope.courseId,
        workshopId = $stateParams.submission.workshopid || false,
        blockData,
        originalEvaluation = {},
        assessmentId = $scope.assessmentId,
        syncObserver,
        siteId = $mmSite.getId(),
        hasOffline;

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

            // Load Weights selector.
            if (assessmentId && (accessData.canallocate || accessData.canoverridegrades)) {
                // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
                blockData = $mmUtil.blockLeaveView($scope, leaveView);

                if (!$scope.$$destroyed) {
                    // Block the workshop.
                    $mmSyncBlock.blockOperation(mmaModWorkshopComponent, workshopId);
                }

                $scope.evaluating = true;
            } else {
                $scope.evaluating = false;
            }

            if ($scope.evaluating || $scope.workshop.phase == $mmaModWorkshop.PHASE_CLOSED) {
                // Get all info of the assessment.
                return $mmaModWorkshopHelper.getReviewerAssessmentById(workshopId, assessmentId, $scope.profile.id)
                        .then(function(assessment) {

                    var defaultGrade, promise;

                    $scope.assessment = $mmaModWorkshopHelper.realGradeValue($scope.workshop, assessment);
                    $scope.evaluate = {
                        weight: $scope.assessment.weight,
                        text: $scope.assessment.feedbackreviewer
                    };

                    if ($scope.evaluating) {
                        if (accessData.canallocate) {
                            $scope.weights = [];
                            for (var i = 16; i >= 0; i--) {
                                $scope.weights[i] = i;
                            }
                        }

                        if (accessData.canoverridegrades) {
                            defaultGrade = $translate.instant('mma.mod_workshop.notoverridden');
                            promise = $mmGradesHelper.makeGradesMenu($scope.workshop.gradinggrade, workshopId, defaultGrade, -1).then(function(grades) {
                                $scope.evaluationGrades = grades;
                            });
                        } else {
                            promise = $q.when();
                        }

                        return promise.then(function() {
                            return $mmaModWorkshopOffline.getEvaluateAssessment(workshopId, assessmentId).then(function(offlineAssess) {
                                hasOffline = true;
                                $scope.evaluate.weight = offlineAssess.weight;
                                if (accessData.canoverridegrades) {
                                    $scope.evaluate.text = offlineAssess.feedbacktext;
                                    $scope.evaluate.grade = {
                                        label: $mmGradesHelper.getGradeLabelFromValue($scope.evaluationGrades, offlineAssess.gradinggradeover) || defaultGrade,
                                        value: offlineAssess.gradinggradeover || -1
                                    };
                                }
                            }).catch(function() {
                                hasOffline = false;
                                // No offline, load online.
                                if (accessData.canoverridegrades) {
                                    $scope.evaluate.text = $scope.assessment.feedbackreviewer;

                                    $scope.evaluate.grade = {
                                        label: $mmGradesHelper.getGradeLabelFromValue($scope.evaluationGrades, $scope.assessment.gradinggradeover) || defaultGrade,
                                        value: $scope.assessment.gradinggradeover || -1
                                    };
                                }
                            });
                        }).finally(function() {
                            originalEvaluation.weight = $scope.evaluate.weight;
                            if (accessData.canoverridegrades) {
                                originalEvaluation.text = $scope.evaluate.text;
                                originalEvaluation.grade = $scope.evaluate.grade.value;
                            }
                        });
                    } else if ($scope.workshop.phase == $mmaModWorkshop.PHASE_CLOSED && $scope.assessment.gradinggradeoverby) {
                        return $mmUser.getProfile($scope.assessment.gradinggradeoverby, courseId, true).then(function(profile) {
                            $scope.evaluateByProfile = profile;
                        });
                    }
                });
            }
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

        if (assessmentId) {
            promises.push($mmaModWorkshop.invalidateAssessmentFormData(workshopId, assessmentId));
            promises.push($mmaModWorkshop.invalidateAssessmentData(workshopId, assessmentId));
        }

        return $q.all(promises).finally(function() {
            $mmEvents.trigger(mmaModWorkshopAssessmentInvalidatedEvent);
            return fetchAssessmentData(true);
        });
    }

    // Content changed in first render.
    $scope.firstRenderFeedbackReviewer = function() {
        originalEvaluation.text = $scope.evaluate.text;
    };

    // Check if data has changed.
    function hasEvaluationChanged() {
        if (!$scope.assessmentLoaded || !$scope.evaluating) {
            return false;
        }

        if (originalEvaluation.weight != $scope.evaluate.weight) {
            return true;
        }

        if ($scope.access.canoverridegrades) {
            if (originalEvaluation.text != $scope.evaluate.text) {
                return true;
            }

            if (originalEvaluation.grade != $scope.evaluate.grade.value) {
                return true;
            }
        }

        return false;
    }

    function saveEvaluation() {
        var modal = $mmUtil.showModalLoading('mm.core.sending', true);

        // Check if rich text editor is enabled or not.
        return $mmUtil.isRichTextEditorEnabled().then(function(rteEnabled) {
            var text = $scope.evaluate.text,
                grade = $scope.evaluate.grade.value >= 0 ? $scope.evaluate.grade.value : "";
            if (!rteEnabled) {
                // Rich text editor not enabled, add some HTML to the message if needed.
                text = $mmText.formatHtmlLines(text);
            }

            // Try to send it to server.
            return $mmaModWorkshop.evaluateAssessment(workshopId, assessmentId, courseId, text, $scope.evaluate.weight, grade);
        }).then(function() {
            var data = {
                workshopid: workshopId,
                assessmentid: assessmentId,
                userId: $mmSite.getUserId(),
                siteId: siteId
            };

            return $mmaModWorkshop.invalidateAssessmentData(workshopId, assessmentId).finally(function() {
                $mmEvents.trigger(mmaModWorkshopAssessmentSavedEvent, data);
            });
        }).catch(function(message) {
            $mmUtil.showErrorModal(message, 'Cannot save submission evaluation');
        }).finally(function() {
            modal.dismiss();
        });
    }

    // Save the submission evaluation.
    $scope.saveEvaluation = function() {
        // Check if data has changed.
        if (hasEvaluationChanged()) {
            saveEvaluation().then(function() {
                blockData && blockData.back();
            });
        } else {
            // Nothing to save, just go back.
            blockData && blockData.back();
        }
    };

    // Ask to confirm if there are changes.
    function leaveView() {
        if (!hasEvaluationChanged()) {
            return $q.when();
        }
        // Show confirmation if some data has been modified.
        return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
    }

    fetchAssessmentData();

    // Refresh workshop on sync.
    syncObserver = $mmEvents.on(mmaModWorkshopEventAutomSynced, function(eventData) {
        // Update just when all database is synced.
        if (workshopId == eventData.workshopid && siteId == eventData.siteid) {
            $scope.assessmentLoaded = false;
            refreshAllData();
        }
    });

    // Pull to refresh.
    $scope.refreshAssessment = function() {
        if ($scope.assessmentLoaded) {
            return refreshAllData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    $scope.showGrade = $mmaModWorkshopHelper.showGrade;

    $scope.$on('$destroy', function() {
        syncObserver && syncObserver.off && syncObserver.off();
        // Restore original back functions.
        $mmSyncBlock.unblockOperation(mmaModWorkshopComponent, workshopId);
    });
});