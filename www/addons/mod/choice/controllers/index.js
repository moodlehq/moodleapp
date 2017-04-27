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
.controller('mmaModChoiceIndexCtrl', function($scope, $stateParams, $mmaModChoice, $mmUtil, $mmCourseHelper, $q, $mmCourse, $mmText,
            mmaModChoiceComponent, mmaModChoiceAutomSyncedEvent, $mmSite, $mmEvents, $mmaModChoiceSync, $ionicScrollDelegate,
            $mmaModChoiceOffline, $mmApp, $translate, mmCoreEventOnlineStatusChanged) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        choice,
        userId = $mmSite.getUserId(),
        scrollView,
        syncObserver, onlineObserver,
        hasAnsweredOnline = false;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('choice');
    $scope.courseId = courseId;
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModChoiceComponent;
    $scope.componentId = module.id;

    // Convenience function to get choice data.
    function fetchChoiceData(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();
        $scope.now = new Date().getTime();
        return $mmaModChoice.getChoice(courseId, module.id).then(function(choicedata) {
            choice = choicedata;
            choice.timeopen = parseInt(choice.timeopen) * 1000;
            choice.openTimeReadable = moment(choice.timeopen).format('LLL');
            choice.timeclose = parseInt(choice.timeclose) * 1000;
            choice.closeTimeReadable = moment(choice.timeclose).format('LLL');

            $scope.title = choice.name || $scope.title;
            $scope.description = choice.intro || $scope.description;
            $scope.choice = choice;

            if (sync) {
                // Try to synchronize the choice.
                return syncChoice(showErrors).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            // Check if there are responses stored in offline.
            return $mmaModChoiceOffline.hasResponse(choice.id);
        }).then(function(hasOffline) {
            $scope.hasOffline = hasOffline;

            // We need fetchOptions to finish before calling fetchResults because it needs hasAnsweredOnline variable.
            return fetchOptions(hasOffline).then(function() {
                return fetchResults();
            });
        }).then(function() {
            // All data obtained, now fill the context menu.
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModChoiceComponent);
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData(sync);
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
    function fetchOptions(hasOffline) {
        return $mmaModChoice.getOptions(choice.id).then(function(options) {
            var promise;

            // Check if the user has answered (synced) to allow show results.
            hasAnsweredOnline = false;
            angular.forEach(options, function(option) {
                hasAnsweredOnline = hasAnsweredOnline || option.checked;
            });

            if (hasOffline) {
                promise = $mmaModChoiceOffline.getResponse(choice.id).then(function(response) {
                    var optionsKeys = {};
                    angular.forEach(options, function(option) {
                        optionsKeys[option.id] = option;
                    });

                    // Update options with the offline data.
                    if (response.deleting) {
                        // Uncheck selected options.
                        if (response.responses.length > 0) {
                            // Uncheck all options selected in responses.
                            angular.forEach(response.responses, function(selected) {
                                if (optionsKeys[selected] && optionsKeys[selected].checked) {
                                    optionsKeys[selected].checked = false;
                                    optionsKeys[selected].countanswers--;
                                }
                            });
                        } else {
                            // On empty responses, uncheck all selected.
                            angular.forEach(optionsKeys, function(option) {
                                if (option.checked) {
                                    option.checked = false;
                                    option.countanswers--;
                                }
                            });
                        }
                    } else {
                        // Uncheck all options to check again the offlines'.
                        angular.forEach(optionsKeys, function(option) {
                            if (option.checked) {
                                option.checked = false;
                                option.countanswers--;
                            }
                        });
                        // Then check selected ones.
                        angular.forEach(response.responses, function(selected) {
                            if (optionsKeys[selected]) {
                                optionsKeys[selected].checked = true;
                                optionsKeys[selected].countanswers++;
                            }
                        });
                    }
                    // Convert it again to array.
                    return Object.keys(optionsKeys).map(function (key) {return optionsKeys[key]});
                });
            } else {
                promise = $q.when(options);
            }

            promise.then(function(options) {
                var isOpen = isChoiceOpen();

                var hasAnswered = false;
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
        });
    }

    // Convenience function to get choice results.
    function fetchResults() {
        return $mmaModChoice.getResults(choice.id).then(function(results) {
            var hasVotes = false;
            $scope.data = [];
            $scope.labels = [];
            angular.forEach(results, function(result) {
                if (result.numberofuser > 0) {
                    hasVotes = true;
                }
                result.percentageamount = parseFloat(result.percentageamount).toFixed(1);
                $scope.data.push(result.numberofuser);
                $scope.labels.push(result.text);
            });
            $scope.canSeeResults = hasVotes || $mmaModChoice.canStudentSeeResults(choice, hasAnsweredOnline);
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
    function refreshAllData(sync, showErrors) {
        var p1 = $mmaModChoice.invalidateChoiceData(courseId),
            p2 = choice ? $mmaModChoice.invalidateOptions(choice.id) : $q.when(),
            p3 = choice ? $mmaModChoice.invalidateResults(choice.id) : $q.when();

        return $q.all([p1, p2, p3]).finally(function() {
            return fetchChoiceData(true, sync, showErrors);
        });
    }

    fetchChoiceData(false, true).then(function() {
        $mmaModChoice.logView(choice.id).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }).finally(function() {
        $scope.choiceLoaded = true;
        $scope.refreshIcon = 'ion-refresh';
        $scope.syncIcon = 'ion-loop';
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
            $mmaModChoice.submitResponse(choice.id, choice.name, courseId, responses).then(function() {
                // Success!
                // Check completion since it could be configured to complete once the user answers the choice.
                $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
                scrollTop();
                // Let's refresh the data.
                return refreshAllData(false);
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
            $mmaModChoice.deleteResponses(choice.id, choice.name, courseId).then(function() {
                scrollTop();
                // Success! Let's refresh the data.
                return refreshAllData(false);
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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModChoiceComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshChoice = function(showErrors) {
        if ($scope.choiceLoaded) {
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
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModChoiceScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // Tries to synchronize the choice.
    function syncChoice(showErrors) {
        return $mmaModChoiceSync.syncChoice(choice.id, userId).then(function(result) {
            if (result.warnings && result.warnings.length) {
                $mmUtil.showErrorModal(result.warnings[0]);
            }

            return result.updated;
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

    // Refresh data if this choice is synchronized automatically.
    syncObserver = $mmEvents.on(mmaModChoiceAutomSyncedEvent, function(data) {
        if (choice && data && data.siteid == $mmSite.getId() && data.choiceid == choice.id && data.userid == userId) {
            // Refresh the data.
            $scope.choiceLoaded = false;
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            scrollTop();
            refreshAllData(false).finally(function() {
                $scope.choiceLoaded = true;
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