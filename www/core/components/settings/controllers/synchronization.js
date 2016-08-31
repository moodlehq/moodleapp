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
 * Controller to handle the app 'Synchronization' section in settings.
 *
 * @module mm.core.settings
 * @ngdoc controller
 * @name mmSettingsSynchronizationCtrl
 */
.controller('mmSettingsSynchronizationCtrl', function($log, $scope, $mmUtil, $mmConfig, $mmSettingsHelper,
            mmCoreSettingsSyncOnlyOnWifi) {
    $log = $log.getInstance('mmSettingsSynchronizationCtrl');

    // Get the sites to show.
    $mmSettingsHelper.getSites().then(function(sites) {
        $scope.sites = sites;

        // If a site is being synchronized, show error modal if it fails.
        angular.forEach(sites, function(site) {
            if (site.synchronizing) {
                $mmSettingsHelper.getSiteSyncPromise(site.id).catch(errorSyncing);
            }
        });
    });

    $mmConfig.get(mmCoreSettingsSyncOnlyOnWifi, true).then(function(syncOnlyOnWifi) {
        $scope.syncOnlyOnWifi = syncOnlyOnWifi;
    });

    $scope.syncWifiChanged = function(syncOnlyOnWifi) {
        $mmConfig.set(mmCoreSettingsSyncOnlyOnWifi, syncOnlyOnWifi);
    };

    $scope.synchronize = function(siteId) {
        if ($scope.sites[siteId] && !$scope.sites[siteId].synchronizing) {
            $mmSettingsHelper.synchronizeSite($scope.syncOnlyOnWifi, siteId).catch(errorSyncing);
        }
    };

    function errorSyncing(error) {
        if (!$scope.$$destroyed) {
            if (error) {
                $mmUtil.showErrorModal(error);
            } else {
                $mmUtil.showErrorModal('mm.settings.errorsyncsite', true);
            }
        }
    }
});
