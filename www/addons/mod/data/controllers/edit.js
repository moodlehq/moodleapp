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
        $ionicScrollDelegate, $mmApp, $mmaModDataOffline) {

    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        data,
        scrollView,
        offlineActions,
        siteId = $mmSite.getId(),
        offline = !$mmApp.isOnline(),
        entryId = $stateParams.entryid || false,
        entry;

    $scope.title = module.name;
    $scope.component = mmaModDataComponent;
    $scope.databaseLoaded = false;
    $scope.selectedGroup = $stateParams.group || 0;

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

            if (entryId !== false) {
                // Adding, get groups because it's not set.
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
            return $mmaModDataOffline.getEntryActions(data.id, entryId);
        }).then(function(actions) {
            offlineActions = actions;

            return $mmaModData.getFields(data.id);
        }).then(function(fieldsData) {
            $scope.fields = {};
            angular.forEach(fieldsData, function(field) {
                $scope.fields[field.id] = field;
            });

            return $mmaModDataHelper.getEntry(data, entryId, offlineActions);
        }).then(function(entryData) {
            if (entryData) {
                entry = entryData.entry;

                // Index contents by fieldid.
                var contents = {};
                angular.forEach(entry.contents, function(field) {
                    contents[field.fieldid] = field;
                });
                entry.contents = contents;
            } else {
                entry = {};
                entry.contents = {};
            }

            return $mmaModDataHelper.applyOfflineActions(entry, offlineActions, $scope.fields);
        }).then(function(entryData) {
            $scope.entry = entryData;

            $scope.editForm = $mmaModDataHelper.displayEditFields(data.addtemplate, $scope.fields, entry.contents);
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
                $scope.entry.contents).then(function(changed) {

            if (!changed) {
                if (entryId) {
                    return returnToEntryList();
                } else {
                    // New entry, no changes means no field filled, warn the user.
                    return $q.reject('mma.mod_data.emptyaddform');
                }
            }

            var modal = $mmUtil.showModalLoading('mm.core.sending', true);

            // Create an ID to assign files.
            var entryTemp = entryId;
            if (typeof entryId == "undefined" || entryId === false) {
                entryTemp = - (new Date().getTime());
            }

            return $mmaModDataHelper.getEditDataFromForm(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                    entryTemp, $scope.entry.contents, offline).catch(function(e) {
                if (!offline) {
                    // Cannot submit in online, prepare for offline usage.
                    offline = true;

                    return $mmaModDataHelper.getEditDataFromForm(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                        entryTemp, $scope.entry.contents, offline);
                }

                return $q.reject(e);
            }).then(function(editData) {

                if (editData.length > 0) {
                    if (entryId !== false) {
                        return $mmaModData.editEntry(data.id, entryId, courseId, editData, $scope.fields, undefined, offline);
                    }
                    return $mmaModData.addEntry(data.id, entryTemp, courseId, editData, $scope.selectedGroup, $scope.fields, undefined,
                            offline);
                }
             }).then(function(result) {
                if (!result) {
                    // No field filled, warn the user.
                    return $q.reject('mma.mod_data.emptyaddform');
                }

                // This is done if entry is updated when editing or creating if not.
                if ((entryId !== false && result.updated) || (!entryId && result.newentryid)) {
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
                $scope.entry.contents).then(function(files) {
            $mmFileUploaderHelper.clearTmpFiles(files);
        }).finally(function() {
            // Go back to discussions list.
            $ionicHistory.goBack();
        });
    }

    // Just ask to confirm the lost of data.
    function cancel() {
        return $mmaModDataHelper.hasEditDataChanged(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                $scope.entry.contents).then(function(changed) {
            if (!changed) {
                return $q.when();
            }
            // Show confirmation if some data has been modified.
            return  $mmUtil.showConfirm($translate('mm.core.confirmcanceledit'));
        }).then(function() {
            // Delete the local files from the tmp folder.
            return $mmaModDataHelper.getEditTmpFiles(document.forms['mma-mod_data-edit-form'], $scope.fields, data.id,
                    $scope.entry.contents).then(function(files) {
                $mmFileUploaderHelper.clearTmpFiles(files);
            });
        });
    }

    fetchEntryData();

});
