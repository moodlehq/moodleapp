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
 * Controller to handle the app 'Space Usage' section in settings.
 *
 * @module mm.core.settings
 * @ngdoc controller
 * @name mmSettingsSpaceUsageCtrl
 * @todo When "mock site" is implemented we should have functions to calculate the site usage and delete its files.
 */
.controller('mmSettingsSpaceUsageCtrl', function($log, $scope, $mmSitesManager, $mmFS, $q, $mmUtil, $translate) {
    $log = $log.getInstance('mmSettingsSpaceUsageCtrl');

    var fsAvailable = $mmFS.isAvailable();

    // Convenience function to calculate each site's usage, and the total usage.
    function calculateSizeUsage() {
        return $mmSitesManager.getSites().then(function(sites) {
            var promises = [];
            $scope.sites = sites;

            angular.forEach(sites, function(site) {
                var promise;
                if (fsAvailable) {
                    var siteFolderPath = $mmFS.getSiteFolder(site.id);
                    promise = $mmFS.getDirectorySize(siteFolderPath).then(function(size) {
                        site.spaceusage = size;
                    }, function() {
                        site.spaceusage = 0;
                    });
                } else {
                    site.spaceusage = 0;
                }
                promises.push(promise);
            });

            return $q.all(promises);
        });
    }

    // Convenience function to calculate total usage.
    function calculateTotalUsage() {
        var total = 0;
        angular.forEach($scope.sites, function(site) {
            if (site.spaceusage) {
                total += parseInt(site.spaceusage, 10);
            }
        });
        $scope.totalusage = total;
    }

    // Convenience function to calculate free space in the device.
    function calculateFreeSpace() {
        if (fsAvailable) {
            $mmFS.calculateFreeSpace().then(function(freespace) {
                $scope.freespace = freespace;
            }, function() {
                $scope.freespace = 0;
            });
        } else {
            $scope.freespace = 0;
        }
    }

    calculateSizeUsage().then(function() {
        calculateTotalUsage();
    });
    calculateFreeSpace();

    // Convenience function to update site size, along with total usage and free space.
    function updateSiteUsage(site, newUsage) {
        var oldUsage = site.spaceusage;
        site.spaceusage = newUsage;
        $scope.totalusage -= oldUsage - newUsage;
        $scope.freespace += oldUsage - newUsage;
    }

    $scope.deleteSiteFiles = function(index) {
        var site = $scope.sites[index];
        if (site) {
            var siteid = site.id;
            var sitename = site.sitename;

            $translate('mm.settings.deletesitefilestitle').then(function(title) {
                $mmUtil.showConfirm($translate('mm.settings.deletesitefiles', {sitename: sitename}), title).then(function() {
                    var siteFolderPath = $mmFS.getSiteFolder(siteid);
                    $mmFS.removeDir(siteFolderPath).then(function() {
                        updateSiteUsage(site, 0);
                    }, function(error) {
                        if (error.code !== FileError.NOT_FOUND_ERR) {
                            // Error, recalculate the site usage.
                            $mmUtil.showErrorModal('mm.settings.errordeletesitefiles', true);
                            return $mmFS.getDirectorySize(siteFolderPath).then(function(size) {
                                updateSiteUsage(site, size);
                            });
                        } else {
                            // Not found, set size 0.
                            updateSiteUsage(site, 0);
                        }
                    });
                });

            });
        }
    };
});
