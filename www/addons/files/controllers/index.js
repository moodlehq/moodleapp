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

.controller('mmaFilesIndexController', function($scope, $mmaFiles, $mmSite, $mmUtil, $mmApp, $mmaFilesHelper, $mmEvents,
            mmCoreEventSiteUpdated) {

    var updateSiteObserver;

    // Set scope data.
    function setData() {
        var canAccessFiles = $mmaFiles.canAccessFiles(),
            canAccessMyFiles = $mmSite.canAccessMyFiles(),
            canViewMyFiles = canAccessFiles && !$mmaFiles.isPrivateFilesDisabledInSite();

        $scope.showPrivateFiles = canViewMyFiles && canAccessMyFiles;
        $scope.showSiteFiles = !$mmaFiles.isSiteFilesDisabledInSite();
        $scope.canDownload = $mmSite.canDownloadFiles();

        // Show upload in this page if user can upload but he can't see the My Files option.
        $scope.showUpload = !canViewMyFiles && canAccessMyFiles && $mmSite.canUploadFiles() && !$mmaFiles.isUploadDisabledInSite();
    }

    setData();

    $scope.add = function() {
        $mmaFiles.versionCanUploadFiles().then(function(canUpload) {
            if (!canUpload) {
                $mmUtil.showModal('mm.core.notice', 'mma.files.erroruploadnotworking');
            } else if (!$mmApp.isOnline()) {
                $mmUtil.showErrorModal('mm.fileuploader.errormustbeonlinetoupload', true);
            } else {
                $mmaFilesHelper.selectAndUploadFile();
            }
        });
    };

    // Update scope data if current site info is updated.
    updateSiteObserver = $mmEvents.on(mmCoreEventSiteUpdated, function(siteId) {
        if ($mmSite.getId() === siteId) {
            setData();
        }
    });

    $scope.$on('$destroy', function() {
        updateSiteObserver && updateSiteObserver.off && updateSiteObserver.off();
    });
});
