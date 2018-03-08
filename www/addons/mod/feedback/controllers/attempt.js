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

angular.module('mm.addons.mod_feedback')

/**
 * Feedback attempt review controller.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc controller
 * @name mmaModFeedbackAttemptCtrl
 */
.controller('mmaModFeedbackAttemptCtrl', function($scope, $stateParams, $mmaModFeedback, $mmUtil, $q, $mmText, $ionicHistory,
            $mmaModFeedbackHelper, mmaModFeedbackComponent) {

    var feedbackId = $stateParams.feedbackid || 0;

    $scope.attempt = $stateParams.attempt || false;
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = $stateParams.moduleid;

    // Convenience function to get feedback data.
    function fetchFeedbackAttemptData() {
        return $mmaModFeedback.getItems(feedbackId).then(function(items) {
            // Add responses and format items.
            $scope.items = items.items.map(function(item) {
                if (item.typ == 'label') {
                    item.submittedValue = $mmText.replacePluginfileUrls(item.presentation, item.itemfiles);
                } else {
                    for (var x in $scope.attempt.responses) {
                        if ($scope.attempt.responses[x].id == item.id) {
                            item.submittedValue = $scope.attempt.responses[x].printval;
                            delete $scope.attempt.responses[x];
                            break;
                        }
                    }
                }
                return $mmaModFeedbackHelper.getItemForm(item, true);
            });

        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            // Some call failed on first fetch, go back.
            $ionicHistory.goBack();
            return $q.reject();
        }).finally(function(){
            $scope.feedbackLoaded = true;
        });
    }

    fetchFeedbackAttemptData();
});