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

angular.module('mm.core.sharedfiles')

/**
 * Controller to manage the shared files stored in a site or pick one.
 *
 * @module mm.core.sharedfiles
 * @ngdoc controller
 * @name mmSharedFilesListCtrl
 */
.controller('mmSharedFilesListCtrl', function($scope, $stateParams, $mmSharedFiles, $ionicScrollDelegate, $state, $mmFS,
            $translate, $mmEvents, $mmSite, $mmSharedFilesHelper, $ionicHistory, mmSharedFilesEventFileShared) {

    var path = $stateParams.path || '',
        manage = $stateParams.manage,
        pick = $stateParams.pick,
        shareObserver,
        siteId = $mmSite.getId();
        window.path = path;

    $scope.manage = manage;
    $scope.pick = pick;
    if (path) {
        $scope.title = $mmFS.getFileAndDirectoryFromPath(path).name;
    } else {
        $scope.title = $translate.instant('mm.sharedfiles.sharedfiles');
    }

    function loadFiles() {
        return $mmSharedFiles.getSiteSharedFiles(siteId, path).then(function(files) {
            $scope.files = files;
        });
    }

    loadFiles().finally(function() {
        $scope.filesLoaded = true;
    });

    // Listen for new files shared with the app.
    shareObserver = $mmEvents.on(mmSharedFilesEventFileShared, function(data) {
        if (data.siteid == siteId) {
            // File was stored in current site, refresh the list.
            $scope.filesLoaded = false;
            loadFiles().finally(function() {
                $scope.filesLoaded = true;
            });
        }
    });

    $scope.refreshFiles = function() {
        loadFiles().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Called when a file is deleted. Remove the file from the list.
    $scope.fileDeleted = function(index) {
        $scope.files.splice(index, 1);
        $ionicScrollDelegate.resize(); // Resize scroll area.
    };

    // Called when a file is renamed. Update the list.
    $scope.fileRenamed = function(index, file) {
        $scope.files[index] = file;
    };

    // Open a subfolder.
    $scope.openFolder = function(folder) {
        $state.go('site.sharedfiles-list', {path: $mmFS.concatenatePaths(path, folder.name), manage: manage, pick: pick});
    };

    // Change site loaded.
    $scope.changeSite = function(sid) {
        siteId = sid;
        $scope.filesLoaded = false;
        loadFiles().finally(function() {
            $scope.filesLoaded = true;
        });
    };

    // $mmSharedFilesHelper#hasPickedFile

    if (pick) {
        // File picked.
        $scope.filePicked = function(file) {
            $mmSharedFilesHelper.filePicked(file.fullPath);
            if (path) {
                var count = path.split('/').length + 1;
                $ionicHistory.goBack(-count);
            } else {
                $ionicHistory.goBack();
            }
        };
    }

    $scope.$on('$destroy', function() {
        shareObserver && shareObserver.off && shareObserver.off();
        if (pick && !path) {
            $mmSharedFilesHelper.filePickerClosed();
        }
    });
});
