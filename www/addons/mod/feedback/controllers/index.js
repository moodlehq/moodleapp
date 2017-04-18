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
 * Feedback index controller.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc controller
 * @name mmaModFeedbackIndexCtrl
 */
.controller('mmaModFeedbackIndexCtrl', function($scope, $stateParams, $mmaModFeedback, $mmUtil, $mmCourseHelper, $q, $mmCourse,
            $mmText, mmaModFeedbackComponent, $mmEvents, $mmApp, $translate, $mmGroups, $mmaModFeedbackHelper, $mmaModFeedbackSync,
            mmCoreEventOnlineStatusChanged, $state, mmaModFeedbackEventFormSubmitted, $mmaModFeedbackOffline) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        feedback,
        onlineObserver,
        obsSubmitted;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('feedback');
    $scope.courseId = courseId;
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = module.id;
    $scope.selectedGroup = $stateParams.group || 0;

    // Convenience function to get feedback data.
    function fetchFeedbackData(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();
        return $mmaModFeedback.getFeedback(courseId, module.id).then(function(feedbackData) {
            feedback = feedbackData;

            $scope.title = feedback.name || $scope.title;
            $scope.description = feedback.intro || $scope.description;

            $scope.feedback = feedback;

            if (sync) {
                // Try to synchronize the feedback.
                return syncFeedback(showErrors).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            return $mmaModFeedback.getFeedbackAccessInformation(feedback.id);
        }).then(function(accessData) {
            var promises = [];

            $scope.access = accessData;

            if (accessData.cancomplete && accessData.cansubmit && accessData.isopen) {
                promises.push($mmaModFeedback.getResumePage(feedback.id).then(function(goPage) {
                    $scope.goPage = goPage > 0 ? goPage : false;
                }));
            }

            if (accessData.canedititems) {
                feedback.timeopen = parseInt(feedback.timeopen) * 1000 || false;
                feedback.openTimeReadable = feedback.timeopen ? moment(feedback.timeopen).format('LLL') : false;
                feedback.timeclose = parseInt(feedback.timeclose) * 1000 || false;
                feedback.closeTimeReadable = feedback.timeclose ? moment(feedback.timeclose).format('LLL') : false;

                // Get groups (only for teachers).
                promises.push($mmaModFeedbackHelper.getFeedbackGroupInfo(feedback.coursemodule).then(function(groupInfo) {
                    $scope.groupInfo = groupInfo;
                    return $scope.setGroup($scope.selectedGroup);
                }));
            }

            return $q.all(promises);
        }).then(function() {
            // All data obtained, now fill the context menu.
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModFeedbackComponent);

            // Check if there are responses stored in offline.
            return $mmaModFeedbackOffline.hasFeedbackOfflineData(feedback.id).then(function(hasOffline) {
                $scope.hasOffline = !!hasOffline;
            });
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function(){
            $scope.feedbackLoaded = true;
        });
    }

    // Set group to see the analysis.
    $scope.setGroup = function(groupId) {
        $scope.selectedGroup = groupId;

        return $mmaModFeedback.getAnalysis(feedback.id, groupId).then(function(analysis) {
            $scope.feedback.completedCount = analysis.completedcount;
            $scope.feedback.itemsCount = analysis.itemscount;
        });
    };

    // Convenience function to refresh all the data.
    function refreshAllData(sync, showErrors) {
        var promises = [];
        promises.push($mmaModFeedback.invalidateFeedbackData(courseId));
        if (feedback) {
            promises.push($mmaModFeedback.invalidateFeedbackAccessInformationData(feedback.id));
            promises.push($mmaModFeedback.invalidateAnalysisData(feedback.id));
            promises.push($mmaModFeedback.invalidateResumePageData(feedback.id));
            promises.push($mmGroups.invalidateActivityAllowedGroups(feedback.coursemodule));
            promises.push($mmGroups.invalidateActivityGroupMode(feedback.coursemodule));
        }

        return $q.all(promises).finally(function() {
            return fetchFeedbackData(true, sync, showErrors);
        });
    }

    // Tries to synchronize the feedback.
    function syncFeedback(showErrors) {
        return $mmaModFeedbackSync.syncFeedback(feedback.id).then(function(result) {
            if (result.warnings && result.warnings.length) {
                $mmUtil.showErrorModal(result.warnings[0]);
            }

            return result.updated;
        }).catch(function(error) {
            if (showErrors) {
                $mmUtil.showErrorModalDefault(error, 'mm.core.errorsync', true);
            }
            return $q.reject();
        });
    }

    fetchFeedbackData(false, true).then(function() {
        $mmaModFeedback.logView(feedback.id).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }).finally(function() {
        $scope.refreshIcon = 'ion-refresh';
        $scope.syncIcon = 'ion-loop';
    });

    // Confirm and Remove action.
    $scope.removeFiles = function() {
        $mmCourseHelper.confirmAndRemove(module, courseId);
    };

    // Context Menu Prefetch action.
    $scope.prefetch = function() {
        $mmCourseHelper.contextMenuPrefetch($scope, module, courseId);
    };
    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModFeedbackComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshFeedback = function(showErrors) {
        if ($scope.feedbackLoaded) {
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            return refreshAllData(true, showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Function to link implemented features.
    $scope.openFeature = function(feature) {
        $mmaModFeedbackHelper.openFeature(feature, module, courseId, $scope.selectedGroup);
    };

    // Function to go to the questions form.
    $scope.gotoAnswerQuestions = function(preview) {
        var stateParams = {
            module: module,
            moduleid: module.id,
            courseid: courseId,
            preview: !!preview
        };
        $state.go('site.mod_feedback-form', stateParams);
    };

    // Listen for form submit events.
    obsSubmitted = $mmEvents.on(mmaModFeedbackEventFormSubmitted, function(data) {
        // Go to review attempt if an attempt in this quiz was finished and synced.
        if (data.feedbackId === feedback.id) {
            fetchFeedbackData(true);
        }
    });

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
        obsSubmitted && obsSubmitted.off && obsSubmitted.off();
    });
});
