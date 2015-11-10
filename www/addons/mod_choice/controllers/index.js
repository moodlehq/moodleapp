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

angular.module('mm.addons.mod_choice')

/**
 * Choice index controller.
 *
 * @module mm.addons.mod_choice
 * @ngdoc controller
 * @name mmaModChoiceIndexCtrl
 * @todo Delete answer if user can update the answer, show selected if choice is closed (WS returns empty options).
 */
.controller('mmaModChoiceIndexCtrl', function($scope, $stateParams, $mmaModChoice, $mmUtil, $q, $mmCourse, $translate) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        choice,
        hasAnswered = false;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleurl = module.url;
    $scope.courseid = courseid;

    // Convenience function to get choice data.
    function fetchChoiceData(refresh) {
        $scope.now = new Date().getTime();
        return $mmaModChoice.getChoice(courseid, module.id).then(function(choicedata) {
            choice = choicedata;
            choice.timeopen = parseInt(choice.timeopen) * 1000;
            choice.openTimeReadable = moment(choice.timeopen).format('LLL');
            choice.timeclose = parseInt(choice.timeclose) * 1000;
            choice.closeTimeReadable = moment(choice.timeclose).format('LLL');

            $scope.title = choice.name || $scope.title;
            $scope.description = choice.intro || $scope.description;
            $scope.choice = choice;

            // We need fetchOptions to finish before calling fetchResults because it needs hasAnswered variable.
            return fetchOptions().then(function() {
                return fetchResults();
            });
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.mod_choice.errorgetchoice', true);
            }
            return $q.reject();
        });
    }

    // Convenience function to get choice options.
    function fetchOptions() {
        return $mmaModChoice.getOptions(choice.id).then(function(options) {
            var isOpen = isChoiceOpen();
            hasAnswered = false;
            $scope.selectedOption = {id: -1}; // Single choice model.
            angular.forEach(options, function(option) {
                if (option.checked) {
                    hasAnswered = true;
                    if (!choice.allowmultiple) {
                        $scope.selectedOption.id = option.id;
                    }
                }
            });
            $scope.canEdit = isOpen && (choice.allowupdate || !hasAnswered);
            $scope.canDelete = $mmaModChoice.isDeleteResponsesEnabled() && isOpen && choice.allowupdate && hasAnswered;
            $scope.options = options;
        });
    }

    // Convenience function to get choice results.
    function fetchResults() {
        return $mmaModChoice.getResults(choice.id).then(function(results) {
            var hasVotes = false;
            angular.forEach(results, function(result) {
                if (result.numberofuser > 0) {
                    hasVotes = true;
                }
                result.percentageamount = parseFloat(result.percentageamount).toFixed(1);
            });
            $scope.canSeeResults = hasVotes || $mmaModChoice.canStudentSeeResults(choice, hasAnswered);
            $scope.results = results;
        });
    }

    /**
     * Check if a choice is open.
     *
     * @return {Boolean} True if choice is open, false otherwise.
     */
    function isChoiceOpen() {
        return (choice.timeopen === 0 || choice.timeopen <= $scope.now) &&
                (choice.timeclose === 0 || choice.timeclose > $scope.now);
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var p1 = $mmaModChoice.invalidateChoiceData(courseid),
            p2 = choice ? $mmaModChoice.invalidateOptions(choice.id) : $q.when(),
            p3 = choice ? $mmaModChoice.invalidateResults(choice.id) : $q.when();

        return $q.all([p1, p2, p3]).finally(function() {
            return fetchChoiceData(true);
        });
    }

    fetchChoiceData().then(function() {
        $mmaModChoice.logView(choice.id).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    }).finally(function() {
        $scope.choiceLoaded = true;
    });

    // Save options selected.
    $scope.save = function() {
        // Only show confirm if choice doesn't allow update.
        var promise = choice.allowupdate ? $q.when() : $mmUtil.showConfirm($translate('mm.core.areyousure'));
        promise.then(function() {
            var responses = [];
            if (choice.allowmultiple) {
                angular.forEach($scope.options, function(option) {
                    if (option.checked) {
                        responses.push(option.id);
                    }
                });
            } else {
                responses.push($scope.selectedOption.id);
            }

            var modal = $mmUtil.showModalLoading('mm.core.sending', true);
            $mmaModChoice.submitResponse(choice.id, responses).then(function() {
                // Success! Let's refresh the data.
                return refreshAllData();
            }).catch(function(message) {
                if (message) {
                    $mmUtil.showErrorModal(message);
                } else {
                    $mmUtil.showErrorModal('mma.mod_choice.cannotsubmit', true);
                }
            }).finally(function() {
                modal.dismiss();
            });
        });
    };

    // Delete options selected.
    $scope.delete = function() {
        $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
            var modal = $mmUtil.showModalLoading('mm.core.sending', true);
            $mmaModChoice.deleteResponses(choice.id).then(function() {
                // Success! Let's refresh the data.
                return refreshAllData();
            }).catch(function(message) {
                if (message) {
                    $mmUtil.showErrorModal(message);
                } else {
                    $mmUtil.showErrorModal('mma.mod_choice.cannotsubmit', true);
                }
            }).finally(function() {
                modal.dismiss();
            });
        });
    };

    // Pull to refresh.
    $scope.refreshChoice = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
