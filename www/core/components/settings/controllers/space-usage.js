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
.controller('mmSettingsSpaceUsageCtrl', function($log, $scope, $mmSitesManager, $mmFS, $q, $mmUtil, $translate, $mmSite,
            $mmText, $mmFilepool) {
    $log = $log.getInstance('mmSettingsSpaceUsageCtrl');

    $scope.currentSiteId = $mmSite.getId();

    // Convenience function to calculate each site's usage, and the total usage.
    function calculateSizeUsage() {
        return $mmSitesManager.getSites().then(function(sites) {
            var promises = [];

            // Sort sites by url and fullname.
            $scope.sites = $mmSitesManager.sortSites(sites);

            angular.forEach(sites, function(siteEntry) {
                var promise = $mmSitesManager.getSite(siteEntry.id).then(function(site) {
                    return site.getSpaceUsage().then(function(size) {
                        siteEntry.spaceusage = size;
                    });
                });
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
        if ($mmFS.isAvailable()) {
            return $mmFS.calculateFreeSpace().then(function(freespace) {
                $scope.freespace = freespace;
            }, function() {
                $scope.freespace = 0;
            });
        } else {
            $scope.freespace = 0;
        }
    }

    function fetchData() {
        var promises = [];
        promises.push(calculateSizeUsage().then(calculateTotalUsage));
        promises.push($q.when(calculateFreeSpace()));
        return $q.all(promises);
    }
    fetchData().finally(function() {
        $scope.sizeLoaded = true;
    });

    // Pull to refresh.
    $scope.refresh = function() {
        fetchData().finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    // Convenience function to update site size, along with total usage and free space.
    function updateSiteUsage(site, newUsage) {
        var oldUsage = site.spaceusage;
        site.spaceusage = newUsage;
        $scope.totalusage -= oldUsage - newUsage;
        $scope.freespace += oldUsage - newUsage;
    }

    $scope.deleteSiteFiles = function(siteData) {
        if (siteData) {
            var siteid = siteData.id,
                sitename = siteData.sitename;

            $mmText.formatText(sitename).then(function(sitename) {
                $translate('mm.settings.deletesitefilestitle').then(function(title) {
                    return $mmUtil.showConfirm($translate('mm.settings.deletesitefiles', {sitename: sitename}), title);
                }).then(function() {
                    return $mmSitesManager.getSite(siteid);
                }).then(function(site) {
                    return site.deleteFolder().then(function() {
                        $mmFilepool.clearAllPackagesStatus(siteid);
                        $mmFilepool.clearFilepool(siteid);
                        updateSiteUsage(siteData, 0);
                    }).catch(function(error) {
                        if (error && error.code === FileError.NOT_FOUND_ERR) {
                            // Not found, set size 0.
                            $mmFilepool.clearAllPackagesStatus(siteid);
                            updateSiteUsage(siteData, 0);
                        } else {
                            // Error, recalculate the site usage.
                            $mmUtil.showErrorModal('mm.settings.errordeletesitefiles', true);
                            site.getSpaceUsage().then(function(size) {
                                updateSiteUsage(siteData, size);
                            });
                        }
                    });
                });
            });
        }
    };
});
