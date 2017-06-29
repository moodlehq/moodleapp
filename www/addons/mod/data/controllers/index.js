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

angular.module('mm.addons.mod_data')

/**
 * Data index controller.
 *
 * @module mm.addons.mod_data
 * @ngdoc controller
 * @name mmaModDataIndexCtrl
 */
.controller('mmaModDataIndexCtrl', function($scope, $stateParams, $mmaModData, mmaModDataComponent, $mmCourse, $mmCourseHelper, $q,
        $mmText, $translate, $mmEvents, mmCoreEventOnlineStatusChanged, $mmApp, $mmUtil, $mmSite, $mmaModDataHelper, $mmGroups,
        mmaModDataEventEntryChanged, $ionicModal, mmaModDataPerPage, $state, $mmComments) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        data,
        entryChangedObserver,
        onlineObserver,
        hasComments = false;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('data');
    $scope.refreshIcon = 'spinner';
    $scope.syncIcon = 'spinner';
    $scope.component = mmaModDataComponent;
    $scope.databaseLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;

    $scope.search = {
        sortBy: "0",
        sortDirection: "ASC",
        page: 0,
        text: "",
        searching: false,
        searchingAdvanced: false,
        advanced: {}
    };

    function fetchDatabaseData(refresh, sync, showErrors) {
        $scope.isOnline = $mmApp.isOnline();

        return $mmaModData.getDatabase(courseId, module.id).then(function(databaseData) {
            data = databaseData;

            $scope.title = data.name || $scope.title;
            $scope.description = data.intro || $scope.description;
            $scope.data = databaseData;

            $scope.database = data;

            return $mmaModData.getDatabaseAccessInformation(data.id);

        }).then(function(accessData) {
            $scope.access = accessData;

            if (!accessData.timeavailable) {
                var time = $mmUtil.timestamp();

                $scope.timeAvailableFrom = data.timeavailablefrom && time < data.timeavailablefrom ?
                    parseInt(data.timeavailablefrom, 10) * 1000 : false;
                $scope.timeAvailableFromReadable = $scope.timeAvailableFrom ?
                    moment($scope.timeAvailableFrom).format('LLL') : false;
                $scope.timeAvailableTo = data.timeavailableto && time > data.timeavailableto ?
                    parseInt(data.timeavailableto, 10) * 1000 : false;
                $scope.timeAvailableToReadable = $scope.timeAvailableTo ? moment($scope.timeAvailableTo).format('LLL') : false;

                $scope.isEmpty = true;
                $scope.groupInfo = false;
                return false;
            }

            $scope.canSearch = true;
            $scope.canAdd = accessData.canaddentry;

            return $mmGroups.getActivityGroupInfo(data.coursemodule, accessData.canmanageentries).then(function(groupInfo) {
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

                var promises = [
                    fetchEntriesData(),
                    $mmaModData.getFields(data.id).then(function(fields) {
                        if (fields.length == 0) {
                            $scope.canSearch = false;
                            $scope.canAdd = false;
                        }
                        $scope.search.advanced = {};

                        $scope.fields = {};
                        angular.forEach(fields, function(field) {
                            $scope.fields[field.id] = field;
                        });
                        $scope.advancedSearch = $mmaModDataHelper.displayAdvancedSearchFields(data.asearchtemplate, $scope.fields);
                    })
                ];
                return $q.all(promises);
            });
        }).then(function() {
            // All data obtained, now fill the context menu.
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModDataComponent);
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function(){
            $scope.databaseLoaded = true;
        });
    }

    function fetchEntriesData() {
        hasComments = false;

        return $mmaModData.getDatabaseAccessInformation(data.id, $scope.selectedGroup).then(function(accessData) {
            // Update values for current group.
            $scope.access.canaddentry = accessData.canaddentry;

            if ($scope.search.searching) {
                var text = $scope.search.searchingAdvanced ? undefined : $scope.search.text;
                    advanced = $scope.search.searchingAdvanced ? $scope.search.advanced : undefined;
                return $mmaModData.searchEntries(data.id, $scope.selectedGroup, text, advanced, $scope.search.sortBy,
                    $scope.search.sortDirection, $scope.search.page);
            } else {
                return $mmaModData.getEntries(data.id, $scope.selectedGroup, $scope.search.sortBy, $scope.search.sortDirection,
                    $scope.search.page);
            }
        }).then(function(entries) {
            $scope.numEntries = entries && entries.totalcount;
            $scope.isEmpty = $scope.numEntries <= 0;
            $scope.hasNextPage = (($scope.search.page + 1) * mmaModDataPerPage) < $scope.numEntries;
            $scope.entries = "";

            if (!$scope.isEmpty) {
                $scope.cssTemplate = $mmaModDataHelper.prefixCSS(data.csstemplate, '.mma-data-entries-' + data.id);

                // Are comments present on the template? Replace it with native ones.
                if (data.comments) {
                    var commentsNumber = data.listtemplate.match(/##comments##/g).length;
                    if (commentsNumber > 0) {
                        hasComments = true;

                        entries.listviewcontents = $mmaModDataHelper.replaceComments(entries.listviewcontents, entries.entries,
                            commentsNumber);
                    }
                }
                $scope.entries = entries.listviewcontents;
            } else if (!$scope.search.searching) {
                $scope.canSearch = false;
            }
        });
    }


    // Set group to see the database.
    $scope.setGroup = function(groupId) {
        $scope.selectedGroup = groupId;
        return fetchEntriesData().catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        });
    };

    // Convenience function to refresh all the data.
    function refreshAllData(sync, showErrors) {
        var promises = [];

        promises.push($mmaModData.invalidateDatabaseData(courseId));
        if (data) {
            promises.push($mmaModData.invalidateDatabaseAccessInformationData(data.id));
            promises.push($mmGroups.invalidateActivityGroupInfo(data.coursemodule));
            promises.push($mmaModData.invalidateEntriesData(data.id));
            if (hasComments) {
                promises.push($mmComments.invalidateCommentsByInstance('module', data.coursemodule));
            }
        }

        return $q.all(promises).finally(function() {
            return fetchDatabaseData(true, sync, showErrors);
        });
    }

    fetchDatabaseData(false, true).then(function() {
        $mmaModData.logView(data.id).then(function() {
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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModDataComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshDatabase = function(showErrors) {
        if ($scope.databaseLoaded) {
            $scope.refreshIcon = 'spinner';
            $scope.syncIcon = 'spinner';
            return refreshAllData(true, showErrors).finally(function() {
                $scope.refreshIcon = 'ion-refresh';
                $scope.syncIcon = 'ion-loop';
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Setup search modal.
    $ionicModal.fromTemplateUrl('addons/mod/data/templates/search-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(searchModal) {
        $scope.showSearch = function() {
            searchModal.show();
        };
        $scope.closeSearch = function() {
            searchModal.hide();
        };
        $scope.$on('$destroy', function() {
            searchModal.remove();
        });
    });

    // Performs the search and closes the modal.
    $scope.searchEntries = function(page) {
        $scope.closeSearch();
        $scope.databaseLoaded = false;
        $scope.search.page = page;

        if ($scope.search.searchingAdvanced) {
            $scope.search.advanced = $mmaModDataHelper.getSearchDataFromForm(document.forms['mma-mod_data-advanced-search-form'],
                $scope.fields);
            $scope.search.searching = $scope.search.advanced.length > 0;
        } else {
            $scope.search.searching = $scope.search.text.length > 0;
        }
        return fetchEntriesData().catch(function(message) {
            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function(){
            $scope.databaseLoaded = true;
        });
    };

    // Reset all search filters and closes the modal.
    $scope.searchReset = function() {
        $scope.search.sortBy = "0";
        $scope.search.sortDirection = "ASC";
        $scope.search.text = "";
        $scope.search.advanced = {};
        $scope.search.searchingAdvanced = false;
        $scope.search.searching = false;
        $scope.searchEntries(0);
    };

    // Opens add entries form
    $scope.gotoAddEntries = function() {
        var stateParams = {
            moduleid: module.id,
            module: module,
            courseid: courseId,
            group: $scope.selectedGroup
        };
        $state.go('site.mod_data-edit', stateParams);
    };

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Refresh entry on change.
    entryChangedObserver = $mmEvents.on(mmaModDataEventEntryChanged, function(eventData) {
        if (data.id == eventData.dataId && $mmSite.getId() == eventData.siteId) {
            $scope.databaseLoaded = false;
            return fetchDatabaseData(true);
        }
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
        entryChangedObserver && entryChangedObserver.off && entryChangedObserver.off();
    });
});
