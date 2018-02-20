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
        mmaModDataEventEntryChanged, $ionicModal, mmaModDataPerPage, $state, $mmComments, $mmaModDataOffline, $mmaModDataSync,
        mmaModDataEventAutomSynced) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        siteId = $mmSite.getId(),
        data,
        entryChangedObserver,
        onlineObserver,
        syncObserver,
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
    $scope.entries = {};
    $scope.firstEntry = false;

    $scope.search = {
        sortBy: "0",
        sortDirection: "DESC",
        page: 0,
        text: "",
        searching: false,
        searchingAdvanced: false,
        advanced: {}
    };

    function fetchDatabaseData(refresh, sync, showErrors) {
        var canAdd = canSearch = false;

        $scope.isOnline = $mmApp.isOnline();

        return $mmaModData.getDatabase(courseId, module.id).then(function(databaseData) {
            data = databaseData;

            $scope.title = data.name || $scope.title;
            $scope.description = data.intro || $scope.description;
            $scope.data = databaseData;

            if (sync) {
                // Try to synchronize the database.
                return syncDatabase(showErrors).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
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

            canSearch = true;
            canAdd = accessData.canaddentry;

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
                return fetchOfflineEntries();
            });
        }).then(function() {
            return $mmaModData.getFields(data.id).then(function(fields) {
                if (fields.length == 0) {
                    canSearch = false;
                    canAdd = false;
                }
                $scope.search.advanced = {};

                $scope.fields = {};
                angular.forEach(fields, function(field) {
                    $scope.fields[field.id] = field;
                });
                $scope.advancedSearch = $mmaModDataHelper.displayAdvancedSearchFields(data.asearchtemplate, $scope.fields);

                return fetchEntriesData();
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
        }).finally(function() {
            $scope.canAdd = canAdd;
            $scope.canSearch = canSearch;
            $scope.databaseLoaded = true;
        });
    }

    function fetchOfflineEntries() {
        // Check if there are entries stored in offline.
        return $mmaModDataOffline.getDatabaseEntries(data.id).then(function(offlineEntries) {
            $scope.hasOffline = !!offlineEntries.length;

            $scope.offlineActions = {};
            $scope.offlineEntries = {};

            // Only show offline entries on first page.
            if ($scope.search.page == 0 && $scope.hasOffline) {
                angular.forEach(offlineEntries, function(entry) {
                    if (entry.entryid > 0) {
                        if (typeof $scope.offlineActions[entry.entryid] == "undefined") {
                            $scope.offlineActions[entry.entryid] = [];
                        }
                        $scope.offlineActions[entry.entryid].push(entry);
                    } else {
                        if (typeof $scope.offlineActions[entry.entryid] == "undefined") {
                            $scope.offlineEntries[entry.entryid] = [];
                        }
                        $scope.offlineEntries[entry.entryid].push(entry);
                    }
                });
            }
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
            var numEntries = (entries && entries.entries && entries.entries.length) || 0;
            $scope.isEmpty = !numEntries && !Object.keys($scope.offlineActions).length && !Object.keys($scope.offlineEntries).length;
            $scope.hasNextPage = numEntries >= mmaModDataPerPage && (($scope.search.page + 1) * mmaModDataPerPage) < entries.totalcount;
            $scope.entriesRendered = "";

            if (!$scope.isEmpty) {
                $scope.cssTemplate = $mmaModDataHelper.prefixCSS(data.csstemplate, '.mma-data-entries-' + data.id);

                var siteInfo = $mmSite.getInfo(),
                    promises = [];

                angular.forEach($scope.offlineEntries, function(offlineActions) {
                    var entry;

                    angular.forEach(offlineActions, function(offlineEntry) {
                        if (offlineEntry.action == 'add') {
                            entry = {
                                id: offlineEntry.entryid,
                                canmanageentry: true,
                                approved: !data.approval || data.manageapproved,
                                dataid: offlineEntry.dataid,
                                groupid: offlineEntry.groupid,
                                timecreated: -offlineEntry.entryid,
                                timemodified: -offlineEntry.entryid,
                                userid: siteInfo.userid,
                                fullname: siteInfo.fullname,
                                contents: {}
                            };
                        }
                    });

                    if (entry) {
                        if (offlineActions.length > 0) {
                            promises.push($mmaModDataHelper.applyOfflineActions(entry, offlineActions, $scope.fields));
                        } else {
                            promises.push($q.when(entry));
                        }
                    }

                });

                angular.forEach(entries.entries, function(entry) {
                    // Index contents by fieldid.
                    var contents = {};
                    angular.forEach(entry.contents, function(field) {
                        contents[field.fieldid] = field;
                    });
                    entry.contents = contents;

                    if (typeof $scope.offlineActions[entry.id] != "undefined") {
                        promises.push($mmaModDataHelper.applyOfflineActions(entry, $scope.offlineActions[entry.id], $scope.fields));
                    } else {
                        promises.push($q.when(entry));
                    }
                });

                return $q.all(promises).then(function(entries) {
                    var entriesHTML = data.listtemplateheader || '';

                    // Get first entry from the whole list.
                    if (entries && entries[0] && (!$scope.search.searching || !$scope.firstEntry)) {
                        $scope.firstEntry = entries[0].id;
                    }

                    angular.forEach(entries, function(entry) {
                        $scope.entries[entry.id] = entry;

                        var actions = $mmaModDataHelper.getActions(data, $scope.access, entry);

                        entriesHTML += $mmaModDataHelper.displayShowFields(data.listtemplate, $scope.fields, entry, 'list', actions);
                    });
                    entriesHTML += data.listtemplatefooter || '';

                    $scope.entriesRendered = entriesHTML;
                });
            } else if (!$scope.search.searching) {
                // Empty and no searching.
                $scope.canSearch = false;
            }
            $scope.firstEntry = false;
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

    // Tries to synchronize the database.
    function syncDatabase(showErrors) {
        return $mmaModDataSync.syncDatabase(data.id).then(function(result) {
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
        }).finally(function() {
            $scope.databaseLoaded = true;
        });
    };

    // Reset all search filters and closes the modal.
    $scope.searchReset = function() {
        $scope.search.sortBy = "0";
        $scope.search.sortDirection = "DESC";
        $scope.search.text = "";
        $scope.search.advanced = {};
        $scope.search.searchingAdvanced = false;
        $scope.search.searching = false;
        $scope.searchEntries(0);
    };

    // Switches between advanced to normal search
    $scope.switchAdvanced = function(enable) {
        $scope.search.searchingAdvanced = enable;
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

    $scope.gotoEntry = function(entryId) {
        var stateParams = {
            module: module,
            moduleid: module.id,
            courseid: courseId,
            entryid: entryId,
            group: $scope.selectedGroup
        };
        $state.go('site.mod_data-entry', stateParams);
    };

    // Refresh online status when changes.
    onlineObserver = $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        $scope.isOnline = online;
    });

    // Refresh entries on change.
    entryChangedObserver = $mmEvents.on(mmaModDataEventEntryChanged, function(eventData) {
        if (data.id == eventData.dataId && siteId == eventData.siteId) {
            $scope.databaseLoaded = false;
            return fetchDatabaseData(true);
        }
    });

    // Refresh entries on sync.
    syncObserver = $mmEvents.on(mmaModDataEventAutomSynced, function(eventData) {
        // Update just when all database is synced.
        if (data.id == eventData.dataid && siteId == eventData.siteid && typeof eventData.entryid == "undefined") {
            $scope.databaseLoaded = false;
            fetchDatabaseData(true);
        }
    });

    $scope.$on('$destroy', function() {
        onlineObserver && onlineObserver.off && onlineObserver.off();
        entryChangedObserver && entryChangedObserver.off && entryChangedObserver.off();
        syncObserver && syncObserver.off && syncObserver.off();
    });
});
