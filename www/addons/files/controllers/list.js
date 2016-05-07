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

angular.module('mm.addons.files')

.controller('mmaFilesListController', function($q, $scope, $stateParams, $mmaFiles, $mmSite, $translate, $mmUtil,
        $ionicHistory, mmaFilesUploadStateName, $state, $mmApp, mmaFilesMyComponent, mmaFilesSiteComponent) {

    var path = $stateParams.path,
        root = $stateParams.root,
        promise;

    // We're loading the files.
    $scope.count = -1;
    $scope.component = root === 'my' ? mmaFilesMyComponent : mmaFilesSiteComponent;

    // Convenience function that fetches the files and updates the scope.
    function fetchFiles(root, path) {
        if (!path) {
            // The path is unknown, the user must be requesting a root.
            if (root === 'site') {
                promise = $mmaFiles.getSiteFiles();
                $scope.title = $translate.instant('mma.files.sitefiles');
            } else if (root === 'my') {
                promise = $mmaFiles.getMyFiles();
                $scope.title = $translate.instant('mma.files.myprivatefiles');
            } else {
                // Upon error we create a fake promise that is rejected.
                promise = $q.reject();
            }
        } else {
            // Serve the files the user requested.
            pathdata = JSON.parse(path);
            promise = $mmaFiles.getFiles(pathdata);
            $scope.title = $stateParams.title;
        }

        return promise.then(function(files) {
            $scope.files = files.entries;
            $scope.count = files.count;
        }).catch(function() {
            $mmUtil.showErrorModal('mma.files.couldnotloadfiles', true);
        });
    }

    fetchFiles(root, path).finally(function() {
        $scope.filesLoaded = true;
    });

    $scope.refreshFiles = function() {
        $mmaFiles.invalidateDirectory(root, path).finally(function() {
            fetchFiles(root, path).finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
    };

    // Update list if we come from upload page (we don't know if user upoaded a file or not).
    // List is invalidated in upload state after uploading a file.
    $scope.$on('$ionicView.enter', function() {
        var forwardView = $ionicHistory.forwardView();
        if (forwardView && forwardView.stateName === mmaFilesUploadStateName) {
            $scope.filesLoaded = false;
            fetchFiles(root, path).finally(function() {
                $scope.filesLoaded = true;
            });
        }
    });

    $scope.showUpload = function() {
        return (root === 'my' && !path && $mmSite.canUploadFiles());
    };

    // When we are in the root of the private files we can add more files.
    $scope.add = function() {
        if (!$mmApp.isOnline()) {
            $mmUtil.showErrorModal('mma.files.errormustbeonlinetoupload', true);
        } else {
            $state.go('site.files-upload', {root: root, path: path});
        }
    };
});
