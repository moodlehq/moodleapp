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
 * Data add and edit controller.
 *
 * @module mm.addons.mod_data
 * @ngdoc controller
 * @name mmaModDataEditCtrl
 */
.controller('mmaModDataEditCtrl', function($scope, $stateParams, $mmaModData, mmaModDataComponent, $q, $mmUtil, $mmaModDataHelper,
        $mmGroups) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        data,
        entry = {
            id: $stateParams.entryid || false
        };

    $scope.title = module.name;
    $scope.component = mmaModDataComponent;
    $scope.databaseLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;
    $scope.entryContents = {};

    function fetchEntryData(refresh) {

        return $mmaModData.getDatabase(courseId, module.id).then(function(databaseData) {
            data = databaseData;

            $scope.title = data.name || $scope.title;
            $scope.data = databaseData;

            $scope.database = data;

            return $mmaModData.getDatabaseAccessInformation(data.id);
        }).then(function(accessData) {
            $scope.cssTemplate = $mmaModDataHelper.prefixCSS(data.csstemplate, '.mma-data-entries-' + data.id);

            if (entry.id) {
                // Editing, group is set.
                return $mmaModData.getEntry(data.id, entry.id).then(function(entryData) {
                    $scope.entryContents = {};
                    angular.forEach(entryData.entry.contents, function(field) {
                        $scope.entryContents[field.fieldid] = field;
                    });
                });
            } else {
                // Adding, get groups.
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
                });
            }
        }).then(function() {
            return $mmaModData.getFields(data.id);
        }).then(function(fields) {
            $scope.fields = {};
            angular.forEach(fields, function(field) {
                $scope.fields[field.id] = field;
            });

            $scope.editForm = $mmaModDataHelper.displayEditFields(data.addtemplate, $scope.fields, $scope.entryContents);
        }).catch(function(message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return refreshAllData();
            }

            $mmUtil.showErrorModalDefault(message, 'mm.course.errorgetmodule', true);
            return $q.reject();
        }).finally(function() {
            $scope.databaseLoaded = true;
        });
    }

    // Set group to see the database.
    $scope.setGroup = function(groupId) {
        $scope.selectedGroup = groupId;
        $scope.databaseLoaded = false;

        return fetchEntryData();
    };

    // Saves data.
    $scope.save = function(page) {
        return $mmaModDataHelper.getEditDataFromForm(document.forms['mma-mod_data-edit-form'], $scope.fields)
                .then(function(editData) {
            if (editData.length > 0) {
                var promise;

                if (entry.id) {
                    promise = $mmaModData.editEntry(entry.id, editData);
                } else {
                    promise = $mmaModData.addEntry(data.id, editData, $scope.selectedGroup);
                }

                // TODO: Treat result.
                return promise;
            }
        });
    };

    // Convenience function to refresh all the data.
    function refreshAllData() {
        var promises = [];

        promises.push($mmaModData.invalidateDatabaseData(courseId));
        if (data) {
            if (entry.id) {
                promises.push($mmaModData.invalidateEntryData(data.id, entry.id));
            }
            promises.push($mmGroups.invalidateActivityGroupInfo(data.coursemodule));
            promises.push($mmaModData.invalidateEntriesData(data.id));
        }

        return $q.all(promises).finally(function() {
            return fetchEntryData(true);
        });
    }

    fetchEntryData();

    // Pull to refresh.
    $scope.refreshDatabase = function() {
        if ($scope.databaseLoaded) {
            return refreshAllData().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    };
});
