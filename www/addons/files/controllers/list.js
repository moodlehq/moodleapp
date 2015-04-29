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

.controller('mmaFilesListController', function($q, $scope, $stateParams, $ionicActionSheet,
        $mmaFiles, $mmSite, $translate, $timeout, $mmUtil, $mmFS, $mmWS, $mmaFilesHelper) {

    var path = $stateParams.path,
        root = $stateParams.root,
        title,
        promise,
        siteInfos = $mmSite.getInfo(),
        showUpload = (root === 'my' && !path && $mmSite.canUploadFiles());

    // We're loading the files.
    $scope.count = -1;

    // Convenience function that fetches the files and updates the scope.
    // It was place in its own function so that we can refresh the files.
    function fetchFiles(root, path, refresh) {
        $translate('loading').then(function(str) {
            $mmUtil.showModalLoading(str);
        });
        refresh = (typeof refresh === 'undefined') ? false : refresh;

        if (!path) {
            // The path is unknown, the user must be requesting a root.
            if (root === 'site') {
                promise = $mmaFiles.getSiteFiles(refresh);
                title = $translate('mma.files.sitefiles');
            } else if (root === 'my') {
                promise = $mmaFiles.getMyFiles(refresh);
                title = $translate('mma.files.myprivatefiles');
            } else {
                // Upon error we create a fake promise that is rejected.
                promise = $q.reject();
                title = (function() {
                    var q = $q.defer();
                    q.resolve('');
                    return q.promise;
                })();
            }
        } else {
            // Serve the files the user requested.
            pathdata = JSON.parse(path);
            promise = $mmaFiles.getFiles(pathdata, refresh);

            // Put the title in a promise to act like translate does.
            title = (function() {
                var q = $q.defer();
                q.resolve($stateParams.title);
                return q.promise;
            })();
        }

        $q.all([promise, title]).then(function(data) {
            var files = data[0],
                title = data[1];

            $scope.files = files.entries;
            $scope.count = files.count;
            $scope.title = title;
        }, function() {
            $mmUtil.showErrorModal('mma.files.couldnotloadfiles', true);
        }).finally(function() {
            $mmUtil.closeModalLoading();
        });
    }
    fetchFiles(root, path);

    // Downloading a file.
    $scope.download = function(file) {
        if (!$mmSite.canDownloadFiles()) {
            return false;
        }

        $translate('mma.files.downloading').then(function(str) {
            $mmUtil.showModalLoading(str);
        });
        $mmaFiles.getFile(file).then(function(fileEntry) {
            $mmUtil.closeModalLoading();
            $mmUtil.openFile(fileEntry.toURL());
        }, function() {
            $mmUtil.closeModalLoading();
            $mmUtil.showErrorModal('mma.files.errorwhiledownloading', true);
        });
    };

    // When we are in the root of the private files we can add more files.
    if (showUpload) {

        $scope.add = function() {
            $mmaFilesHelper.pickAndUploadFile().then(function() {
                fetchFiles(root, path, true);
            }, function(err) {
                if (err) {
                    $mmUtil.showErrorModal(err);
                }
            });
        };

    }
});
