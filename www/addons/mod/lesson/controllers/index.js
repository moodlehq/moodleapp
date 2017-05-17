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

angular.module('mm.addons.mod_lesson')

/**
 * Lesson index controller.
 *
 * @module mm.addons.mod_lesson
 * @ngdoc controller
 * @name mmaModLessonIndexCtrl
 */
.controller('mmaModLessonIndexCtrl', function($scope, $stateParams, $mmaModLesson, $mmCourse, $q, $translate, $ionicScrollDelegate,
            $mmEvents, $mmText, $mmUtil, $mmCourseHelper, mmaModLessonComponent, $mmApp, $state, mmCoreEventOnlineStatusChanged,
            $ionicHistory, mmCoreEventPackageStatusChanged, mmCoreDownloading, mmCoreDownloaded, $mmCoursePrefetchDelegate,
            $mmaModLessonPrefetchHandler, $mmSite, $mmaModLessonSync, mmaModLessonAutomSyncedEvent, $mmGroups, $mmUser) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        lesson,
        accessInfo,
        scrollView,
        onlineObserver,
        password,
        currentStatus,
        statusObserver, syncObserver;

    // Constants for display modes.
    $scope.DISPLAY_VIEW = 'view';
    $scope.DISPLAY_REPORTS = 'reports';

    $scope.title = module.name;
    $scope.courseId = courseId;
    $scope.moduleUrl = module.url;
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModLessonComponent;
    $scope.componentId = module.id;
    $scope.moduleName = $mmCourse.translateModuleName('lesson');
    $scope.data = {
        password: ''
    };
    $scope.display = $stateParams.action == 'report' ? $scope.DISPLAY_REPORTS : $scope.DISPLAY_VIEW;
    $scope.selectedGroup = $stateParams.group || 0;

    // Convenience function to get Lesson data.
    function fetchLessonData(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();
        $scope.askPassword = false;

        return $mmaModLesson.getLesson(courseId, module.id).then(function(lessonData) {
            lesson = lessonData;
            $scope.lesson = lesson;

            $scope.title = lesson.name || $scope.title;
            $scope.description = lesson.intro; // Show description only if intro is present.

            if (sync) {
                // Try to synchronize the lesson.
                return syncLesson(showErrors).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            return $mmaModLesson.getAccessInformation(lesson.id);
        }).then(function(info) {
            var promises = [],
                promise;

            accessInfo = info;
            $scope.canManage = info.canmanage;
            $scope.canViewReports = info.canviewreports;

            if ($mmaModLesson.isLessonOffline(lesson)) {
                // Handle status.
                setStatusListener();
                getStatus().then(updateStatus);

                // Check if there is offline data.
                promises.push($mmaModLessonSync.hasDataToSync(lesson.id, info.attemptscount).then(function(hasOffline) {
                    $scope.hasOffline = hasOffline;
                }));

                // Check if there is a retake finished in a synchronization.
                promises.push($mmaModLessonSync.getRetakeFinishedInSync(lesson.id).then(function(retake) {
                    if (retake && retake.retake == accessInfo.attemptscount - 1) {
                        // The retake finished is still the last retake. Allow reviewing it.
                        $scope.retakeToReview = retake;
                    } else {
                        $scope.retakeToReview = undefined;
                        if (retake) {
                            $mmaModLessonSync.deleteRetakeFinishedInSync(lesson.id);
                        }
                    }
                }));

                // Update the list of content pages viewed and question attempts.
                promises.push($mmaModLesson.getContentPagesViewedOnline(lesson.id, accessInfo.attemptscount));
                promises.push($mmaModLesson.getQuestionsAttemptsOnline(lesson.id, accessInfo.attemptscount));
            }

            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                var askPassword = info.preventaccessreasons.length == 1 && $mmaModLesson.isPasswordProtected(info);
                if (askPassword) {
                    // The lesson requires a password. Check if there is one in memory or DB.
                    promise = password ? $q.when(password) : $mmaModLesson.getStoredPassword(lesson.id);

                    return promise.then(function(pwd) {
                        return validatePassword(pwd, refresh);
                    }).catch(function() {
                        // No password or the validation failed. Show password form.
                        $scope.askPassword = true;
                        $scope.preventMessages = info.preventaccessreasons;
                    });
                } else  {
                    // Lesson cannot be started, stop.
                    $scope.preventMessages = info.preventaccessreasons;
                    return;
                }
            }

            if ($scope.display == $scope.DISPLAY_REPORTS) {
                promises.push(fetchReportData());
            }

            return $q.all(promises).then(function() {
                // Lesson can be started, don't ask the password and don't show prevent messages.
                fetchDataFinished(refresh);
            });
        }).catch(function(message) {
            if (!refresh && !lesson) {
                // Get lesson failed, retry without using cache since it might be a new activity.
                return refreshData(sync, showErrors);
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        });
    }

    // Tries to synchronize the lesson.
    function syncLesson(showErrors) {
        return $mmaModLessonSync.syncLesson(lesson.id, true).then(function(result) {
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

    // Function called when all the data has been fetched.
    function fetchDataFinished(refresh, pwd) {
        password = pwd;
        $scope.data.password = '';
        $scope.askPassword = false;
        $scope.preventMessages = [];
        $scope.leftDuringTimed = $scope.hasOffline || $mmaModLesson.leftDuringTimed(accessInfo);

        if (pwd) {
            // Store the password in DB.
            $mmaModLesson.storePassword(lesson.id, password);
        }

        // All data obtained, now fill the context menu.
        $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModLessonComponent);
    }

    // Fetch the reports data.
    function fetchReportData() {
        return $mmGroups.getActivityGroupInfo(module.id).then(function(groupInfo) {
            $scope.groupInfo = groupInfo;

            return setGroup($scope.selectedGroup);
        }).finally(function() {
            $scope.reportLoaded = true;
        });
    }

    // Set a group to view the reports.
    function setGroup(groupId) {
        $scope.selectedGroup = groupId;
        $scope.selectedGroupName = false;

        // Search the name of the group if it's not participants.
        if (groupId) {
            for (var i = 0; i < $scope.groupInfo.groups.length; i++) {
                var group = $scope.groupInfo.groups[i];
                if (groupId == group.id) {
                    $scope.selectedGroupName = group.name;
                    break;
                }
            }
        }

        return $mmaModLesson.getRetakesOverview(lesson.id, groupId).then(function(data) {
            var promises = [];

            // Format times and grades.
            if (data && data.avetime != null && data.numofattempts) {
                data.avetime = parseInt(data.avetime / data.numofattempts, 10);
                data.avetimeReadable = $mmUtil.formatTimeInstant(data.avetime);
            }

            if (data && data.hightime != null) {
                data.hightimeReadable = $mmUtil.formatTimeInstant(data.hightime);
            }

            if (data && data.lowtime != null) {
                data.lowtimeReadable = $mmUtil.formatTimeInstant(data.lowtime);
            }

            if (data && data.lessonscored) {
                if (data.numofattempts) {
                    data.avescore = $mmUtil.roundToDecimals(data.avescore, 2);
                }
                if (data.highscore != null) {
                    data.highscore = $mmUtil.roundToDecimals(data.highscore, 2);
                }
                if (data.lowscore != null) {
                    data.lowscore = $mmUtil.roundToDecimals(data.lowscore, 2);
                }
            }

            // Get the user data for each student returned.
            angular.forEach(data && data.students, function(student) {
                student.bestgrade = $mmUtil.roundToDecimals(student.bestgrade, 2);

                promises.push($mmUser.getProfile(student.id, courseId, true).then(function(user) {
                    student.profileimageurl = user.profileimageurl;
                }).catch(function() {
                    // Error getting profile, resolve promise without adding any extra data.
                }));
            });

            return $mmUtil.allPromises(promises).catch(function() {
                // Shouldn't happen.
            }).then(function() {
                $scope.overview = data;
            });
        });
    }

    // Validate a password and retrieve extra data.
    function validatePassword(pwd, refresh) {
        return $mmaModLesson.getLessonWithPassword(lesson.id, pwd).then(function(lessonData) {
            lesson = lessonData;

            // Password validated, remove the form and the prevent message.
            fetchDataFinished(refresh, pwd);

            // Log view now that we have the password.
            logView();
        }).catch(function(error) {
            password = '';
            return $q.reject(error);
        });
    }

    // Refreshes data.
    function refreshData(sync, showErrors) {
        var promises = [];

        promises.push($mmaModLesson.invalidateLessonData(courseId));
        if (lesson) {
            promises.push($mmaModLesson.invalidateAccessInformation(lesson.id));
            promises.push($mmaModLesson.invalidatePages(lesson.id));
            promises.push($mmaModLesson.invalidateLessonWithPassword(lesson.id));
            promises.push($mmaModLesson.invalidateTimers(lesson.id));
            promises.push($mmaModLesson.invalidateContentPagesViewed(lesson.id));
            promises.push($mmaModLesson.invalidateQuestionsAttempts(lesson.id));
            promises.push($mmaModLesson.invalidateRetakesOverview(lesson.id));
            promises.push($mmGroups.invalidateActivityGroupInfo(module.id));
        }

        return $q.all(promises).finally(function() {
            return fetchLessonData(true, sync, showErrors);
        });
    }

    function showSpinnerAndRefresh(sync, showErrors) {
        scrollTop();
        $scope.lessonLoaded = false;
        $scope.refreshIcon = 'spinner';
        $scope.syncIcon = 'spinner';

        refreshData(sync, showErrors).finally(function() {
            $scope.lessonLoaded = true;
            $scope.refreshIcon = 'ion-refresh';
            $scope.syncIcon = 'ion-loop';
        });
    }

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModLessonIndexScroll');
        }

        scrollView.scrollTop();
    }

    // Log viewing the lesson.
    function logView() {
        $mmaModLesson.logViewLesson(lesson.id, password).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }

    // Open the lesson player.
    function playLesson(continueLast) {
        // Calculate the pageId to load. If there is timelimit, lesson is always restarted from the start.
        var promise;
        if ($scope.hasOffline) {
            if (continueLast) {
                promise = $mmaModLesson.getLastPageSeen(lesson.id, accessInfo.attemptscount);
            } else {
                promise = $q.when(accessInfo.firstpageid);
            }
        } else if ($scope.leftDuringTimed && !lesson.timelimit) {
            promise = $q.when(continueLast ? accessInfo.lastpageseen : accessInfo.firstpageid);
        } else {
            promise = $q.when(false);
        }

        return promise.then(function(pageId) {
            $state.go('site.mod_lesson-player', {
                courseid: courseId,
                lessonid: lesson.id,
                pageid: pageId,
                password: password
            });
        });
    }

    // Get status of the lesson.
    function getStatus() {
        return $mmCoursePrefetchDelegate.getModuleStatus(module, courseId);
    }

    // Set a listener to monitor changes on this lesson status.
    function setStatusListener() {
        if (typeof statusObserver !== 'undefined') {
            return; // Already set.
        }

        // Listen for changes on this module status to show a message to the user.
        statusObserver = $mmEvents.on(mmCoreEventPackageStatusChanged, function(data) {
            if (data.siteid === $mmSite.getId() && data.componentId === module.id && data.component === mmaModLessonComponent) {
                updateStatus(data.status);
            }
        });
    }

    // Update current lesson status.
    function updateStatus(status) {
        currentStatus = status;
        $scope.showSpinner = status == mmCoreDownloading;
    }

    // Fetch the Lesson data.
    fetchLessonData(false, true).then(function() {
        if (!$scope.preventMessages || !$scope.preventMessages.length) {
            // Lesson can be started, log viewing it.
            logView();
        }
    }).finally(function() {
        $scope.lessonLoaded = true;
        $scope.refreshIcon = 'ion-refresh';
        $scope.syncIcon = 'ion-loop';
    });

    // Start the lesson.
    $scope.start = function(continueLast) {
        if ($scope.showSpinner) {
            // Lesson is being downloaded, abort.
            return;
        }

        if ($mmaModLesson.isLessonOffline(lesson)) {
            // Lesson supports offline, check if it needs to be downloaded.
            if (currentStatus != mmCoreDownloaded) {
                // Prefetch the lesson.
                $scope.showSpinner = true;
                return $mmaModLessonPrefetchHandler.prefetch(module, courseId, true).then(function() {
                    // Success downloading, open lesson.
                    playLesson(continueLast);
                }).catch(function(error) {
                    if ($scope.hasOffline) {
                        // Error downloading but there is something offline, allow continuing it.
                        playLesson(continueLast);
                    } else {
                        $mmUtil.showErrorModalDefault(error, 'mm.core.errordownloading', true);
                    }
                }).finally(function() {
                    $scope.showSpinner = false;
                });
            } else {
                // Already downloaded, open it.
                playLesson(continueLast);
            }
        } else {
            playLesson(continueLast);
        }
    };

    // Review the lesson.
    $scope.review = function() {
        if (!$scope.retakeToReview) {
            // No retake to review, stop.
            return;
        }

        $state.go('site.mod_lesson-player', {
            courseid: courseId,
            lessonid: lesson.id,
            pageid: $scope.retakeToReview.pageid,
            password: password,
            review: true,
            retake: $scope.retakeToReview.retake
        });
    };

    // Submit password for password protected lessons.
    $scope.submitPassword = function(pwd) {
        if (!pwd) {
            $mmUtil.showErrorModal('mma.mod_lesson.emptypassword', true);
            return;
        }

        scrollTop();
        $scope.lessonLoaded = false;
        $scope.refreshIcon = 'spinner';
        $scope.syncIcon = 'spinner';

        validatePassword(pwd).catch(function(error) {
            $mmUtil.showErrorModal(error);
        }).finally(function() {
            $scope.lessonLoaded = true;
            $scope.refreshIcon = 'ion-refresh';
            $scope.syncIcon = 'ion-loop';
        });
    };

    // Pull to refresh.
    $scope.refreshLesson = function(showErrors) {
        if ($scope.lessonLoaded) {
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            return refreshData(true, showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Change the display mode.
    $scope.changeDisplay = function(type) {
        if ($scope.display == type) {
            // Hasn't changed, stop.
            return;
        }

        $scope.display = type;
        if (type == $scope.DISPLAY_REPORTS && !$scope.groupInfo) {
            fetchReportData().catch(function(message) {
                $mmUtil.showErrorModalDefault(message, 'Error getting report.');
                return $q.reject();
            });
        }
    };

    // Change the group displayed.
    $scope.setGroup = function(groupId) {
        $scope.reportLoaded = false;
        return setGroup(groupId).catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'Error getting report.');
            return $q.reject();
        }).finally(function() {
            $scope.reportLoaded = true;
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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModLessonComponent, module.id);
    };

    // Update data when we come back from the player since the status could have changed.
    // We want to skip the first $ionicView.enter event because it's when the view is created.
    var skip = true;
    $scope.$on('$ionicView.enter', function() {
        if (skip) {
            skip = false;
            return;
        }

        var forwardView = $ionicHistory.forwardView();
        if (forwardView && forwardView.stateName === 'site.mod_lesson-player') {
            // Refresh data.
            showSpinnerAndRefresh(true, false);
        }
    });

    // Update online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Refresh data if this lesson is synchronized automatically.
    syncObserver = $mmEvents.on(mmaModLessonAutomSyncedEvent, function(data) {
        if (lesson && data && data.siteid == $mmSite.getId() && data.lessonid == lesson.id) {
            // Refresh the data.
            showSpinnerAndRefresh(false);
        }
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
        statusObserver && statusObserver.off && statusObserver.off();
        syncObserver && syncObserver.off && syncObserver.off();
    });

});
