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
 * Controller to manage the shared files stored in a site.
 *
 * @module mm.core.sharedfiles
 * @ngdoc controller
 * @name mmSharedFilesManageCtrl
 */
.controller('mmSharedFilesManageCtrl', function($scope, $mmSharedFiles, $ionicScrollDelegate) {

    function loadFiles() {
        return $mmSharedFiles.getSiteSharedFiles().then(function(files) {
            $scope.files = files;
        });
    }

    loadFiles().finally(function() {
        $scope.filesLoaded = true;
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
});
