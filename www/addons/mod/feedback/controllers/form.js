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
            $mmContentLinksHelper,mmaModFeedbackEventFormSubmitted, $translate, $mmaModFeedbackSync, $mmCourse) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        currentPage = $stateParams.page,
        feedback,
        siteAfterSubmit,
        scrollView,
        onlineObserver,
        submitted = false,
        originalData,
        blockData;

    $scope.title = $stateParams.title;
    $scope.courseId = courseId;
    $scope.component = mmaModFeedbackComponent;
    $scope.componentId = module.id;
    $scope.preview = !!$stateParams.preview;
    $scope.offline = false;

    // Block leaving the view, we want to save changes before leaving.
    blockData = $mmUtil.blockLeaveView($scope, leavePlayer);

    // Convenience function to get feedback data.
    function fetchFeedbackFormData() {
        $scope.offline = !$mmApp.isOnline();

        return $mmaModFeedback.getFeedback(courseId, module.id).then(function(feedbackData) {
            feedback = feedbackData;

            $scope.title = feedback.name || $scope.title;
            $scope.feedback = feedback;

            return fetchAccessData();
        }).then(function(accessData) {
            if (!$scope.preview && accessData.cansubmit && !accessData.isempty) {
                return typeof currentPage == "undefined" ? $mmaModFeedback.getResumePage(feedback.id, $scope.offline, true) :
                    $q.when(currentPage);
            } else {
                $scope.preview = true;
                return $q.when(0);
            }
        }).catch(function(error) {
            if (!$scope.offline && !$mmUtil.isWebServiceError(error)) {
                // If it fails, go offline.
                $scope.offline = true;
                return $mmaModFeedback.getResumePage(feedback.id, true);
            }
            return $q.reject(error);
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

    // Fetch access information.
    function fetchAccessData() {
        return $mmaModFeedback.getFeedbackAccessInformation(feedback.id, $scope.offline, true).catch(function(error) {
            if (!$scope.offline && !$mmUtil.isWebServiceError(error)) {
                // If it fails, go offline.
                $scope.offline = true;
                return $mmaModFeedback.getFeedbackAccessInformation(feedback.id, true);
            }
            return $q.reject(error);
         }).then(function(accessData) {
            $scope.access = accessData;

            return accessData;
         });
    }

    function fetchFeedbackPageData(page) {
        var promise;
        $scope.items = [];

        if ($scope.preview) {
            promise = $mmaModFeedback.getItems(feedback.id);
        } else {
            currentPage = page;

            promise = $mmaModFeedback.getPageItemsWithValues(feedback.id, page, $scope.offline, true).catch(function(error) {
                if (!$scope.offline && !$mmUtil.isWebServiceError(error)) {
                    // If it fails, go offline.
                    $scope.offline = true;
                    return $mmaModFeedback.getPageItemsWithValues(feedback.id, page, true);
                }
                return $q.reject(error);
            }).then(function(response) {
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
                originalData = $mmaModFeedbackHelper.getPageItemsResponses(angular.copy($scope.items));
            }
        });
    }

    // Function to allow page navigation through the questions form.
    $scope.gotoPage = function(goPrevious) {
        scrollTop();
        $scope.feedbackLoaded = false;

        var responses = $mmaModFeedbackHelper.getPageItemsResponses($scope.items),
            formHasErrors = false;

        for (var x in $scope.items) {
            if ($scope.items[x].isEmpty || $scope.items[x].hasError) {
                formHasErrors = true;
                break;
            }
        }

        // Sync other pages first.
        return $mmaModFeedbackSync.syncFeedback(feedback.id).catch(function() {
            // Ignore errors.
        }).then(function() {
            return $mmaModFeedback.processPage(feedback.id, currentPage, responses, goPrevious, formHasErrors, courseId).then(function(response) {
                var jumpTo = parseInt(response.jumpto, 10);

                if (response.completed) {
                    // Form is completed, show completion message and buttons.
                    $scope.items = [];
                    $scope.completed = true;
                    $scope.completedOffline = !!response.offline;
                    $scope.completionPageContents = response.completionpagecontents;
                    siteAfterSubmit = response.siteaftersubmit;
                    submitted = true;

                    // Invalidate access information so user will see home page updated (continue form or completion messages).
                    var promises = [];
                    promises.push($mmaModFeedback.invalidateFeedbackAccessInformationData(feedback.id));
                    promises.push($mmaModFeedback.invalidateResumePageData(feedback.id));

                    return $q.all(promises).then(function () {
                        return fetchAccessData();
                    });
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
            });
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

    // Request another captcha.
    $scope.requestCaptcha = function(item) {
        var modal = $mmUtil.showModalLoading();
        $mmaModFeedback.getPageItems(feedback.id, currentPage).then(function(response) {
            for (var x in response.items) {
                if (response.items[x].typ == 'captcha') {
                    response.items[x] = $mmaModFeedbackHelper.getItemForm(response.items[x], false);
                    if (response.items[x].captcha) {
                        item.value = "";
                        item.captcha = response.items[x].captcha;
                    }
                    break;
                }
            }
        }).finally(function() {
            modal.dismiss();
        });
    };

    // Function to link implemented features.
    $scope.showAnalysis = function() {
        submitted = 'analysis';
        $mmaModFeedbackHelper.openFeature('analysis', module, courseId);
    };

    fetchFeedbackFormData().then(function() {
        $mmaModFeedback.logView(feedback.id, true).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    });

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
        $scope.offline = !online;
    });

    $scope.$on('$destroy', function() {
        if (submitted) {
            var tab = submitted = 'analysis' ? 'analysis' : 'overview';
            // If form has been submitted, the info has been already invalidated but we should update index view.
            $mmEvents.trigger(mmaModFeedbackEventFormSubmitted, {feedbackId: feedback.id, tab: tab});
        }
        onlineObserver && onlineObserver.off && onlineObserver.off();
    });
});
