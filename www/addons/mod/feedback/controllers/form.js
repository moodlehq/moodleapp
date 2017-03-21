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
            $ionicScrollDelegate, $ionicHistory, $mmContentLinksHelper, $mmSite, $state) {
    var feedbackId = $stateParams.feedbackid,
        module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        currentPage = $stateParams.page,
        feedback,
        siteAfterSubmit,
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

            promise = $mmaModFeedbackHelper.getPageItems(feedback.id, page).then(function(response) {
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
        });
    }

    // Convenience function to refresh all the data.
    function refreshAllData(showErrors) {
        var promises = [];
        promises.push($mmaModFeedback.invalidateFeedbackData(courseId));
        if (feedback) {
            promises.push($mmaModFeedback.invalidateFeedbackAccessInformationData(feedback.id));
            promises.push($mmaModFeedback.invalidateResumePageData(feedback.id));
            if (!$scope.preview) {
                promises.push($mmaModFeedback.invalidateCurrentValuesData(feedback.id));
            }
            promises.push($mmaModFeedback.invalidateItemsData(feedback.id));
        }

        return $q.all(promises).finally(function() {
            return fetchFeedbackFormData(true, showErrors);
        });
    }

    // Function to go to move through the questions form.
    $scope.gotoPage = function(goPrevious) {
        var responses = {},
            promise;

        var modal = $mmUtil.showModalLoading();
        scrollTop();

        angular.forEach($scope.items, function(itemData) {
            if (itemData.hasvalue || itemData.typ == "captcha") {
                var name, value,
                    nameTemp = itemData.typ + '_' + itemData.id,
                    answered = false;
                if (itemData.typ == "multichoice" && itemData.subtype == 'c') {
                    name = nameTemp + '[0]';
                    responses[name] = 0;
                    angular.forEach(itemData.choices, function(choice, index) {
                        name = nameTemp + '[' + (index + 1) + ']';
                        value = choice.checked ? choice.value : 0;
                        if (!answered && value) {
                            answered = true;
                        }
                        responses[name] = value;
                    });
                } else {
                    if (itemData.typ == "multichoice") {
                        name = nameTemp + '[0]';
                        value = itemData.value || 0;
                    } else if (itemData.typ == "multichoicerated") {
                        name = nameTemp;
                        value = itemData.value || 0;
                    } else {
                        name = nameTemp;
                        value = itemData.value || "";
                    }

                    answered = !!value;
                    responses[name] = value;
                }

                if (itemData.required && !answered) {
                    // Check if it has any value.
                    itemData.isEmpty = true;
                } else {
                    itemData.isEmpty = false;
                }
            }
        });

        return $mmaModFeedback.processPage(feedback.id, currentPage, responses, goPrevious).then(function(response) {
            var jumpTo = parseInt(response.jumpto, 10);

            if (response.completed) {
                // Form is completed, show completion message and buttons.
                $scope.items = [];
                $scope.completed = true;
                $scope.completionPageContents = response.completionpagecontents;
                siteAfterSubmit = response.siteaftersubmit;

                // Invalidate access information so user will see home page updated (continue form or completion messages).
                // No need to wait the promises to finish.
                $mmaModFeedback.invalidateFeedbackAccessInformationData(feedback.id);
                $mmaModFeedback.invalidateResumePageData(feedback.id);
            } else if (isNaN(jumpTo) || jumpTo == currentPage) {
                // Errors on questions, stay in page.
                return $q.when();
            } else {
                // Invalidate access information so user will see home page updated (continue form).
                $mmaModFeedback.invalidateResumePageData(feedback.id);
                // Fetch the new page.
                return fetchFeedbackPageData(jumpTo);
            }
        }).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            modal.dismiss();
        });
    };

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

    // Function to discard and go back.
    $scope.cancel = function() {
        // @todo
        $ionicHistory.goBack();
    };

    // Function to link implemented features.
    $scope.openFeature = function(feature) {
        $mmaModFeedbackHelper.openFeature(feature, module, courseId);
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
