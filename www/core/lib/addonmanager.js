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

.constant('mmAddonManagerComponent', 'mmAddonManager')

/**
 * @ngdoc service
 * @name $mmAddonManager
 * @module mm.core
 * @description
 * This service provides functions related to addons, like checking if an addon is available.
 */
.factory('$mmAddonManager', function($log, $injector, $ocLazyLoad, $mmFilepool, $mmSite, $mmFS, $mmLang, $mmSitesManager, $q,
            $mmUtil, mmAddonManagerComponent, mmCoreNotDownloaded) {

    $log = $log.getInstance('$mmAddonManager');

    var self = {},
        instances = {},
        remoteAddonsFolderName = 'remoteaddons',
        remoteAddonFilename = 'addon.js',
        remoteAddonCssFilename = 'styles.css',
        pathWildcardRegex = /\$ADDONPATH\$/g,
        headEl = angular.element(document.querySelector('head')),
        loadedAddons = [];

    /**
     * Download a remote addon if it's not downloaded already.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#downloadRemoteAddon
     * @param  {Object} addon    Addon to download.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the file is downloaded. Data returned is not reliable.
     */
    self.downloadRemoteAddon = function(addon, siteId) {
        siteId = siteId || $mmSite.getId();

        var name = self.getRemoteAddonName(addon),
            dirPath = self.getRemoteAddonDirectoryPath(addon),
            revision = addon.filehash,
            file = {
                filename: name + '.zip',
                fileurl: addon.fileurl
            };

        // Get the status to check if it's already downloaded.
        return $mmFilepool.getPackageStatus(siteId, mmAddonManagerComponent, name, revision, 0).then(function(status) {
            if (status !== $mmFilepool.FILEDOWNLOADED) {
                // Not downloaded or outdated. Download the ZIP file in the filepool folder.
                return $mmFilepool.downloadPackage(siteId, [file], mmAddonManagerComponent, name, revision, 0).then(function() {
                    // Remove the destination folder to prevent having old unused files.
                    return $mmFS.removeDir(dirPath).catch(function() {});
                }).then(function() {
                    // Get the ZIP file path.
                    return $mmFilepool.getFilePathByUrl(siteId, addon.fileurl);
                }).then(function(zipPath) {
                    // Unzip and delete the zip when finished.
                    return $mmFS.unzipFile(zipPath, dirPath).then(function() {
                        return $mmFilepool.removeFileByUrl(siteId, addon.fileurl).catch(function() {});
                    });
                }).then(function() {
                    // Get the directory to get the absolute dirPath.
                    return $mmFS.getDir(dirPath);
                }).then(function(dir) {
                    var absoluteDirPath = $mmFS.getInternalURL(dir);

                    // Remove / in the end if it's there.
                    if (absoluteDirPath.slice(-1) == '/') {
                        absoluteDirPath = absoluteDirPath.substring(0, absoluteDirPath.length - 1);
                    }

                    // Replace path wildcards with the right path.
                    var addonMainFile = $mmFS.concatenatePaths(dirPath, remoteAddonFilename);
                    return $mmFS.replaceInFile(addonMainFile, pathWildcardRegex, absoluteDirPath);
                }).catch(function() {
                    // Error, set status as it was before.
                    return self.setRemoteAddonStatus(addon, status).then(function() {
                        return $q.reject();
                    });
                });
            }
        });
    };

    /**
     * Download the remote addons for a certain site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#downloadRemoteAddons
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when done. Returns the list of downloaded addons.
     */
    self.downloadRemoteAddons = function(siteId) {
        siteId = siteId || $mmSite.getId();

        var downloaded = [],
            preSets = {};

        return $mmSitesManager.getSite(siteId).then(function(site) {
            // Get the list of addons. Try not to use cache.
            preSets.getFromCache = 0;
            return site.read('tool_mobile_get_plugins_supporting_mobile', {}, preSets).then(function(data) {
                var promises = [];

                angular.forEach(data.plugins, function(addon) {
                    promises.push(self.downloadRemoteAddon(addon, siteId).then(function() {
                        downloaded.push(addon);
                    }));
                });

                return $mmUtil.allPromises(promises).then(function() {
                    return downloaded;
                }).catch(function() {
                    // Some download failed, return the downloaded ones anyway.
                    return downloaded;
                });
            });
        });
    };

    /**
     * Get a service instance if it's available.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#get
     * @param  {String} name Service name.
     * @return {Object}      Service instance.
     */
    self.get = function(name) {
        if (self.isAvailable(name)) {
            return instances[name];
        }
    };

    /**
     * Gets the relative path of an addon directory.
     * It should be {FILEPOOLPATH}/{remoteAddonsFolderName}/{addonname}.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#getRemoteAddonDirectoryPath
     * @param  {Object} addon    Remote addon.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {String}          Directory path.
     */
    self.getRemoteAddonDirectoryPath = function(addon, siteId) {
        siteId = siteId || $mmSite.getId();

        var subPath = remoteAddonsFolderName + '/' + self.getRemoteAddonName(addon);
        return $mmFilepool._getFilePath(siteId, subPath);
    };

    /**
     * Get the name of a remote addon.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#getRemoteAddonName
     * @param  {Object} addon Remote addon.
     * @return {String}       Name.
     */
    self.getRemoteAddonName = function(addon) {
        return addon.component + '_' + addon.addon;
    };

    /**
     * Check if there are remote addons loaded.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#hasRemoteAddonsLoaded
     * @return {Boolean} True if remote addons loaded, false otherwise.
     */
    self.hasRemoteAddonsLoaded = function() {
        return loadedAddons.length;
    };

    /**
     * Check if a service is available.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#isAvailable
     * @param  {String} name Service name.
     * @return {Boolean}     True if available, false otherwise.
     */
    self.isAvailable = function(name) {
        if (!name) {
            return false;
        }

        if (instances[name]) {
            return true;
        }

        try {
            instances[name] = $injector.get(name);
            return true;
        } catch(ex) {
            $log.warn('Service not available: '+name);
            return false;
        }
    };

    /**
     * Load a remote addon.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#loadRemoteAddon
     * @param  {Object} addon Addon to load.
     * @return {Promise}      Promise resolved when loaded.
     */
    self.loadRemoteAddon = function(addon) {
        var dirPath = self.getRemoteAddonDirectoryPath(addon),
            absoluteDirPath;

        // Get the absolute path to the directory.
        return $mmFS.getDir(dirPath).then(function(dir) {
            absoluteDirPath = $mmFS.getInternalURL(dir);

            // Register language folder so the language strings of the addon are loaded.
            $mmLang.registerLanguageFolder($mmFS.concatenatePaths(absoluteDirPath, 'lang'));
            // Load the addon.
            return $ocLazyLoad.load($mmFS.concatenatePaths(absoluteDirPath, remoteAddonFilename)).then(function() {
                loadedAddons.push(addon);
                // Check if the addon has a CSS file.
                return $mmFS.getFile($mmFS.concatenatePaths(dirPath, remoteAddonCssFilename)).then(function(file) {
                    // The file exists, add it in the head.
                    headEl.append('<link class="remoteaddonstyles" rel="stylesheet" href="' + $mmFS.getInternalURL(file) + '">');
                }).catch(function() {});
            });
        }, function() {
            // Directory not found, set status as not downloaded.
            return self.setRemoteAddonStatus(addon, mmCoreNotDownloaded).then(function() {
                return $q.reject();
            });
        });
    };

    /**
     * Load a list of remote addons.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#loadRemoteAddons
     * @param  {Object[]} addons Addons to load.
     * @return {Promise}         Promise resolved when all have been loaded.
     */
    self.loadRemoteAddons = function(addons) {
        var promises = [];
        angular.forEach(addons, function(addon) {
            promises.push(self.loadRemoteAddon(addon));
        });
        return $mmUtil.allPromises(promises);
    };

    /**
     * Set status of a remote addon.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmAddonManager#setRemoteAddonStatus
     * @param  {Object} addon    Addon.
     * @param  {String} status   Status to set.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when set.
     */
    self.setRemoteAddonStatus = function(addon, status, siteId) {
        siteId = siteId || $mmSite.getId();

        var name = self.getRemoteAddonName(addon),
            revision = addon.filehash;
        return $mmFilepool.storePackageStatus(siteId, mmAddonManagerComponent, name, status, revision, 0);
    };

    return self;
})

.run(function($mmAddonManager, $mmEvents, mmCoreEventLogin, mmCoreEventLogout, mmCoreEventRemoteAddonsLoaded, $mmSite, $window) {
    // Download and load remote addons on login.
    $mmEvents.on(mmCoreEventLogin, function() {
        var siteId = $mmSite.getId();
        $mmAddonManager.downloadRemoteAddons(siteId).then(function(addons) {
            return $mmAddonManager.loadRemoteAddons(addons).finally(function() {
                if ($mmSite.getId() == siteId && $mmAddonManager.hasRemoteAddonsLoaded()) {
                    $mmEvents.trigger(mmCoreEventRemoteAddonsLoaded);
                }
            });
        });
    });

    // Unload remote addons on logout if any.
    $mmEvents.on(mmCoreEventLogout, function() {
        if ($mmAddonManager.hasRemoteAddonsLoaded()) {
            // Temporary fix. Reload the page to unload all remote addons.
            $window.location.reload();
        }
    });
});
