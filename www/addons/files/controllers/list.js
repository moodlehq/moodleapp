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
        $mmaFilesHelper, $mmApp, mmaFilesMyComponent, mmaFilesSiteComponent) {

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
                $scope.title = $translate.instant('mma.files.files');
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
        }).catch(function(error) {
            $mmUtil.showErrorModalDefault(error, 'mma.files.couldnotloadfiles', true);
            return $q.reject();
        });
    }

    // Function to refresh files list.
    function refreshFiles() {
        return $mmaFiles.invalidateDirectory(root, path).finally(function() {
            return fetchFiles(root, path);
        });
    }

    fetchFiles(root, path).finally(function() {
        $scope.filesLoaded = true;
    });

    $scope.refreshFiles = function() {
        refreshFiles().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.showUpload = root === 'my' && !path && $mmSite.canUploadFiles() && !$mmaFiles.isUploadDisabledInSite();

    // When we are in the root of the private files we can add more files.
    $scope.add = function() {
        $mmaFiles.versionCanUploadFiles().then(function(canUpload) {
            if (!canUpload) {
                $mmUtil.showModal('mm.core.notice', 'mma.files.erroruploadnotworking');
            } else if (!$mmApp.isOnline()) {
                $mmUtil.showErrorModal('mm.fileuploader.errormustbeonlinetoupload', true);
            } else {
                $mmaFilesHelper.selectAndUploadFile().then(function() {
                    $scope.filesLoaded = false;
                    refreshFiles().finally(function() {
                        $scope.filesLoaded = true;
                    });
                });
            }
        });
    };
});
