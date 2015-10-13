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

angular.module('mm.core.settings')

/**
 * Controller to handle the app 'About' section in settings.
 *
 * @module mm.core.settings
 * @ngdoc controller
 * @name mmSettingsAboutCtrl
 */
.controller('mmSettingsAboutCtrl', function($scope, $mmConfig, $translate, $window, $mmApp, $ionicPlatform, $mmLang, $mmFS,
            $mmLocalNotifications) {

    $mmConfig.get('versionname').then(function(versionname) {
        $scope.versionname = versionname;
        $translate('mm.settings.appname', {version: versionname}).then(function(appName) {
            $scope.appname = appName;
        });
    });

    $mmConfig.get('versioncode').then(function(versioncode) {
        $scope.versioncode = versioncode;
    });

    $scope.navigator = $window.navigator;
    if ($window.location && $window.location.href) {
        var url = $window.location.href;
        $scope.locationhref = url.substr(0, url.indexOf('#/site/'));
    }

    $scope.appready = $mmApp.isReady() ? 'mm.core.yes' : 'mm.core.no';
    $scope.devicetype = $ionicPlatform.isTablet() ? 'mm.core.tablet' : 'mm.core.phone';

    if (ionic.Platform.isAndroid()) {
        $scope.deviceos = 'mm.core.android';
    } else if (ionic.Platform.isIOS()) {
        $scope.deviceos = 'mm.core.ios';
    } else if (ionic.Platform.isWindowsPhone()) {
        $scope.deviceos = 'mm.core.windowsphone';
    } else {
        var matches = navigator.userAgent.match(/\(([^\)]*)\)/);
        if (matches && matches.length > 1) {
            $scope.deviceos = matches[1]
        } else {
            $scope.deviceos = 'mm.core.unknown';
        }
    }

    $mmLang.getCurrentLanguage().then(function(lang) {
        $scope.currentlanguage = lang;
    });

    $scope.networkstatus = $mmApp.isOnline() ? 'mm.core.online' : 'mm.core.offline';
    $scope.wificonnection = $mmApp.isNetworkAccessLimited() ? 'mm.core.no' : 'mm.core.yes';
    $scope.devicewebworkers = !!window.Worker && !!window.URL ? 'mm.core.yes' : 'mm.core.no';
    $scope.device = ionic.Platform.device();

    if ($mmFS.isAvailable()) {
        $mmFS.getBasePath().then(function(basepath) {
            $scope.filesystemroot = basepath;
        });
    }

    $scope.storagetype = $mmApp.getDB().getType();
    $scope.localnotifavailable = $mmLocalNotifications.isAvailable() ? 'mm.core.yes' : 'mm.core.no';
});
