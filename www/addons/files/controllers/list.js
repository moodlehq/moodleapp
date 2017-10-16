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

.controller('mmaFilesListController', function($q, $scope, $stateParams, $mmaFiles, $mmSite, $translate, $mmUtil, $mmText,
        $mmaFilesHelper, $mmApp, mmaFilesMyComponent, mmaFilesSiteComponent) {

    var path = $stateParams.path,
        root = $stateParams.root,
        isMyFiles = root === 'my',
        isSiteFiles = root === 'site',
        userQuota = $mmSite.getInfo().userquota,
        promise;

    // We're loading the files.
    $scope.count = -1;
    $scope.component = isMyFiles ? mmaFilesMyComponent : mmaFilesSiteComponent;
    $scope.showUpload = isMyFiles && !path && $mmSite.canUploadFiles() && !$mmaFiles.isUploadDisabledInSite();

    // Convenience function that fetches the files and updates the scope.
    function fetchFiles() {
        if (!path) {
            // The path is unknown, the user must be requesting a root.
            if (isSiteFiles) {
                promise = $mmaFiles.getSiteFiles();
                $scope.title = $translate.instant('mma.files.sitefiles');
            } else if (isMyFiles) {
                promise = $mmaFiles.getMyFiles().then(function(files) {
                    if ($scope.showUpload && $mmaFiles.canGetPrivateFilesInfo() && userQuota > 0) {
                        // Get the info to calculate the available size.
                        return $mmaFiles.getPrivateFilesInfo().then(function(info) {
                            $scope.filesInfo = info;
                            $scope.spaceUsed = $mmText.bytesToSize(info.filesizewithoutreferences, 1);
                            $scope.userQuota = $mmText.bytesToSize(userQuota, 1);

                            return files;
                        });
                    } else {
                        delete $scope.userQuota;
                    }

                    return files;
                });
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
        var promises = [];

        promises.push($mmaFiles.invalidateDirectory(root, path));
        promises.push($mmaFiles.invalidatePrivateFilesInfoForUser());

        return $q.all(promises).finally(function() {
            return fetchFiles();
        });
    }

    fetchFiles().finally(function() {
        $scope.filesLoaded = true;
    });

    $scope.refreshFiles = function() {
        refreshFiles().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // When we are in the root of the private files we can add more files.
    $scope.add = function() {
        $mmaFiles.versionCanUploadFiles().then(function(canUpload) {
            if (!canUpload) {
                $mmUtil.showModal('mm.core.notice', 'mma.files.erroruploadnotworking');
            } else if (!$mmApp.isOnline()) {
                $mmUtil.showErrorModal('mm.fileuploader.errormustbeonlinetoupload', true);
            } else {
                $mmaFilesHelper.selectAndUploadFile($scope.filesInfo).then(function() {
                    $scope.filesLoaded = false;
                    refreshFiles().finally(function() {
                        $scope.filesLoaded = true;
                    });
                });
            }
        });
    };
});
