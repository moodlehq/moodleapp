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
 * Controller to add/edit an assign feedback.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name mmaModAssignFeedbackEditCtrl
 */
.controller('mmaModAssignFeedbackEditCtrl', function($scope, $stateParams, $q, $mmUtil, $translate, $mmSite,
        $mmaModAssignFeedbackDelegate, $mmEvents, mmaModAssignFeedbackSavedEvent) {

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    var blockData = $mmUtil.blockLeaveView($scope, leaveView);

    $scope.assign = $stateParams.assign;
    $scope.plugin = $stateParams.plugin;
    $scope.userId = $stateParams.userid;
    $scope.submission = $stateParams.submission;

    // Function called when user wants to leave view without saving.
    function leaveView() {
        return hasDataChanged().then(function(changed) {
            if (changed) {
                return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
            }
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            }
            return $q.reject();
        });
    }

    // Get the input data.
    function getInputData() {
        return $mmUtil.getInfoValuesFromForm(document.forms['mma-mod_assign-edit-form']);
    }

    // Check if data has changed.
    function hasDataChanged() {
        return $mmaModAssignFeedbackDelegate.hasPluginDataChanged($scope.assign, $scope.userId, $scope.plugin, getInputData()).catch(function() {
            // Ignore errors.
            return true;
        });
    }

    // Save the feedback as draft.
    function saveFeedback() {
        return $mmaModAssignFeedbackDelegate.getFeedbackDataToDraft($scope.plugin, getInputData()).then(function(pluginData) {
            if (!pluginData) {
                // Nothing something to save.
                return;
            }

            var assignId = $scope.assign.id;

            return $mmaModAssignFeedbackDelegate.saveFeedbackDraft(assignId, $scope.userId, $scope.plugin, pluginData)
                    .then(function() {
                // Feedback saved, trigger event.
                var params = {
                    assignmentId: assignId,
                    userId: $scope.userId,
                    pluginType: $scope.plugin.type,
                    siteId: $mmSite.getId()
                };
                $mmEvents.trigger(mmaModAssignFeedbackSavedEvent, params);
            });
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error saving feedback.');
            return $q.reject();
        });
    }

    // General done function that will delegate onto the directive throught the trigger.
    $scope.done = function() {
        // Check if data has changed.
        hasDataChanged().then(function(changed) {
            if (changed) {
                saveFeedback().then(function() {
                    blockData && blockData.back();
                });
            } else {
                // Nothing to save, just go back.
                blockData && blockData.back();
            }
        });
    };
});
