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
        $mmaModWorkshopHelper, $ionicHistory, $mmEvents, mmaModWorkshopSubmissionChangedEvent, $translate, $mmaModWorkshopOffline,
        mmaModWorkshopAssessmentInvalidatedEvent, mmaModWorkshopAssessmentSaveEvent, $mmGradesHelper, $ionicScrollDelegate,
        mmaModWorkshopAssessmentSavedEvent, mmaModWorkshopEventAutomSynced, $mmSyncBlock, mmaModWorkshopComponent, $mmUser) {

    $scope.title = $stateParams.module.name;
    $scope.courseId = $stateParams.courseid;
    $scope.assessment = $stateParams.assessment || false;
    $scope.submissionLoaded = false;
    $scope.module = $stateParams.module;
    $scope.workshop = $stateParams.workshop;
    $scope.access = $stateParams.access;
    $scope.ownAssessment = false;
    $scope.submissionInfo = $stateParams.submission || {};
    $scope.strategy = ($scope.assessment && $scope.assessment.strategy) || ($scope.workshop && $scope.workshop.strategy);
    $scope.assessmentId = $scope.assessment && ($scope.assessment.assessmentid || $scope.assessment.id);
    $scope.assessmentUserId = $scope.assessment.reviewerid || $scope.assessment.userid;

    var module = $scope.module,
        workshopId = module.instance,
        currentUserId = $mmSite.getUserId(),
        submissionId = $scope.submissionInfo.submissionid || $scope.submissionInfo.id,
        userId = $scope.submissionInfo.userid || false,
        originalEvaluation = {},
        blockData,
        siteId = $mmSite.getId(),
        scrollView,
        obsAssessmentSaved,
        syncObserver,
        hasOffline;

    function fetchSubmissionData() {
        return $mmaModWorkshopHelper.getSubmissionById(workshopId, submissionId).then(function(submissionData) {
            var promises = [];

            $scope.submission = submissionData;
            $scope.submission.submissiongrade = $scope.submissionInfo && $scope.submissionInfo.submissiongrade;
            $scope.submission.gradinggrade = $scope.submissionInfo && $scope.submissionInfo.gradinggrade;
            $scope.submission.submissiongradeover = $scope.submissionInfo && $scope.submissionInfo.submissiongradeover;
            userId = submissionData.authorid || userId;
            $scope.canEdit = currentUserId == userId && $scope.access.cansubmit && $scope.access.modifyingsubmissionallowed;
            $scope.canDelete = $scope.access.candeletesubmissions;
            $scope.canAddFeedback = !$scope.assessmentId && $scope.workshop.phase > $mmaModWorkshop.PHASE_ASSESSMENT &&
                $scope.workshop.phase < $mmaModWorkshop.PHASE_CLOSED && $scope.access.canoverridegrades;
            $scope.ownAssessment = false;

            if ($scope.access.canviewallassessments) {
                // Get new data, different that came from stateParams.
                promises.push($mmaModWorkshop.getSubmissionAssessments(workshopId, submissionId).then(function(subAssessments) {
                    // Only allow the student to delete their own submission if it's still editable and hasn't been assessed.
                    if ($scope.canDelete) {
                        $scope.canDelete = !subAssessments.length;
                    }

                    $scope.submissionInfo.reviewedby = subAssessments;

                    angular.forEach($scope.submissionInfo.reviewedby, function(assessment) {
                        assessment.userid = assessment.reviewerid;
                        assessment = $mmaModWorkshopHelper.realGradeValue($scope.workshop, assessment);

                        if (currentUserId == assessment.userid) {
                            $scope.ownAssessment = assessment;
                            assessment.ownAssessment = true;
                        }
                    });
                }));
            } else if (currentUserId == userId && $scope.assessmentId) {
                // Get new data, different that came from stateParams.
                promises.push($mmaModWorkshop.getAssessment(workshopId, $scope.assessmentId).then(function(assessment) {
                    // Only allow the student to delete their own submission if it's still editable and hasn't been assessed.
                    if ($scope.canDelete) {
                        $scope.canDelete = !assessment;
                    }

                    assessment.userid = assessment.reviewerid;
                    assessment = $mmaModWorkshopHelper.realGradeValue($scope.workshop, assessment);

                    if (currentUserId == assessment.userid) {
                        $scope.ownAssessment = assessment;
                        assessment.ownAssessment = true;
                    }

                    $scope.submissionInfo.reviewedby = [assessment];
                }));
            }

            if ($scope.canAddFeedback || $scope.workshop.phase == $mmaModWorkshop.PHASE_CLOSED) {
                $scope.evaluate = {
                    published: submissionData.published,
                    text: submissionData.feedbackauthor || ""
                };
            }

            if ($scope.canAddFeedback) {

                // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
                blockData = $mmUtil.blockLeaveView($scope, leaveView);

                if (!$scope.$$destroyed) {
                    // Block the workshop.
                    $mmSyncBlock.blockOperation(mmaModWorkshopComponent, workshopId);
                }

                var defaultGrade = $translate.instant('mma.mod_workshop.notoverridden');

                promises.push($mmGradesHelper.makeGradesMenu($scope.workshop.grade, workshopId, defaultGrade, -1).then(function(grades) {
                    $scope.evaluationGrades = grades;

                    $scope.evaluate.grade = {
                        label: $mmGradesHelper.getGradeLabelFromValue(grades, $scope.submissionInfo.submissiongradeover) || defaultGrade,
                        value: $scope.submissionInfo.submissiongradeover || -1
                    };

                    return $mmaModWorkshopOffline.getEvaluateSubmission(workshopId, submissionId).then(function(offlineSubmission) {
                        hasOffline = true;
                        $scope.evaluate.published = offlineSubmission.published;
                        $scope.evaluate.text = offlineSubmission.feedbacktext;
                        $scope.evaluate.grade = {
                            label: $mmGradesHelper.getGradeLabelFromValue(grades, offlineSubmission.gradeover) || defaultGrade,
                            value: offlineSubmission.gradeover || -1
                        };
                    }).catch(function() {
                        hasOffline = false;
                        // Ignore errors.
                    }).finally(function() {
                        originalEvaluation.published = $scope.evaluate.published;
                        originalEvaluation.text = $scope.evaluate.text;
                        originalEvaluation.grade = $scope.evaluate.grade.value;
                    });
                }));
            } else if ($scope.workshop.phase == $mmaModWorkshop.PHASE_CLOSED && submissionData.gradeoverby) {
                promises.push($mmUser.getProfile(submissionData.gradeoverby, $scope.courseId, true).then(function(profile) {
                    $scope.evaluateByProfile = profile;
                }));
            }

            if ($scope.assessmentId && !$scope.access.assessingallowed && $scope.assessment.feedbackreviewer && $scope.assessment.gradinggradeoverby) {
                promises.push($mmUser.getProfile($scope.assessment.gradinggradeoverby, $scope.courseId, true).then(function(profile) {
                    $scope.evaluateGradingByProfile = profile;
                }));
            }

            return $q.all(promises);
        }).then(function() {
            return $mmaModWorkshopOffline.getSubmissions(workshopId).then(function(submissionsActions) {
                var actions = $mmaModWorkshopHelper.filterSubmissionActions(submissionsActions, submissionId);
                return $mmaModWorkshopHelper.applyOfflineData($scope.submission, actions).then(function(submission) {
                    $scope.submission = submission;
                });
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
            access: $scope.access,
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

    // Content changed in first render.
    $scope.firstRenderFeedbackAuthor = function() {
        originalEvaluation.text = $scope.evaluate.text;
    };

    // Save the assessment.
    $scope.saveAssessment = function() {
        // Call trigger to save.
        $mmEvents.trigger(mmaModWorkshopAssessmentSaveEvent);
    };

    // Check if data has changed.
    function hasEvaluationChanged() {
        if (!$scope.submissionLoaded || !$scope.access.canoverridegrades) {
            return false;
        }

        if (originalEvaluation.published != $scope.evaluate.published) {
            return true;
        }

        if (originalEvaluation.text != $scope.evaluate.text) {
            return true;
        }

        if (originalEvaluation.grade != $scope.evaluate.grade.value) {
            return true;
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
            return $mmaModWorkshop.evaluateSubmission(workshopId, submissionId, $scope.courseId, text, $scope.evaluate.published,
                grade);
        }).then(function() {
            var data = {
                workshopid: workshopId,
                cmid: module.cmid,
                submissionid: submissionId
            };

            return $mmaModWorkshop.invalidateSubmissionData(workshopId, submissionId).finally(function() {
                $mmEvents.trigger(mmaModWorkshopSubmissionChangedEvent, data);
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

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];

        promises.push($mmaModWorkshop.invalidateSubmissionData(workshopId, submissionId));
        promises.push($mmaModWorkshop.invalidateSubmissionsData(workshopId));
        promises.push($mmaModWorkshop.invalidateSubmissionAssesmentsData(workshopId, submissionId));

        if ($scope.assessmentId) {
            promises.push($mmaModWorkshop.invalidateAssessmentFormData(workshopId, $scope.assessmentId));
            promises.push($mmaModWorkshop.invalidateAssessmentData(workshopId, $scope.assessmentId));
        }

        return $q.all(promises).finally(function() {
            $mmEvents.trigger(mmaModWorkshopAssessmentInvalidatedEvent);
            return fetchSubmissionData();
        });
    }

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModWorkshopSubmissionScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // Function called when we receive an event of submission changes.
    function eventReceived(data) {
        if (workshopId === data.workshopid) {
            scrollTop();

            $scope.submissionLoaded = false;
            refreshAllData();
        }
    }

    fetchSubmissionData().then(function() {
        $mmaModWorkshop.logViewSubmission(submissionId).then(function() {
            $mmCourse.checkModuleCompletion($scope.courseId, module.completionstatus);
        });
    });

    obsAssessmentSaved = $mmEvents.on(mmaModWorkshopAssessmentSavedEvent, eventReceived);

    // Refresh workshop on sync.
    syncObserver = $mmEvents.on(mmaModWorkshopEventAutomSynced, function(eventData) {
        // Update just when all database is synced.
        if (workshopId == eventData.workshopid && siteId == eventData.siteid) {
            $scope.submissionLoaded = false;
            refreshAllData();
        }
    });

    // Pull to refresh.
    $scope.refreshSubmission = function() {
        if ($scope.submissionLoaded) {
            return refreshAllData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    $scope.$on('$destroy', function() {
        syncObserver && syncObserver.off && syncObserver.off();
        obsAssessmentSaved && obsAssessmentSaved.off && obsAssessmentSaved.off();
        // Restore original back functions.
        $mmSyncBlock.unblockOperation(mmaModWorkshopComponent, workshopId);
    });
});
