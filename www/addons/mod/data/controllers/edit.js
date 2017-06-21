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
        $mmGroups, $ionicHistory, $mmEvents, mmaModDataEventEntryChanged, $mmSite, $translate, $mmFileUploaderHelper) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        data,
        entryId = $stateParams.entryid || false;

    $scope.title = module.name;
    $scope.component = mmaModDataComponent;
    $scope.databaseLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;
    $scope.entryContents = {};

    // Block leaving the view, we want to show a confirm to the user if there's unsaved data.
    $mmUtil.blockLeaveView($scope, cancel);

    function fetchEntryData() {

        return $mmaModData.getDatabase(courseId, module.id).then(function(databaseData) {
            data = databaseData;

            $scope.title = data.name || $scope.title;
            $scope.data = databaseData;

            $scope.database = data;

            return $mmaModData.getDatabaseAccessInformation(data.id);
        }).then(function(accessData) {
            $scope.cssTemplate = $mmaModDataHelper.prefixCSS(data.csstemplate, '.mma-data-entries-' + data.id);

            if (entryId) {
                // Editing, group is set.
                return $mmaModData.getEntry(data.id, entryId).then(function(entryData) {
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
    $scope.save = function() {
        return $mmaModDataHelper.hasEditDataChanged(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                $scope.entryContents).then(function(changed) {

            if (!changed) {
                return returnToEntryList();
            }

            var modal = $mmUtil.showModalLoading('mm.core.sending', true);

            return $mmaModDataHelper.getEditDataFromForm(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                    $scope.entryContents).then(function(editData) {
                if (editData.length > 0) {
                    if (entryId) {
                        return $mmaModData.editEntry(entryId, editData);
                    } else {
                        return $mmaModData.addEntry(data.id, editData, $scope.selectedGroup);
                    }
                }
             }).then(function(result) {
                if (!result) {
                    // Nothing done, just go back.
                    return returnToEntryList();
                }

                // This is done if entry is updated when editing or creating if not.
                if ((entryId && result.updated) || (!entryId && result.newentryid)) {
                    entryId = entryId || result.newentryid;
                    $mmEvents.trigger(mmaModDataEventEntryChanged, {dataId: data.id, entryId: entryId, siteId: $mmSite.getId()});
                    return returnToEntryList();
                }
            }).catch(function(error) {
                $mmUtil.showErrorModalDefault(error, 'Cannot edit entry', true);
            }).finally(function() {
                modal.dismiss();
            });
        });
    };

    function returnToEntryList() {
        return $mmaModDataHelper.getEditTmpFiles(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                $scope.entryContents).then(function(files) {
            $mmFileUploaderHelper.clearTmpFiles(files);
        }).finally(function() {
            // Go back to discussions list.
            $ionicHistory.goBack();
        });
    }

    // Just ask to confirm the lost of data.
    function cancel() {
        return $mmaModDataHelper.hasEditDataChanged(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                $scope.entryContents).then(function(changed) {
            if (!changed) {
                return $q.when();
            }
            // Show confirmation if some data has been modified.
            return  $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }).then(function() {
            // Delete the local files from the tmp folder.
            $mmaModDataHelper.getEditTmpFiles(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                    $scope.entryContents).then(function(files) {
                $mmFileUploaderHelper.clearTmpFiles(files);
            });
        });
    }

    fetchEntryData();

});
