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
 * Data entry controller.
 *
 * @module mm.addons.mod_data
 * @ngdoc controller
 * @name mmaModDataEntryCtrl
 */
.controller('mmaModDataEntryCtrl', function($scope, $stateParams, $mmaModData, mmaModDataComponent, $mmCourse, $q, $mmEvents,
        $mmText, $translate, $mmUtil, $mmSite, $mmaModDataHelper, $mmGroups, $ionicScrollDelegate, mmaModDataEventEntryChanged,
        $ionicHistory, $mmaModDataOffline, mmaModDataEventAutomSynced) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        entryId = $stateParams.entryid || false,
        page = $stateParams.page || false,
        data,
        entryChangedObserver,
        syncObserver,
        scrollView,
        access,
        offlineActions = [];

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('data');
    $scope.component = mmaModDataComponent;
    $scope.databaseLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;
    $scope.entries = {};

    function fetchEntryData(refresh) {
        return $mmaModData.getDatabase(courseId, module.id).then(function(databaseData) {
            data = databaseData;

            $scope.title = data.name || $scope.title;
            $scope.description = data.intro || $scope.description;
            $scope.data = databaseData;

            return setEntryIdFromPage(data.id, page, $scope.selectedGroup).then(function() {
                return $mmaModData.getDatabaseAccessInformation(data.id);
            });
        }).then(function(accessData) {
            access = accessData;
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

                return $mmaModDataOffline.getEntryActions(data.id, entryId);
            });
        }).then(function(actions) {
            offlineActions = actions;
            $scope.hasOffline = !!offlineActions.length;

            return $mmaModData.getFields(data.id).then(function(fieldsData) {
                $scope.fields = {};
                angular.forEach(fieldsData, function(field) {
                    $scope.fields[field.id] = field;
                });

                return $mmaModDataHelper.getEntry(data, entryId, offlineActions);
            });
        }).then(function(entry) {
            entry = entry.entry;
            $scope.cssTemplate = $mmaModDataHelper.prefixCSS(data.csstemplate, '.mma-data-entries-' + data.id);

            // Index contents by fieldid.
            var contents = {};
            angular.forEach(entry.contents, function(field) {
                contents[field.fieldid] = field;
            });
            entry.contents = contents;

            return $mmaModDataHelper.applyOfflineActions(entry, offlineActions, $scope.fields);
        }).then(function(entryData) {
            $scope.entry = entryData;

            $scope.entries[entryId] = $scope.entry;

            var actions = $mmaModDataHelper.getActions(data, access, $scope.entry);

            $scope.entryRendered = $mmaModDataHelper.displayShowFields(data.singletemplate, $scope.fields,
                    $scope.entry, 'show', actions);
            $scope.showComments = actions.comments;

            return $mmaModDataHelper.getPageInfoByEntry(data.id, entryId, $scope.selectedGroup).then(function(result) {
                $scope.previousId = result.previousId;
                $scope.nextId = result.nextId;
            });
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            scrollTop();
            $scope.databaseLoaded = true;
        });
    }

    // Set group to see the database.
    $scope.setGroup = function(groupId) {
        $scope.selectedGroup = groupId;
        $scope.databaseLoaded = false;

        return setEntryIdFromPage(data.id, 0, $scope.selectedGroup).then(function() {
            return fetchEntryData();
        });
    };

    // Go to selected entry without changing state.
    $scope.gotoEntry = function(entry) {
        entryId = entry;
        page = false;
        $scope.databaseLoaded = false;
        return fetchEntryData();

    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];

        promises.push($mmaModData.invalidateDatabaseData(courseId));
        if (data) {
            promises.push($mmaModData.invalidateEntryData(data.id, entryId));
            promises.push($mmGroups.invalidateActivityGroupInfo(data.coursemodule));
            promises.push($mmaModData.invalidateEntriesData(data.id));
        }

        return $q.all(promises).finally(function() {
            return fetchEntryData(true);
        });
    }

    // Convenience function to translate page number to entry identifier.
    function setEntryIdFromPage(dataId, pageNumber, group) {
        if (pageNumber !== false) {
            return $mmaModDataHelper.getPageInfoByPage(dataId, pageNumber, group).then(function(result) {
                entryId = result.entryId;
                page = false;
            });
        }

        return $q.when();
    }

    fetchEntryData();

    // Scroll to top.
    function scrollTop() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModDataEntryScroll');
        }
        scrollView && scrollView.scrollTop && scrollView.scrollTop();
    }

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModDataComponent, module.id);
    };

    // Pull to refresh.
    $scope.refreshDatabase = function() {
        if ($scope.databaseLoaded) {
            return refreshAllData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };

    // Refresh entry on change.
    entryChangedObserver = $mmEvents.on(mmaModDataEventEntryChanged, function(eventData) {
        if (eventData.entryId == entryId && data.id == eventData.dataId && $mmSite.getId() == eventData.siteId) {
            if (eventData.deleted) {
                // If deleted, go back.
                $ionicHistory.goBack();
            } else {
                $scope.databaseLoaded = false;
                return fetchEntryData(true);
            }
        }
    });

    // Refresh entry on sync.
    syncObserver = $mmEvents.on(mmaModDataEventAutomSynced, function(eventData) {
        if ((eventData.entryid == entryId || eventData.offlineentryid == entryId) && data.id == eventData.dataid &&
                $mmSite.getId() == eventData.siteid) {
            if (eventData.deleted) {
                // If deleted, go back.
                $ionicHistory.goBack();
            } else {
                entryId = eventData.entryid;
                $scope.databaseLoaded = false;
                fetchEntryData(true);
            }
        }
    });

    $scope.$on('$destroy', function() {
        entryChangedObserver && entryChangedObserver.off && entryChangedObserver.off();
        syncObserver && syncObserver.off && syncObserver.off();
    });
});
