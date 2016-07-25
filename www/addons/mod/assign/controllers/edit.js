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
        $mmText, $mmSite, $mmaModAssignHelper, $rootScope, $ionicPlatform, $timeout, $mmEvents, $ionicHistory,
        mmaModAssignSubmissionSavedEvent, mmaModAssignSubmittedForGradingEvent, $mmFileUploaderHelper) {

    var courseId = $stateParams.courseid,
        userId = $mmSite.getUserId(), // Right now we can only edit current user's submissions.
        isBlind = !!$stateParams.blindid,
        editStr = $translate.instant('mma.mod_assign.editsubmission'),
        originalBackFunction = $rootScope.$ionicGoBack,
        unregisterHardwareBack,
        currentView = $ionicHistory.currentView();

    $scope.title = editStr; // Temporary title.
    $scope.assignComponent = mmaModAssignComponent;
    $scope.courseId = courseId;
    $scope.moduleId = $stateParams.moduleid;

    function fetchAssignment() {
        // Get assignment data.
        return $mmaModAssign.getAssignment(courseId, $scope.moduleId).then(function(assign) {
            $scope.title = assign.name || $scope.title;
            $scope.assign = assign;

            // Get submission status. Ignore cache to get the latest data.
            return $mmaModAssign.getSubmissionStatus(assign.id, userId, isBlind, false, true).then(function(response) {
                if (!response.lastattempt.canedit) {
                    // Can't edit. Reject.
                    return $q.reject($translate.instant('mm.core.nopermissions', {$a: editStr}));
                }

                $scope.userSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(assign, response.lastattempt);

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

    // Get the input data.
    function getInputData() {
        return $mmaModAssignHelper.getAnswersFromForm(document.forms['mma-mod_assign-edit-form']);
    }

    // Get submission data.
    function prepareSubmissionData(inputData) {
        return $mmaModAssignHelper.prepareSubmissionPluginData($scope.assign, $scope.userSubmission, inputData);
    }

    // Check if data has changed.
    function hasDataChanged() {
        return $mmaModAssignHelper.hasSubmissionDataChanged($scope.assign, $scope.userSubmission, getInputData());
    }

    // Save the submission.
    function saveSubmission() {
        var modal = $mmUtil.showModalLoading(),
            inputData = getInputData();

        // Get size to ask for confirmation.
        return $mmaModAssignHelper.getSubmissionSizeForEdit($scope.assign, $scope.userSubmission, inputData).catch(function() {
            // Error calculating size, return -1.
            return -1;
        }).then(function(size) {
            modal.dismiss();

            // Confirm action.
            return $mmFileUploaderHelper.confirmUploadFile(size, true);
        }).then(function() {
            modal = $mmUtil.showModalLoading('mm.core.sending', true);

            return prepareSubmissionData(inputData).then(function(pluginData) {
                if (Object.keys(pluginData).length) {
                    // There's something to save.
                    return $mmaModAssign.saveSubmission($scope.assign.id, pluginData).then(function() {
                        // Submission saved, trigger event.
                        var params = {
                            assignmentId: $scope.assign.id,
                            submissionId: $scope.userSubmission.id,
                            userId: $mmSite.getUserId(),
                            siteId: $mmSite.getId()
                        };
                        $mmEvents.trigger(mmaModAssignSubmissionSavedEvent, params);

                        if (!$scope.assign.submissiondrafts) {
                            // No drafts allowed, so it was submitted. Trigger event.
                            $mmEvents.trigger(mmaModAssignSubmittedForGradingEvent, params);
                        }
                    });
                }
            }).catch(function(message) {
                if (message) {
                    $mmUtil.showErrorModal(message);
                } else {
                    $mmUtil.showErrorModal('Error saving submission.');
                }
                return $q.reject();
            }).finally(function() {
                modal.dismiss();
            });
        });
    }

    // Function called when user wants to leave view without saving.
    function leaveView() {
        // Check that we're leaving the current view, since the user can navigate to other views from here.
        if ($ionicHistory.currentView() !== currentView || !$scope.userSubmission) {
            // It's another view.
            originalBackFunction();
            return;
        }

        // Gather data to check if there's something to send.
        // Wait a bit before showing the modal because usually the hasDataChanged call will be resolved inmediately.
        var modal,
            showModal = true;

        $timeout(function() {
            if (showModal) {
                modal = $mmUtil.showModalLoading();
            }
        }, 100);

        return hasDataChanged().then(function(changed) {
           if (modal) {
                modal.dismiss();
            } else {
                showModal = false;
            }

            if (changed) {
                return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
            }
        }).then(function() {
            // Nothing has changed or user confirmed to leave.
            // Clear temporary data from plugins.
            $mmaModAssignHelper.clearSubmissionPluginTmpData($scope.assign, $scope.userSubmission, getInputData());
            // Leave the view.
            originalBackFunction();
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            }
            return $q.reject();
        }).finally(function() {
           if (modal) {
                modal.dismiss();
            } else {
                showModal = false;
            }
        });
    }

    fetchAssignment().finally(function() {
        $scope.assignmentLoaded = true;
    });

    // Override Ionic's back button behavior.
    $rootScope.$ionicGoBack = leaveView;
    // Override Android's back button. We set a priority of 101 to override the "Return to previous view" action.
    unregisterHardwareBack = $ionicPlatform.registerBackButtonAction(leaveView, 101);

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description);
    };

    // Save the submission.
    $scope.save = function() {
        // Check if data has changed.
        hasDataChanged().then(function(changed) {
            if (changed) {
                saveSubmission().then(function() {
                    originalBackFunction();
                });
            } else {
                // Nothing to save, just go back.
                originalBackFunction();
            }
        });
    };

    // Cancel.
    $scope.cancel = function() {
        leaveView();
    };

    $scope.$on('$destroy', function() {
        // Restore original back functions.
        unregisterHardwareBack();
        $rootScope.$ionicGoBack = originalBackFunction;
    });
});
