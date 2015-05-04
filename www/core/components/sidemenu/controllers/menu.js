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

angular.module('mm.core.sidemenu')

/**
 * Controller to handle the side menu.
 *
 * @module mm.core.sidemenu
 * @ngdoc controller
 * @name mmSideMenuCtrl
 */
.controller('mmSideMenuCtrl', function($scope, $state, $mmSideMenuDelegate, $mmSitesManager, $mmSite, $mmConfig) {
    $scope.plugins = $mmSideMenuDelegate.getData();
    $scope.siteinfo = $mmSite.getInfo();

    $scope.logout = function() {
        $mmSitesManager.logout().finally(function() {
            $state.go('mm_login.sites');
        });
    };

    // Get docs URL based on site version and current language.
    $scope.docsurl = 'http://docs.moodle.org/en/Mobile_app';
    if (typeof($scope.siteinfo) !== 'undefined' && typeof($scope.siteinfo.release) === 'string') {
        var release = $scope.siteinfo.release.substr(0, 3).replace(".", "");
        // Check is a valid number.
        if (parseInt(release) >= 24) {
            // Append release number.
            $scope.docsurl = $scope.docsurl.replace("http://docs.moodle.org/", "http://docs.moodle.org/" + release + "/");
        }
    }

    $mmConfig.get('current_language').then(function(lang) {
        $mmConfig.get('languages').then(function(languages) {
            if (languages.indexOf(lang) > -1) {
                $scope.docsurl = 'http://docs.moodle.org/' + lang + '/Mobile_app';
            }
        });
    });
});
