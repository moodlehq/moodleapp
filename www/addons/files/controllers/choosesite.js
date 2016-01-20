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

/**
 * Controller to upload any kind of file on iOS. Lets the user choose the site he wants to upload the file to.
 *
 * @module mm.addons.files
 * @ngdoc controller
 * @name mmaFilesChooseSiteCtrl
 */
.controller('mmaFilesChooseSiteCtrl', function($scope, $stateParams, $mmSitesManager, $mmaFilesHelper, $ionicHistory,
            $mmLoginHelper) {

    var fileEntry = $stateParams.file || {};
    $scope.filename = fileEntry.name;

    $mmSitesManager.getSites().then(function(sites) {
        $scope.sites = sites;
    });

    $scope.uploadInSite = function(siteid) {
        $mmaFilesHelper.showConfirmAndUploadInSite(fileEntry, siteid).then(function() {
            $ionicHistory.nextViewOptions({
                disableBack: true
            });
            $mmLoginHelper.goToSiteInitialPage();
        });
    };
});
