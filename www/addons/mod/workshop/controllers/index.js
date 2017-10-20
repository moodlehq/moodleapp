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
        $mmGroups, $ionicPlatform) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        onlineObserver,
        resumeObserver,
        supportedTasks = {}; // Add here native supported tasks.

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('workshop');
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModWorkshopComponent;
    $scope.workshopLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;

    function fetchWorkshopData(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();

        return $mmaModWorkshop.getWorkshop(courseId, module.id).then(function(workshopData) {
            $scope.workshop = workshopData;
            $scope.selectedPhase = workshopData.phase;

            $scope.title = $scope.workshop.name || $scope.title;
            $scope.description = $scope.workshop.intro || $scope.description;
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
                    if (task.link && typeof supportedTasks[task.code] !== 'undefined') {
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
            promises.push($mmGroups.invalidateActivityGroupInfo($scope.workshop.coursemodule));
        }

        return $q.all(promises).finally(function() {
            return fetchWorkshopData(true, sync, showErrors);
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
    $scope.closeModal = function(phase) {
        $scope.phaseModal.hide();
    };

    // Open task.
    $scope.runTask = function(task) {
        if (task.support) {
            // TODO: Add support depending on task.code.
        } else if (task.link) {
            $mmUtil.openInBrowser(task.link);
        }
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

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Since most actions will take the user out of the app, we should refresh the view when the app is resumed.
    resumeObserver = $ionicPlatform.on('resume', function() {
        $scope.workshopLoaded = false;
        return refreshAllData(true, false);
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
        resumeObserver && resumeObserver();
    });
});
