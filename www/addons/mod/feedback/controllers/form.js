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
 * Feedback form controller.
 *
 * @module mm.addons.mod_feedback
 * @ngdoc controller
 * @name mmaModFeedbackFormCtrl
 */
.controller('mmaModFeedbackFormCtrl', function($scope, $stateParams, $mmaModFeedback, $mmUtil, $q, $mmCourse, $mmText, $timeout,
            mmaModFeedbackComponent, $mmEvents, $mmApp, $translate, mmCoreEventOnlineStatusChanged, $mmaModFeedbackHelper,
            $ionicScrollDelegate, $ionicHistory) {
    var feedbackId = $stateParams.feedbackid,
        module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        currentPage = $stateParams.page,
        feedback,
        scrollView;

    $scope.title = $stateParams.title;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('feedback');
    $scope.courseId = courseId;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = module.id;
    $scope.preview = !!$stateParams.preview;

    // Convenience function to get feedback data.
    function fetchFeedbackFormData(refresh, showErrors) {
        $scope.isOnline = $mmApp.isOnline();
        return $mmaModFeedback.getFeedback(courseId, module.id).then(function(feedbackData) {
            feedback = feedbackData;

            $scope.title = feedback.name || $scope.title;
            $scope.description = feedback.intro;

            $scope.feedback = feedback;

            return $mmaModFeedback.getFeedbackAccessInformation(feedback.id);
        }).then(function(accessData) {
            $scope.access = accessData;

            if (!$scope.preview && accessData.cancomplete && accessData.cansubmit && !accessData.isempty) {
                return typeof currentPage == "undefined" ? $mmaModFeedback.getResumePage(feedback.id) : $q.when(currentPage);
            } else {
                $scope.preview = true;
                return $q.when(0);
            }
        }).then(function(page) {
            return fetchFeedbackPageData(page);
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

    function fetchFeedbackPageData(page) {
        var promise;

        if ($scope.preview) {
            promise = $mmaModFeedback.getItems(feedback.id);
        } else {
            currentPage = page;

            promise = $mmaModFeedback.getPageItems(feedback.id, page).then(function(response) {
                $scope.hasPrevPage = response.hasprevpage ? page - 1 : false;
                $scope.hasNextPage = response.hasnextpage ? page + 1 : false;
                return response;
            });
        }
        return promise.then(function(response) {
            $scope.items = response.items.map(function(itemData) {
                return $mmaModFeedbackHelper.getItemForm(itemData, $scope.preview);
            }).filter(function(itemData) {
                // Filter items with errors.
                return itemData;
            });
        });
    }


    // Convenience function to refresh all the data.
    function refreshAllData(showErrors) {
        var promises = [];
        promises.push($mmaModFeedback.invalidateFeedbackData(courseId));
        if (feedback) {
            promises.push($mmaModFeedback.invalidateFeedbackAccessInformationData(feedback.id));
            promises.push($mmaModFeedback.invalidateResumePageData(feedback.id));
            if ($scope.preview) {
                promises.push($mmaModFeedback.invalidateItemsData(feedback.id));
            } else {
                promises.push($mmaModFeedback.invalidateAllPagesData(feedback.id));
            }
        }

        return $q.all(promises).finally(function() {
            return fetchFeedbackFormData(true, showErrors);
        });
    }

    // Function to go to move through the questions form.
    $scope.gotoPage = function(page) {
        $scope.feedbackLoaded = false;
        // @todo: send data and process it. Control required as well.
        return fetchFeedbackPageData(page).finally(function(){
            scrollTop();
            $scope.feedbackLoaded = true;
        });
    };

    // Function to send and save answers.
    $scope.save = function() {
        // @todo
    };

    // Function to discard and go back.
    $scope.cancel = function() {
        // @todo
        $ionicHistory.goBack();
    };

    fetchFeedbackFormData().finally(function() {
        $scope.refreshIcon = 'ion-refresh';
    });

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModFeedbackComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshFeedback = function(showErrors) {
        if ($scope.feedbackLoaded) {
            $scope.refreshIcon = 'spinner';
            return refreshAllData(showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModFeedbackFormScroll');
        }
        $timeout(function() {
            scrollView && scrollView.scrollTop && scrollView.scrollTop();
        });
    }

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });
});
