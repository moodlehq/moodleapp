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

/**
 * Settings helper service.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmSettingsHelper
 */
.factory('$mmSettingsHelper', function($log, $mmSitesManager, $q, $mmFilepool, $mmLang, $mmEvents, $mmCronDelegate, $mmApp,
            mmCoreEventSessionExpired) {

    $log = $log.getInstance('$mmSettingsHelper');

    var self = {},
        sites = {},
        syncPromises = {};

    /**
     * Get stored sites with a flag telling if they're being synchronized.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSettingsHelper#getSites
     * @return {Promise} Promise resolved with sites.
     */
    self.getSites = function() {
        return $mmSitesManager.getSites().then(function(dbSites) {
            var newSites = {}; // Create a new object to prevent showing sites that have been deleted.

            angular.forEach(dbSites, function(site) {
                if (sites[site.id]) {
                    // Site already stored. Use the object stored in this service to keep the synchronizing flag.
                    newSites[site.id] = sites[site.id];
                    // Update fields.
                    newSites[site.id].siteurl = site.siteurl;
                    newSites[site.id].fullname = site.fullname;
                    newSites[site.id].sitename = site.sitename;
                    newSites[site.id].avatar = site.avatar;
                } else {
                    // Site not stored, store it and initialize the synchronizing flag.
                    newSites[site.id] = site;
                    newSites[site.id].synchronizing = false;
                }
            });

            sites = newSites;
            return sites;
        });
    };

    /**
     * Get the synchronization promise of a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSettingsHelper#getSiteSyncPromise
     * @param  {String} siteId ID of the site.
     * @return {Promise}       Sync promise.
     */
    self.getSiteSyncPromise = function(siteId) {
        if (syncPromises[siteId]) {
            return syncPromises[siteId];
        } else {
            return $q.when();
        }
    };

    /**
     * Synchronize a site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmSettingsHelper#synchronizeSite
     * @param  {Boolean} syncOnlyOnWifi True to sync only on wifi, false otherwise.
     * @param  {String} siteId          ID of the site to synchronize.
     * @return {Promise}                Promise resolved when synchronized, rejected if failure.
     */
    self.synchronizeSite = function(syncOnlyOnWifi, siteId) {
        if (!sites[siteId]) {
            return $q.reject();
        }

        if (syncPromises[siteId]) {
            // There's already a sync ongoing for this site, return the promise.
            return syncPromises[siteId];
        }

        var promises = [],
            syncPromise,
            deleted = false,
            hasSyncHooks = $mmCronDelegate.hasSyncHooks();

        if (hasSyncHooks && !$mmApp.isOnline()) {
            // We need connection to execute sync.
            return $mmLang.translateAndReject('mm.settings.cannotsyncoffline');
        } else if (hasSyncHooks && syncOnlyOnWifi && $mmApp.isNetworkAccessLimited()) {
            return $mmLang.translateAndReject('mm.settings.cannotsyncwithoutwifi');
        }

        sites[siteId].synchronizing = true;

        // Invalidate all the site files so they are re-downloaded.
        promises.push($mmFilepool.invalidateAllFiles(siteId).catch(function() {
            // Ignore errors.
        }));

        // Get the site to invalidate data.
        promises.push($mmSitesManager.getSite(siteId).then(function(site) {
            // Invalidate the WS cache.
            return site.invalidateWsCache().then(function() {
                var subPromises = [];

                // Check if local_mobile was installed in Moodle.
                subPromises.push(site.checkIfLocalMobileInstalledAndNotUsed().then(function() {
                    // Local mobile was added. Throw invalid session to force reconnect and create a new token.
                    $mmEvents.trigger(mmCoreEventSessionExpired, siteId);
                    return $mmLang.translateAndReject('mm.core.lostconnection');
                }, function() {
                    // Update site info.
                    return $mmSitesManager.updateSiteInfo(siteId).then(function() {
                        // Site info updated. Update the stored data.
                        sites[siteId].siteurl = site.getInfo().siteurl;
                        sites[siteId].fullname = site.getInfo().fullname;
                        sites[siteId].sitename = site.getInfo().sitename;
                        sites[siteId].avatar = site.getInfo().userpictureurl;
                    });
                }));

                // Execute cron if needed.
                subPromises.push($mmCronDelegate.forceSyncExecution(siteId));

                return $q.all(subPromises);
            });
        }));

        syncPromise = $q.all(promises).finally(function() {
            sites[siteId].synchronizing = false;
            deleted = true;
            delete syncPromises[siteId];
        });

        if (!deleted) {
            syncPromises[siteId] = syncPromise;
        }
        return syncPromise;
    };

    return self;
});
