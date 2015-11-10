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

.controller('mmaFilesIndexController', function($scope, $mmaFiles, $mmSite, $mmUtil, $mmApp, $state) {

    $scope.canAccessFiles = $mmaFiles.canAccessFiles;
    $scope.showPrivateFiles = function() {
        return $mmaFiles.canAccessFiles() && $mmSite.canAccessMyFiles();
    };
    $scope.showUpload = function() {
        // Show upload in this page if user can upload but he can't see the My Files option.
        return !$mmaFiles.canAccessFiles() && $mmSite.canAccessMyFiles() && $mmSite.canUploadFiles();
    };
    $scope.canDownload = $mmSite.canDownloadFiles;

    $scope.add = function() {
        if (!$mmApp.isOnline()) {
            $mmUtil.showErrorModal('mma.files.errormustbeonlinetoupload', true);
        } else {
            $state.go('site.files-upload');
        }
    };

});
