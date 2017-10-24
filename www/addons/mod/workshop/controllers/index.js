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

angular.module('mm.addons.mod_workshop')

/**
 * Workshop index controller.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc controller
 * @name mmaModWorkshopIndexCtrl
 */
.controller('mmaModWorkshopIndexCtrl', function($scope, $stateParams, $mmaModWorkshop, mmaModWorkshopComponent, $mmCourse,
        $mmCourseHelper, $q, $mmText, $translate, $mmEvents, mmCoreEventOnlineStatusChanged, $mmApp, $mmUtil, $ionicModal,
        $mmGroups, $ionicPlatform, $mmaModWorkshopHelper, mmaModWorkshopPerPage, $state, mmaModWorkshopSubmissionChangedEvent,
        $ionicScrollDelegate, $mmaModWorkshopSync, mmaModWorkshopEventAutomSynced, $mmSite, $mmaModWorkshopOffline) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        siteId = $mmSite.getId(),
        offlineSubmissions,
        obsSubmissionChanged,
        onlineObserver,
        resumeObserver,
        syncObserver,
        scrollView,
        supportedTasks = { // Add here native supported tasks.
            'submit': true
        };

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('workshop');
    $scope.module = module;
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModWorkshopComponent;
    $scope.workshopLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;
    $scope.page = 0;

    $scope.workshopPhases = {
        PHASE_SETUP: $mmaModWorkshop.PHASE_SETUP,
        PHASE_SUBMISSION: $mmaModWorkshop.PHASE_SUBMISSION,
        PHASE_ASSESSMENT: $mmaModWorkshop.PHASE_ASSESSMENT,
        PHASE_EVALUATION: $mmaModWorkshop.PHASE_EVALUATION,
        PHASE_CLOSED: $mmaModWorkshop.PHASE_CLOSED
    };

    function fetchWorkshopData(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();

        return $mmaModWorkshop.getWorkshop(courseId, module.id).then(function(workshopData) {
            $scope.workshop = workshopData;
            $scope.selectedPhase = workshopData.phase;

            $scope.title = $scope.workshop.name || $scope.title;
            $scope.description = $scope.workshop.intro || $scope.description;

            if (sync) {
                // Try to synchronize the workshop.
                return syncWorkshop(showErrors).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            return $mmaModWorkshop.getWorkshopAccessInformation($scope.workshop.id);
        }).then(function(accessData) {
            $scope.access = accessData;

            return $mmGroups.getActivityGroupInfo($scope.workshop.coursemodule, accessData.canswitchphase).then(function(groupInfo) {
                $scope.groupInfo = groupInfo;

                // Check selected group is accessible.
                if (groupInfo && groupInfo.groups && groupInfo.groups.length > 0) {
                    var found = false;
                    for (var x in groupInfo.groups) {
                        if (groupInfo.groups[x].id == $scope.selectedGroup) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        $scope.selectedGroup = groupInfo.groups[0].id;
                    }
                }

                return $mmaModWorkshop.getUserPlanPhases($scope.workshop.id);
            });
        }).then(function(phases) {
            $scope.phases = phases;
            angular.forEach(phases, function(phase) {
                angular.forEach(phase.tasks, function(task) {
                    if (!task.link && (task.code == 'examples' || task.code == 'prepareexamples')) {
                        // Add links to manage examples.
                        task.link = $scope.moduleUrl;
                    } else if (task.link && typeof supportedTasks[task.code] !== 'undefined') {
                        task.support = true;
                    }
                });
                phase.switchUrl = "";
                for (var x in phase.actions) {
                    if (phase.actions[x].url && phase.actions[x].type == "switchphase") {
                        phase.switchUrl = phase.actions[x].url;
                        break;
                    }
                }
            });

            // Check if there are info stored in offline.
            return $mmaModWorkshopOffline.getSubmissions($scope.workshop.id).then(function(submissionsActions) {
                $scope.hasOffline = !!submissionsActions.length;
                offlineSubmissions = submissionsActions;
            });
        }).then(function() {
            return setPhaseInfo();
        }).then(function() {
            // All data obtained, now fill the context menu.
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModWorkshopComponent);
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            $scope.workshopLoaded = true;
        });
    }

    // Set group to see the workshop.
    $scope.setGroup = function(groupId) {
        $scope.selectedGroup = groupId;
        return fetchWorkshopData();
    };

    // Convenience function to refresh all the data.
    function refreshAllData(sync, showErrors) {
        var promises = [];

        promises.push($mmaModWorkshop.invalidateWorkshopData(courseId));
        if ($scope.workshop) {
            promises.push($mmaModWorkshop.invalidateWorkshopAccessInformationData($scope.workshop.id));
            promises.push($mmaModWorkshop.invalidateUserPlanPhasesData($scope.workshop.id));
            if ($scope.canSubmit) {
                promises.push($mmaModWorkshop.invalidateSubmissionsData($scope.workshop.id));
            }
            if ($scope.access.canviewallsubmissions) {
                promises.push($mmaModWorkshop.invalidateGradeReportData($scope.workshop.id));
            }
            promises.push($mmGroups.invalidateActivityGroupInfo($scope.workshop.coursemodule));
        }

        return $q.all(promises).finally(function() {
            return fetchWorkshopData(true, sync, showErrors);
        });
    }

    // Tries to synchronize the workshop.
    function syncWorkshop(showErrors) {
        return $mmaModWorkshopSync.syncWorkshop($scope.workshop.id).then(function(result) {
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

    fetchWorkshopData(false, true).then(function() {
        initPhaseSelector();
        $mmaModWorkshop.logView($scope.workshop.id).then(function() {
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        });
    }).finally(function() {
        $scope.refreshIcon = 'ion-refresh';
        $scope.syncIcon = 'ion-loop';
    });

    // Initializes the phase modal.
    function initPhaseSelector() {
        if ($scope.phases) {
            return $ionicModal.fromTemplateUrl('addons/mod/workshop/templates/phaseselect.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(m) {
                $scope.phaseModal = m;
            });
        }
    }

    // Select Phase to be shown.
    $scope.selectPhase = function() {
        if (!$scope.phaseModal) {
            initPhaseSelector().then(function() {
                $scope.phaseModal.show();
            });
        } else {
            $scope.phaseModal.show();
        }
    };

    // Switch shown phase.
    $scope.switchPhase = function(phase) {
        $scope.phaseModal.hide();
        $scope.selectedPhase = phase;
    };

    // Just close the modal.
    $scope.closeModal = function() {
        $scope.phaseModal.hide();
    };

    // Open task.
    $scope.runTask = function(task) {
        if (task.support) {
            switch (task.code) {
                case 'submit':
                    var stateParams = {
                        module: module,
                        access: $scope.access,
                        courseid: courseId,
                        submission: $scope.submission
                    };

                    if ($scope.submission.id) {
                        stateParams.submissionid = $scope.submission.id;
                    }

                    $state.go('site.mod_workshop-edit-submission', stateParams);
                    break;
            }
        } else if (task.link) {
            $mmUtil.openInBrowser(task.link);
        }
    };

    // Run task link on current phase.
    $scope.runTaskByCode = function(taskCode) {
        var task = $mmaModWorkshopHelper.getTask($scope.phases[$scope.workshop.phase].tasks, taskCode);
        if (task) {
            return $scope.runTask(task);
        }
        return false;
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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModWorkshopComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshWorkshop = function(showErrors) {
        if ($scope.workshopLoaded) {
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            return refreshAllData(true, showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Retrieves and shows submissions grade page.
    $scope.gotoSubmissionsPage = function(page) {
        return $mmaModWorkshop.getGradesReport($scope.workshop.id, undefined, page).then(function(report) {
            var numEntries = (report && report.grades && report.grades.length) || 0;
            $scope.page = page;
            $scope.hasNextPage = numEntries >= mmaModWorkshopPerPage && (($scope.page  + 1) * mmaModWorkshopPerPage) < report.totalcount;
            $scope.grades = report.grades || [];
            return $scope.grades;
        }).then(function() {
            angular.forEach($scope.grades, function(submission) {
                var actions = $mmaModWorkshopHelper.filterSubmissionActions(offlineSubmissions, submission.submissionid || false);
                submission = $mmaModWorkshopHelper.applyOfflineData(submission, actions);
            });
        });
    };

    // Convenience function to set current phase information.
    function setPhaseInfo() {
        var phase = $scope.phases[$scope.workshop.phase];

        switch ($scope.workshop.phase) {
            case  $mmaModWorkshop.PHASE_SETUP:
                break;
            case $mmaModWorkshop.PHASE_SUBMISSION:
                $scope.canSubmit = $mmaModWorkshopHelper.canSubmit($scope.workshop, $scope.access, phase.tasks);

                $scope.submission = false;
                if ($scope.canSubmit) {
                    return $mmaModWorkshopHelper.getUserSubmission($scope.workshop.id).then(function(submission) {
                        var actions = $mmaModWorkshopHelper.filterSubmissionActions(offlineSubmissions, submission.id || false);
                        $scope.submission = $mmaModWorkshopHelper.applyOfflineData(submission, actions);
                    });
                }

                if ($scope.access.canviewallsubmissions) {
                    return $scope.gotoSubmissionsPage($scope.page);
                }
                break;
            case $mmaModWorkshop.PHASE_ASSESSMENT:
                break;
            case $mmaModWorkshop.PHASE_EVALUATION:
                break;
            case $mmaModWorkshop.PHASE_CLOSED:
                break;
        }
    }

    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModWorkshopIndexScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // Function called when we receive an event of submission changes.
    function eventReceived(data) {
        if (($scope.workshop && $scope.workshop.id === data.workshopid) || data.cmid === module.id) {
            scrollTop();

            $scope.workshopLoaded = false;
            refreshAllData(true, false);
            // Check completion since it could be configured to complete once the user adds a new discussion or replies.
            $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
        }
    }

    // Listen for submission changes.
    obsSubmissionChanged = $mmEvents.on(mmaModWorkshopSubmissionChangedEvent, eventReceived);

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Since most actions will take the user out of the app, we should refresh the view when the app is resumed.
    resumeObserver = $ionicPlatform.on('resume', function() {
        scrollTop();

        $scope.workshopLoaded = false;
        return refreshAllData(true, false);
    });

    // Refresh workshop on sync.
    syncObserver = $mmEvents.on(mmaModWorkshopEventAutomSynced, function(eventData) {
        // Update just when all database is synced.
        if ($scope.workshop.id == eventData.workshopid && siteId == eventData.siteid) {
            $scope.workshopLoaded = false;
            fetchWorkshopData(true);
        }
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
        obsSubmissionChanged && obsSubmissionChanged.off && obsSubmissionChanged.off();
        syncObserver && syncObserver.off && syncObserver.off();
        resumeObserver && resumeObserver();
    });
});
