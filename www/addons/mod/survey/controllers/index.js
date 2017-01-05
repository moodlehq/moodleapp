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
.controller('mmaModSurveyIndexCtrl', function($scope, $stateParams, $mmaModSurvey, $mmUtil, $q, $mmCourse, $translate, $mmText,
            $ionicPlatform, $ionicScrollDelegate, $mmaModSurveyOffline, mmaModSurveyComponent, $mmaModSurveySync, $mmSite,
            $mmEvents, mmaModSurveyAutomSyncedEvent, $mmApp, $mmEvents, mmCoreEventOnlineStatusChanged) {
    var module = $stateParams.module || {},
        courseid = $stateParams.courseid,
        survey,
        userId = $mmSite.getUserId(),
        scrollView,
        syncObserver, onlineObserver;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('survey');
    $scope.componentId = module.id;
    $scope.courseid = courseid;
    $scope.answers = {};
    $scope.isTablet = $ionicPlatform.isTablet();
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModSurveyComponent;

    // Convenience function to get survey data.
    function fetchSurveyData(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();
        return $mmaModSurvey.getSurvey(courseid, module.id).then(function(surveydata) {
            survey = surveydata;

            $scope.title = survey.name || $scope.title;
            $scope.description = survey.intro || $scope.description;
            $scope.survey = survey;

            if (sync) {
                // Try to synchronize the survey.
                return syncSurvey(showErrors).then(function(answersSent) {
                    if (answersSent) {
                        // Answers were sent, update the survey.
                        return $mmaModSurvey.getSurvey(courseid, module.id).then(function(surveyData) {
                            survey = surveyData;
                            $scope.survey = survey;
                        });
                    }
                }).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            // Check if there are answers stored in offline.
            return $mmaModSurveyOffline.hasAnswers(survey.id);
        }).then(function(hasOffline) {
            if (survey.surveydone) {
                $scope.hasOffline = false;
            } else {
                $scope.hasOffline = hasOffline;
            }

            if (!survey.surveydone && !hasOffline) {
                return fetchQuestions();
            }
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData(sync);
            }

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
    function refreshAllData(sync, showErrors) {
        var p1 = $mmaModSurvey.invalidateSurveyData(courseid),
            p2 = survey ? $mmaModSurvey.invalidateQuestions(survey.id) : $q.when();

        return $q.all([p1, p2]).finally(function() {
            return fetchSurveyData(true, sync, showErrors);
        });
    }

    fetchSurveyData(false, true).then(function() {
        $mmaModSurvey.logView(survey.id).then(function() {
            $mmCourse.checkModuleCompletion(courseid, module.completionstatus);
        });
    }).finally(function() {
        $scope.surveyLoaded = true;
        $scope.refreshIcon = 'ion-refresh';
        $scope.syncIcon = 'ion-loop';
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

            $mmaModSurvey.submitAnswers(survey.id, survey.name, courseid, answers).then(function() {
                scrollTop();
                return refreshAllData(false);
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

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModSurveyComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshSurvey = function(showErrors) {
        if ($scope.surveyLoaded) {
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            return refreshAllData(true, showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModSurveyScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // Tries to synchronize the survey.
    function syncSurvey(showErrors) {
        return $mmaModSurveySync.syncSurvey(survey.id, userId).then(function(result) {
            if (result.warnings && result.warnings.length) {
                $mmUtil.showErrorModal(result.warnings[0]);
            }
            return result.answersSent;
        }).catch(function(error) {
            if (showErrors) {
                if (error) {
                    $mmUtil.showErrorModal(error);
                } else {
                    $mmUtil.showErrorModal('mm.core.errorsync', true);
                }
            }
            return $q.reject();
        });
    }

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Refresh data if this survey is synchronized automatically.
    syncObserver = $mmEvents.on(mmaModSurveyAutomSyncedEvent, function(data) {
        if (survey && data && data.siteid == $mmSite.getId() && data.surveyid == survey.id && data.userid == userId) {
            // Refresh the data.
            $scope.surveyLoaded = false;
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            scrollTop();
            refreshAllData(false).finally(function() {
                $scope.surveyLoaded = true;
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
            });
        }
    });

    $scope.$on('$destroy', function() {
        syncObserver && syncObserver.off && syncObserver.off();
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });
});
