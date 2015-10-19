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

angular.module('mm.addons.mod_survey')

/**
 * Survey index controller.
 *
 * @module mm.addons.mod_survey
 * @ngdoc controller
 * @name mmaModSurveyIndexCtrl
 */
.controller('mmaModSurveyIndexCtrl', function($scope, $stateParams, $mmaModSurvey, $mmUtil, $q, $mmCourse, $translate,
            $ionicPlatform, $ionicScrollDelegate) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        survey,
        scrollView;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleurl = module.url;
    $scope.courseid = courseid;
    $scope.answers = {};
    $scope.isTablet = $ionicPlatform.isTablet();

    // Convenience function to get survey data.
    function fetchSurveyData() {
        return $mmaModSurvey.getSurvey(courseid, module.id).then(function(surveydata) {
            survey = surveydata;

            $scope.title = survey.name || $scope.title;
            $scope.description = survey.intro || $scope.description;
            $scope.survey = survey;

            if (!survey.surveydone) {
                return fetchQuestions();
            }
        }).catch(function(message) {
            if (message) {
                $mmUtil.showErrorModal(message);
            } else {
                $mmUtil.showErrorModal('mma.mod_survey.errorgetsurvey', true);
            }
            return $q.reject();
        });
    }

    // Convenience function to get survey questions.
    function fetchQuestions() {
        return $mmaModSurvey.getQuestions(survey.id).then(function(questions) {
            return $mmaModSurvey.formatQuestions(questions).then(function(formatted) {
                $scope.questions = formatted;

                // Init answers object.
                angular.forEach(formatted, function(q) {
                    if (q.name) {
                        var isTextArea = q.multi && q.multi.length === 0 && q.type === 0;
                        $scope.answers[q.name] = q.required ? -1 : (isTextArea ? '' : '0');
                    }
                });
            });
        });
    }

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var p1 = $mmaModSurvey.invalidateSurveyData(courseid),
            p2 = survey ? $mmaModSurvey.invalidateQuestions(survey.id) : $q.when();

        return $q.all([p1, p2]).finally(function() {
            return fetchSurveyData();
        });
    }

    fetchSurveyData().then(function() {
        $mmaModSurvey.logView(survey.id).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    }).finally(function() {
        $scope.surveyLoaded = true;
    });

    // Check if answers are valid to be submitted.
    $scope.isValidResponse = function() {
        var valid = true;
        angular.forEach($scope.answers, function(a) {
            if (a === -1) {
                valid = false;
            }
        });
        return valid;
    };

    // Save options selected.
    $scope.submit = function() {
        $mmUtil.showConfirm($translate('mm.core.areyousure')).then(function() {
            var answers = [],
                modal = $mmUtil.showModalLoading('mm.core.sending', true);

            angular.forEach($scope.answers, function(value, key) {
                answers.push({
                    key: key,
                    value: value
                });
            });

            $mmaModSurvey.submitAnswers(survey.id, answers).then(function() {
                if (!scrollView) {
                    scrollView = $ionicScrollDelegate.$getByHandle('mmaModSurveyScroll');
                }
                scrollView && scrollView.scrollTop && scrollView.scrollTop();
                return refreshAllData();
            }).catch(function(message) {
                if (message) {
                    $mmUtil.showErrorModal(message);
                } else {
                    $mmUtil.showErrorModal('mma.mod_survey.cannotsubmitsurvey', true);
                }
            }).finally(function() {
                modal.dismiss();
            });
        });
    };

    // Pull to refresh.
    $scope.refreshSurvey = function() {
        refreshAllData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
