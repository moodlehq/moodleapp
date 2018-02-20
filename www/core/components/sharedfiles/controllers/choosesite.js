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
 * Controller to choose the site where to store a shared file.
 *
 * @module mm.core.sharedfiles
 * @ngdoc controller
 * @name mmSharedFilesChooseSiteCtrl
 */
.controller('mmSharedFilesChooseSiteCtrl', function($scope, $stateParams, $mmSitesManager, $mmUtil, $ionicHistory, $mmFS,
            $mmSharedFilesHelper) {

    var filePath = $stateParams.filepath || {},
        fileAndDir = $mmFS.getFileAndDirectoryFromPath(filePath),
        fileEntry;

    if (!filePath) {
        $mmUtil.showErrorModal('Error reading file.');
        $ionicHistory.goBack();
        return;
    }

    $scope.filename = fileAndDir.name;

    // Get the file.
    $mmFS.getFile(filePath).then(function(fe) {
        fileEntry = fe;
        $scope.filename = fileEntry.name;
    }).catch(function() {
        $mmUtil.showErrorModal('Error reading file.');
        $ionicHistory.goBack();
    });

    // Get the sites.
    $mmSitesManager.getSites().then(function(sites) {
        $scope.sites = sites;
    }).finally(function() {
        $scope.loaded = true;
    });

    $scope.storeInSite = function(siteId) {
        $scope.loaded = false;
        $mmSharedFilesHelper.storeSharedFileInSite(fileEntry, siteId).then(function() {
            $ionicHistory.goBack();
        }).finally(function() {
            $scope.loaded = true;
        });
    };
});
