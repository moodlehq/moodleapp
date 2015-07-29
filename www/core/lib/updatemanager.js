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

angular.module('mm.core')

.constant('mmCoreVersionApplied', 'version_applied')

/**
 * Factory to handle app updates. This factory shouldn't be used outside of core.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmUpdateManager
 * @description
 * This service handles processes that need to be run when updating the app, like migrate MM1 sites to MM2.
 */
.factory('$mmUpdateManager', function($log, $q, $mmConfig, $mmSitesManager, $mmFS, mmCoreVersionApplied) {

    $log = $log.getInstance('$mmUpdateManager');

    var self = {};

    /**
     * Check if the app has been updated and performs the needed processes.
     * This function shouldn't be used outside of core.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmUpdateManager#check
     * @return {Promise} Promise resolved when the update process finishes.
     */
    self.check = function() {
        var promises = [];

        return $mmConfig.get('versioncode').then(function(versionCode) {
            return $mmConfig.get(mmCoreVersionApplied, 0).then(function(versionApplied) {

                if (versionCode >= 391 && versionApplied < 391) {
                    // Migrating from MM1 to MM2.
                    promises.push(migrateMM1Sites());
                    // Ignore errors in clearAppFolder. We don't want to clear the folder
                    // everytime the app is opened if something goes wrong.
                    promises.push(clearAppFolder().catch(function() {}));
                }

                return $q.all(promises).then(function() {
                    return $mmConfig.set(mmCoreVersionApplied, versionCode);
                }).catch(function() {
                    $log.error('Error applying update from ' + versionApplied + ' to ' + versionCode);
                });
            });
        });
    };

    /**
     * Clear the app folder.
     *
     * @return {Promise} Promise resolved when the folder is cleared.
     */
    function clearAppFolder() {
        if ($mmFS.isAvailable()) {
            return $mmFS.getDirectoryContents('').then(function(entries) {
                var promises = [];
                angular.forEach(entries, function(entry) {
                    // In Android, don't delete 'cache' and 'files' folders, created by the OS.
                    var canDeleteAndroid = ionic.Platform.isAndroid() && entry.name !== 'cache' && entry.name !== 'files';
                    var canDeleteIOS = ionic.Platform.isIOS() && entry.name !== 'NoCloud';
                    if (canDeleteIOS || canDeleteAndroid) {
                        promises.push($mmFS.removeDir(entry.name));
                    }
                });
                return $q.all(promises);
            });
        } else {
            return $q.when();
        }
    }

    /**
     * Migrate MoodleMobile 1 sites to MoodleMobile 2.
     *
     * @return {Promise} Promise resolved when the sites are migrated.
     */
    function migrateMM1Sites() {
        var sites = localStorage.getItem('sites'),
            promises = [];

        if (sites) {
            sites = sites.split(',');

            angular.forEach(sites, function(siteid) {
                $log.debug('Migrating site from MoodleMobile 1: ' + siteid);
                var site = localStorage.getItem('sites-'+siteid),
                    infos;

                if (site) {
                    try {
                        site = JSON.parse(site);
                    } catch(ex) {
                        // Invalid site. Shouldn't happen.
                        $log.warn('Site ' + siteid + ' data is invalid. Ignoring.');
                        return;
                    }

                    // In MM1 site info is mixed with site basic data (id, token, siteurl).
                    infos = angular.copy(site);
                    delete infos.id;
                    delete infos.token;
                    promises.push($mmSitesManager.addSite(site.id, site.siteurl, site.token, infos));
                } else {
                    $log.warn('Site ' + siteid + ' not found in local storage. Ignoring.');
                }
            });
        }

        return $q.all(promises).then(function() {
            if (sites) {
                localStorage.clear();
            }
        });
    }

    return self;
});
