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
        $mmGroups, $ionicHistory, $mmEvents, mmaModDataEventEntryChanged, $mmSite, $translate, $mmFileUploaderHelper, $timeout,
        $ionicScrollDelegate) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        data,
        scrollView,
        siteId = $mmSite.getId(),
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
                if (entryId) {
                    return returnToEntryList();
                } else {
                    // New entry, no changes means no field filled, warn the user.
                    return $q.reject('mma.mod_data.emptyaddform');
                }
            }

            var modal = $mmUtil.showModalLoading('mm.core.sending', true);

            return $mmaModDataHelper.getEditDataFromForm(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                    $scope.entryContents).then(function(editData) {

                if (editData.length > 0) {
                    if (entryId) {
                        return $mmaModData.editEntry(entryId, editData);
                    }
                    return $mmaModData.addEntry(data.id, editData, $scope.selectedGroup);
                }
             }).then(function(result) {
                if (!result) {
                    // No field filled, warn the user.
                    return $q.reject('mma.mod_data.emptyaddform');
                }

                // This is done if entry is updated when editing or creating if not.
                if ((entryId && result.updated) || (!entryId && result.newentryid)) {
                    var promises = [];

                    entryId = entryId || result.newentryid;

                    promises.push($mmaModData.invalidateEntryData(data.id, entryId, siteId));
                    promises.push($mmaModData.invalidateEntriesData(data.id, siteId));

                    return $q.all(promises).then(function() {
                        $mmEvents.trigger(mmaModDataEventEntryChanged, {dataId: data.id, entryId: entryId, siteId: siteId});
                    }).finally(function() {
                        return returnToEntryList();
                    });
                } else {
                    $scope.errors = {};
                    angular.forEach(result.fieldnotifications, function(field) {
                        for (var x in $scope.fields) {
                            if ($scope.fields[x].name == field.fieldname) {
                                $scope.errors[$scope.fields[x].id] = field.notification;
                                return;
                            }
                        }
                    });
                    $timeout(function() {
                        scrollToFirstError();
                    });
                }
            }).finally(function() {
                modal.dismiss();
            });
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'Cannot edit entry', true);
            return $q.reject();
        });
    };

    // Scroll to first error.
    function scrollToFirstError() {
        if (!scrollView) {
            scrollView = $ionicScrollDelegate.$getByHandle('mmaModDataEntryScroll');
        }
        if (!$mmUtil.scrollToElement(document.body, '.mm-data-error', scrollView)) {
            scrollView && scrollView.scrollTop && scrollView.scrollTop();
        }
    }

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
            return $mmaModDataHelper.getEditTmpFiles(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                    $scope.entryContents).then(function(files) {
                $mmFileUploaderHelper.clearTmpFiles(files);
            });
        });
    }

    fetchEntryData();

});
