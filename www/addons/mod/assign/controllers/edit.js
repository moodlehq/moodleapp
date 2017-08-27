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
        $mmSite, $mmaModAssignHelper, $timeout, $mmEvents, $mmaModAssignOffline, $mmFileUploaderHelper, $mmaModAssignSync,
        mmaModAssignSubmissionSavedEvent, mmaModAssignSubmittedForGradingEvent, $mmSyncBlock) {

    var courseId = $stateParams.courseid,
        userId = $mmSite.getUserId(), // Right now we can only edit current user's submissions.
        isBlind = !!$stateParams.blindid,
        editStr = $translate.instant('mma.mod_assign.editsubmission'),
        saveOffline = false,
        hasOffline = false,
        blockData;

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    blockData = $mmUtil.blockLeaveView($scope, leaveView);

    $scope.title = editStr; // Temporary title.
    $scope.assignComponent = mmaModAssignComponent;
    $scope.courseId = courseId;
    $scope.moduleId = $stateParams.moduleid;
    $scope.allowOffline = false;

    function fetchAssignment() {
        var assign;

        // Get assignment data.
        return $mmaModAssign.getAssignment(courseId, $scope.moduleId).then(function(assignData) {
            assign = assignData;

            $scope.title = assign.name || $scope.title;
            $scope.assign = assign;

            if (!$scope.$$destroyed) {
                // Block the assignment.
                $mmSyncBlock.blockOperation(mmaModAssignComponent, assign.id);
            }

            // Wait for sync to be over (if any).
            return $mmaModAssignSync.waitForSync(assign.id);
        }).then(function() {
            // Get submission status. Ignore cache to get the latest data.
            return $mmaModAssign.getSubmissionStatus(assign.id, userId, isBlind, false, true).catch(function(error) {
                // Cannot connect. Get cached data.
                return $mmaModAssign.getSubmissionStatus(assign.id, userId, isBlind).then(function(response) {
                    var userSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(assign, response.lastattempt);
                    if ($mmaModAssignHelper.canEditSubmissionOffline(assign, userSubmission)) {
                        return response;
                    }

                    // Submission cannot be edited in offline, reject.
                    $scope.allowOffline = false;
                    return $q.reject(error);
                });
            }).then(function(response) {
                if (!response.lastattempt.canedit) {
                    // Can't edit. Reject.
                    return $q.reject($translate.instant('mm.core.nopermissions', {$a: editStr}));
                }

                $scope.userSubmission = $mmaModAssign.getSubmissionObjectFromAttempt(assign, response.lastattempt);
                $scope.allowOffline = true; // If offline isn't allowed we shouldn't have reached this point.

                // Only show submission statement if we are editing our own submission.
                if (assign.requiresubmissionstatement && !assign.submissiondrafts && userId == $mmSite.getUserId()) {
                    $scope.submissionStatement = assign.submissionstatement;
                } else {
                    $scope.submissionStatement = false;
                }

                // Check if there's any offline data for this submission.
                return $mmaModAssignOffline.getSubmission(assign.id, userId).then(function(data) {
                    hasOffline = data && data.plugindata && Object.keys(data.plugindata).length;
                }).catch(function() {
                    // No offline data found.
                    hasOffline = false;
                });
            });
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting assigment data.');
            blockData && blockData.back();
            return $q.reject();
        });
    }

    // Get the input data.
    function getInputData() {
        return $mmaModAssignHelper.getAnswersFromForm(document.forms['mma-mod_assign-edit-form']);
    }

    // Get submission data.
    function prepareSubmissionData(inputData) {
        saveOffline = hasOffline;
        return $mmaModAssignHelper.prepareSubmissionPluginData($scope.assign, $scope.userSubmission, inputData, hasOffline)
                .catch(function(e) {
            if ($scope.allowOffline && !saveOffline) {
                // Cannot submit in online, prepare for offline usage.
                saveOffline = true;
                return $mmaModAssignHelper.prepareSubmissionPluginData($scope.assign, $scope.userSubmission, inputData, true);
            }
            return $q.reject(e);
        });
    }

    // Check if data has changed.
    function hasDataChanged() {
        return $mmaModAssignHelper.hasSubmissionDataChanged($scope.assign, $scope.userSubmission, getInputData());
    }

    // Save the submission.
    function saveSubmission() {
        var modal,
            inputData = getInputData();

        if ($scope.submissionStatement && !inputData.submissionstatement) {
            $mmUtil.showErrorModal('mma.mod_assign.acceptsubmissionstatement', true);
            return $q.reject();
        }

        modal = $mmUtil.showModalLoading();

        // Get size to ask for confirmation.
        return $mmaModAssignHelper.getSubmissionSizeForEdit($scope.assign, $scope.userSubmission, inputData).catch(function() {
            // Error calculating size, return -1.
            return -1;
        }).then(function(size) {
            modal.dismiss();

            // Confirm action.
            return $mmFileUploaderHelper.confirmUploadFile(size, true, $scope.allowOffline).catch(function(message) {
                if (message) {
                    $mmUtil.showErrorModal(message);
                }
                return $q.reject();
            });
        }).then(function() {
            modal = $mmUtil.showModalLoading('mm.core.sending', true);

            return prepareSubmissionData(inputData).then(function(pluginData) {
                if (!Object.keys(pluginData).length) {
                    // Nothing something to save.
                    return;
                }

                var assignId = $scope.assign.id,
                    timemod = $scope.userSubmission.timemodified,
                    drafts = $scope.assign.submissiondrafts,
                    promise;

                if (saveOffline) {
                    // Save submission in offline.
                    promise = $mmaModAssignOffline.saveSubmission(assignId, courseId, pluginData, timemod, !drafts, userId);
                } else {
                    // Try to send it to server.
                    promise = $mmaModAssign.saveSubmission(
                                assignId, courseId, pluginData, $scope.allowOffline, timemod, drafts, userId);
                }

                return promise.then(function() {
                    // Submission saved, trigger event.
                    var params = {
                        assignmentId: assignId,
                        submissionId: $scope.userSubmission.id,
                        userId: userId,
                        siteId: $mmSite.getId()
                    };
                    $mmEvents.trigger(mmaModAssignSubmissionSavedEvent, params);

                    if (!drafts) {
                        // No drafts allowed, so it was submitted. Trigger event.
                        $mmEvents.trigger(mmaModAssignSubmittedForGradingEvent, params);
                    }
                });
            }).catch(function(message) {
                $mmUtil.showErrorModalDefault(message, 'Error saving submission.');
                return $q.reject();
            }).finally(function() {
                modal.dismiss();
            });
        });
    }

    // Function called when user wants to leave view without saving.
    function leaveView() {
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

    // Save the submission.
    $scope.save = function() {
        // Check if data has changed.
        hasDataChanged().then(function(changed) {
            if (changed) {
                saveSubmission().then(function() {
                    blockData && blockData.back();
                });
            } else {
                // Nothing to save, just go back.
                blockData && blockData.back();
            }
        });
    };

    $scope.$on('$destroy', function() {
        // Restore original back functions.
        if ($scope.assign) {
            $mmSyncBlock.unblockOperation(mmaModAssignComponent, $scope.assign.id);
        }
    });
});
