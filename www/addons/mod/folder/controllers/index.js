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
.controller('mmaModFolderIndexCtrl', function($scope, $stateParams, $mmaModFolder, $mmCourse, $mmUtil, $q, $mmText, $translate,
            mmaModFolderComponent, $mmCourseHelper, $mmApp) {
    var module = $stateParams.module || {},
        courseId = $stateParams.courseid,
        sectionId = $stateParams.sectionid,
        path = $stateParams.path;

    $scope.title = module.name;
    $scope.description = module.description;
    $scope.moduleUrl = module.url;
    $scope.refreshIcon = 'spinner';
    $scope.component = mmaModFolderComponent;
    $scope.componentId = module.id;
    $scope.canGetFolder = $mmaModFolder.isGetFolderWSAvailable();

    // Convenience function to set scope data using module.
    function showModuleData(module) {
        $scope.title = module.name;
        $scope.description = module.intro || module.description;
        if (path) {
            // Subfolder.
            $scope.contents = module.contents;
        } else {
            $scope.contents = $mmaModFolder.formatContents(module.contents);
        }
    }

    // Convenience function to fetch folder data from Moodle.
    function fetchFolder(refresh) {
        var promise;
        if ($scope.canGetFolder) {
            promise = $mmaModFolder.getFolder(courseId, module.id).then(function(folder) {
                return $mmCourse.loadModuleContents(module, courseId).then(function() {
                    folder.contents = module.contents;
                    return folder;
                });
            });
        } else {
            promise = $mmCourse.getModule(module.id, courseId, sectionId).then(function(mod) {
                if (!mod.contents.length && module.contents.length && !$mmApp.isOnline()) {
                    // The contents might be empty due to a cached data. Use the old ones.
                    mod.contents = module.contents;
                }
                module = mod;
                return mod;
            });
        }

        return promise.then(function(folder) {
            showModuleData(folder);
            $mmCourseHelper.fillContextMenu($scope, module, courseId, refresh, mmaModFolderComponent);
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.mod_folder.errorwhilegettingfolder', true);
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
        $mmText.expandText($translate.instant('mm.core.description'), $scope.description, false, mmaModFolderComponent, module.id);
    };

    $scope.refreshFolder = function() {
        if ($scope.canReload) {
            $scope.refreshIcon = 'spinner';

            return $mmaModFolder.invalidateContent(module.id, courseId).finally(function() {
                return fetchFolder(true).finally(function() {
                    $scope.refreshIcon = 'ion-refresh';
                    $scope.$broadcast('scroll.refreshComplete');
                });
            });
        }
    };
});
