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
.controller('mmaModFeedbackFormCtrl', function($scope, $stateParams, $mmaModFeedback, $mmUtil, $q, $timeout, $mmSite, $state,
            mmaModFeedbackComponent, $mmEvents, $mmApp, mmCoreEventOnlineStatusChanged, $mmaModFeedbackHelper, $ionicScrollDelegate,
            $ionicHistory, $mmContentLinksHelper,mmaModFeedbackEventFormSubmitted, $translate) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        currentPage = $stateParams.page,
        feedback,
        siteAfterSubmit,
        scrollView,
        onlineObserver,
        offline = false,
        submitted = false,
        originalData,
        blockData;

    $scope.title = $stateParams.title;
    $scope.courseId = courseId;
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = module.id;
    $scope.preview = !!$stateParams.preview;

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    // Convenience function to get feedback data.
    function fetchFeedbackFormData() {
        offline = !$mmApp.isOnline();

        return $mmaModFeedback.getFeedback(courseId, module.id).then(function(feedbackData) {
            feedback = feedbackData;

            $scope.title = feedback.name || $scope.title;
            $scope.feedback = feedback;

            return $mmaModFeedback.getFeedbackAccessInformation(feedback.id, offline, true);
        }).then(function(accessData) {
            $scope.access = accessData;

            if (!$scope.preview && accessData.cancomplete && accessData.cansubmit && !accessData.isempty) {
                return typeof currentPage == "undefined" ? $mmaModFeedback.getResumePage(feedback.id, offline, true) : $q.when(currentPage);
            } else {
                $scope.preview = true;
                return $q.when(0);
            }
        }).then(function(page) {
            page = page || 0;
            return fetchFeedbackPageData(page);
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            blockData && blockData.back();
            return $q.reject();
        }).finally(function() {
            $scope.feedbackLoaded = true;
        });
    }

    function fetchFeedbackPageData(page) {
        var promise;
        $scope.items = [];

        if ($scope.preview) {
            promise = $mmaModFeedback.getItems(feedback.id);
        } else {
            currentPage = page;

            promise = $mmaModFeedbackHelper.getPageItems(feedback.id, page, offline, true).then(function(response) {
                $scope.hasPrevPage = !!response.hasprevpage;
                $scope.hasNextPage = !!response.hasnextpage;

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

            if (!$scope.preview) {
                originalData = $mmaModFeedbackHelper.getPageItemsResponses($scope.items);
            }
        });
    }

    // Function to allow page navigation through the questions form.
    $scope.gotoPage = function(goPrevious) {
        scrollTop();
        $scope.feedbackLoaded = false;

        var responses = $mmaModFeedbackHelper.getPageItemsResponses($scope.items);

        return $mmaModFeedback.processPage(feedback.id, currentPage, responses, goPrevious).then(function(response) {
            var jumpTo = parseInt(response.jumpto, 10);

            if (response.completed) {
                // Form is completed, show completion message and buttons.
                $scope.items = [];
                $scope.completed = true;
                $scope.completionPageContents = response.completionpagecontents;
                siteAfterSubmit = response.siteaftersubmit;
                submitted = true;

                // Invalidate access information so user will see home page updated (continue form or completion messages).
                // No need to wait the promises to finish.
                $mmaModFeedback.invalidateFeedbackAccessInformationData(feedback.id);
                $mmaModFeedback.invalidateResumePageData(feedback.id);
            } else if (isNaN(jumpTo) || jumpTo == currentPage) {
                // Errors on questions, stay in page.
                return $q.when();
            } else {
                submitted = true;
                // Invalidate access information so user will see home page updated (continue form).
                $mmaModFeedback.invalidateResumePageData(feedback.id);
                // Fetch the new page.
                return fetchFeedbackPageData(jumpTo);
            }
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            $scope.feedbackLoaded = true;
        });
    };

    function leavePlayer() {
        if (!$stateParams.preview) {
            var responses = $mmaModFeedbackHelper.getPageItemsResponses($scope.items);
            if ($scope.items && !$scope.completed && originalData) {
                // Form submitted. Check if there is any change.
                if (!$mmUtil.basicLeftCompare(responses, originalData, 3)) {
                     return $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
                }
            }
        }
        return $q.when();
    }

    // Function to go to the page after submit.
    $scope.continue = function() {
        if (siteAfterSubmit) {
            var modal = $mmUtil.showModalLoading();
            $mmContentLinksHelper.handleLink(siteAfterSubmit).then(function(treated) {
                if (!treated) {
                    return $mmSite.openInBrowserWithAutoLoginIfSameSite(siteAfterSubmit);
                }
            }).finally(function() {
                modal.dismiss();
            });
        } else {
            $state.go('redirect', {
                state: 'site.mm_course',
                params: {
                    courseid: courseId
                }
            });
        }
    };

    // Function to link implemented features.
    $scope.openFeature = function(feature) {
        $mmaModFeedbackHelper.openFeature(feature, module, courseId);
    };

    fetchFeedbackFormData();

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
        offline = !online;
    });

    $scope.$on('$destroy', function() {
        if (submitted) {
            // If form has been submitted, the info has been already invalidated but we should update index view.
            $mmEvents.trigger(mmaModFeedbackEventFormSubmitted, {feedbackId: feedback.id});
        }
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });
});
