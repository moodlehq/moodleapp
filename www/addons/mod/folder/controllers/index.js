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

angular.module('mm.addons.mod_folder')

/**
 * Folder index controller.
 *
 * @module mm.addons.mod_folder
 * @ngdoc controller
 * @name mmaModFolderIndexCtrl
 */
.controller('mmaModFolderIndexCtrl', function($scope, $stateParams, $mmUtil, $mmCourseHelper, $mmCoursePrefetchDelegate, $mmaModFolder, $mmCourse, $mmUtil, $q, $mmText, $translate,
            mmaModFolderComponent) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        sectionId = $stateParams.sectionid,
        path = $stateParams.path;

    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModFolderComponent;
    $scope.componentId = module.id;

    // Convenience function to set scope data using module.
    function showModuleData(module) {
        $scope.title = module.name;
        fillContextMenu(module, courseId);
        if (path) {
            // Subfolder.
            $scope.contents = module.contents;
        } else {
            $scope.contents = $mmaModFolder.formatContents(module.contents);
        }
    }

    // Convenience function to fetch folder data from Moodle.
    function fetchFolder() {
        return $mmCourse.getModule(module.id, courseId, sectionId).then(function(module) {
            showModuleData(module);
        }, function(error) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mma.mod_folder.errorwhilegettingfolder', true);
            }

            if (!$scope.title) {
                // Error getting data from server. Use module param.
                showModuleData(module);
            }
            return $q.reject();
        });
    }

    if (path) {
        // Subfolder. Use module param.
        showModuleData(module);
        $scope.folderLoaded = true;
        $scope.canReload = false;
        $scope.refreshIcon = 'ion-refresh';
    } else {
        fetchFolder().then(function() {
            $mmaModFolder.logView(module.instance).then(function() {
                $mmCourse.checkModuleCompletion(courseId, module.completionstatus);
            });
        }).finally(function() {
            $scope.folderLoaded = true;
            $scope.canReload = true;
            $scope.refreshIcon = 'ion-refresh';
        });
    }

    // Convenience function that fills Context Menu Popover.
    function fillContextMenu(module, courseId, invalidateCache) {
        $mmCourseHelper.getModulePrefetchInfo(module, courseId, invalidateCache).then(function(moduleInfo) {
            $scope.size = moduleInfo.size > 0 ? moduleInfo.sizeReadable : 0;
            $scope.prefetchStatusIcon = moduleInfo.statusIcon;
            $scope.timemodified = moduleInfo.timemodified > 0 ? $translate.instant('mm.core.lastmodified') + ': ' + moduleInfo.timemodifiedReadable : "";
        });
    }

    $scope.removeFiles = function() {
        $mmUtil.showConfirm($translate('mm.course.confirmdeletemodulefiles')).then(function() {
            $mmCoursePrefetchDelegate.removeModuleFiles(module, courseId);
        });
    };

    // Context Menu Prefetch action.
    $scope.prefetch = function() {
        var icon = $scope.prefetchStatusIcon;

        $scope.prefetchStatusIcon = 'spinner'; // Show spinner since this operation might take a while.

        // We need to call getDownloadSize, the package might have been updated.
        $mmCoursePrefetchDelegate.getModuleDownloadSize(module, courseId).then(function(size) {
            $mmUtil.confirmDownloadSize(size).then(function() {
                $mmCoursePrefetchDelegate.prefetchModule(module, courseId).catch(function() {
                    if (!$scope.$$destroyed) {
                        $mmUtil.showErrorModal('mm.core.errordownloading', true);
                    }
                });
            }).catch(function() {
                // User hasn't confirmed, stop spinner.
                $scope.prefetchStatusIcon = icon;
            });
        }).catch(function(error) {
            $scope.prefetchStatusIcon = icon;
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.core.errordownloading', true);
            }
        });
    };

    // Context Menu Description action.
    $scope.expandDescription = function() {
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModFolderComponent, module.id);
    };

    $scope.refreshFolder = function() {
        if ($scope.canReload) {
            $scope.refreshIcon = 'spinner';
            return $mmCourse.invalidateModule(module.id).finally(function() {
                return fetchFolder().finally(function() {
                    $scope.refreshIcon = 'ion-refresh';
                    $scope.$broadcast('scroll.refreshComplete');
                });
            });
        }
    };
});
