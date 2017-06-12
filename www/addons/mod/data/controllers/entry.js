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
        $mmText, $translate, $mmUtil, $mmSite, $mmaModDataHelper, $mmGroups, $ionicScrollDelegate, mmaModDataEventEntryChanged) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        entryId = $stateParams.entryid || false,
        page = $stateParams.page || false,
        data,
        entryChangedObserver,
        scrollView;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.moduleName = $mmCourse.translateModuleName('data');
    $scope.component = mmaModDataComponent;
    $scope.databaseLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;

    function fetchEntryData(refresh) {
        return $mmaModData.getDatabase(courseId, module.id).then(function(databaseData) {
            data = databaseData;

            $scope.title = data.name || $scope.title;
            $scope.description = data.intro || $scope.description;
            $scope.data = databaseData;

            $scope.database = data;

            return setEntryIdFromPage(data.id, page, $scope.selectedGroup).then(function() {
                return $mmaModData.getDatabaseAccessInformation(data.id);
            });
        }).then(function(accessData) {
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

                return $mmaModData.getEntry(data.id, entryId);
            });
        }).then(function(entry) {
            $scope.cssTemplate = $mmaModDataHelper.prefixCSS(data.csstemplate, '.mma-data-entries-' + data.id);
            $scope.entryContents = entry.entryviewcontents;

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

    // Opens search.
    $scope.gotoSearch = function() {
        $mmUtil.openInApp($mmSite.getURL() + '/mod/data/view.php?mode=asearch&d=' + data.id);
    };

    // Refresh entry on change.
    entryChangedObserver = $mmEvents.on(mmaModDataEventEntryChanged, function(eventData) {
        if (eventData.entryId == entryId && data.id == eventData.dataId && $mmSite.getId() == eventData.siteId) {
            $scope.databaseLoaded = false;
            return fetchEntryData(true);
        }
    });

    $scope.$on('$destroy', function() {
        entryChangedObserver && entryChangedObserver.off && entryChangedObserver.off();
    });
});
