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

angular.module('mm.addons.remotestyles')

/**
 * Service to handle remote styles.
 *
 * @module mm.addons.remotestyles
 * @ngdoc service
 * @name $mmaRemoteStyles
 */
.factory('$mmaRemoteStyles', function($log, $q, $mmSite, $mmSitesManager, $mmFilepool, $http, $mmFS, mmaRemoteStylesComponent,
            mmCoreNotDownloaded, $mmUtil, md5, $mmText) {

    $log = $log.getInstance('$mmaRemoteStyles');

    var self = {},
        remoteStylesEls = {};

    /**
     * Add a style element for a site and load the styles for that element. The style will be disabled.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#addSite
     * @param  {String} siteId Site ID.
     * @return {Promise}       Promise resolved when added and loaded.
     */
    self.addSite = function(siteId) {
        if (!siteId || remoteStylesEls[siteId]) {
            return $q.when();
        }

        var el = angular.element('<style id="mobilecssurl-' + siteId + '" disabled="disabled"></style>');
        angular.element(document.head).append(el);
        remoteStylesEls[siteId] = {
            element: el,
            hash: ''
        };

        return self.load(siteId, true);
    };

    /**
     * Clear remote styles added to the DOM.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#clear
     */
    self.clear = function() {
        // Disable all the styles.
        angular.element(document.querySelectorAll('style[id*=mobilecssurl]')).attr('disabled', true);
    };

    /**
     * Downloads a CSS file and remove old files if needed.
     *
     * @param  {String} siteId Site ID.
     * @param  {String} url    File URL.
     * @return {Promise}       Promise resolved when the file is downloaded.
     */
    function downloadFileAndRemoveOld(siteId, url) {
        return $mmFilepool.getFileStateByUrl(siteId, url).then(function(state) {
            return state !== mmCoreNotDownloaded;
        }).catch(function() {
            return true; // An error occurred while getting state (shouldn't happen). Don't delete downloaded file.
        }).then(function(isDownloaded) {
            if (!isDownloaded) {
                // File not downloaded, URL has changed or first time. Delete downloaded CSS files.
                return $mmFilepool.removeFilesByComponent(siteId, mmaRemoteStylesComponent, 1);
            }
        }).then(function() {
            return $mmFilepool.downloadUrl(siteId, url, false, mmaRemoteStylesComponent, 1);
        });
    }

    /**
     * Enable the styles of a certain site.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#addSite
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Void}
     */
    self.enable = function(siteId) {
        siteId = siteId || $mmSite.getId();

        if (remoteStylesEls[siteId]) {
            remoteStylesEls[siteId].element.attr('disabled', false);
        }
    };

    /**
     * Get remote styles of a certain site.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#get
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with the styles and the URL of the loaded CSS file (local if downloaded).
     */
    self.get = function(siteId) {
        var fileUrl;

        siteId = siteId || $mmSite.getId();
        if (!siteId) {
            return $q.reject();
        }

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var infos = site.getInfo();
            if (infos && infos.mobilecssurl) {
                fileUrl = infos.mobilecssurl;

                if ($mmFS.isAvailable()) {
                    // The file system is available. Download the file and remove old CSS files if needed.
                    return downloadFileAndRemoveOld(siteId, infos.mobilecssurl);
                } else {
                    // We return the online URL. We're probably on browser.
                    return infos.mobilecssurl;
                }
            } else {
                if (infos.mobilecssurl === '') {
                    // CSS URL is empty. Delete downloaded files (if any).
                    $mmFilepool.removeFilesByComponent(siteId, mmaRemoteStylesComponent, 1);
                }
                return $q.reject();
            }
        }).then(function(url) {
            $log.debug('Loading styles from: '+url);
            return $http.get(url);
        }).then(function(response) {
            if (typeof response.data == 'string') {
                return {file: fileUrl, styles: response.data};
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Load styles for a certain site.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#load
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @param  {Boolean} disabled True if loaded styles should be disabled, false if they should be enabled.
     * @return {Promise}          Promise resolved when styles are loaded.
     */
    self.load = function(siteId, disabled) {
        siteId = siteId || $mmSite.getId();
        disabled = !!disabled;

        $log.debug('Load site: ', siteId, disabled);
        if (siteId && remoteStylesEls[siteId]) {
            // Enable or disable the styles.
            remoteStylesEls[siteId].element.attr('disabled', disabled);

            return self.get(siteId).then(function(data) {
                var hash = md5.createHash(data.styles);

                // Update the styles only if they have changed.
                if (remoteStylesEls[siteId].hash !== hash) {
                    remoteStylesEls[siteId].element.html(data.styles);
                    remoteStylesEls[siteId].hash = hash;

                    // New styles will be applied even if the style is disabled. We'll disable it again if needed.
                    if (disabled && remoteStylesEls[siteId].element.attr('disabled') == 'disabled') {
                        remoteStylesEls[siteId].element.attr('disabled', true);
                    }
                }

                // Styles have been loaded, now treat the CSS.
                treatCSSCode(siteId, data.file, data.styles);
            });
        }

        return $q.reject();
    };

    /**
     * Preload the styles of the current site (stored in DB). Please do not use.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#_preloadCurrentSite
     * @return {Promise} Promise resolved when loaded.
     * @protected
     */
    self._preloadCurrentSite = function() {
        return $mmSitesManager.getStoredCurrentSiteId().then(function(siteId) {
            return self.addSite(siteId);
        });
    };

    /**
     * Preload the styles of all the stored sites. Please do not use.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#_preloadSites
     * @return {Promise} Promise resolved when loaded.
     * @protected
     */
    self._preloadSites = function() {
        return $mmSitesManager.getSitesIds().then(function(ids) {
            var promises = [];
            angular.forEach(ids, function(siteId) {
                promises.push(self.addSite(siteId));
            });
            return $q.all(promises);
        });
    };

    /**
     * Remove the styles of a certain site.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#removeSite
     * @param  {String} siteId Site ID.
     * @return {Void}
     */
    self.removeSite = function(siteId) {
        if (siteId && remoteStylesEls[siteId]) {
            remoteStylesEls[siteId].element.remove();
            delete remoteStylesEls[siteId];
        }
    };

    /**
     * Search for files in a CSS code and try to download them. Once downloaded, replace their URLs
     * and store the result in the CSS file.
     *
     * @param  {String} siteId  Site ID.
     * @param  {String} fileUrl CSS file URL.
     * @param  {String} cssCode CSS code.
     * @return {Promise}        Promise resolved with the CSS code.
     */
    function treatCSSCode(siteId, fileUrl, cssCode) {
        if (!$mmFS.isAvailable()) {
            return $q.reject();
        }

        var urls = $mmUtil.extractUrlsFromCSS(cssCode),
            promises = [],
            filePath,
            updated = false;

        // Get the path of the CSS file.
        promises.push($mmFilepool.getFilePathByUrl(siteId, fileUrl).then(function(path) {
            filePath = path;
        }));

        angular.forEach(urls, function(url) {
            // Download the file only if it's an online URL.
            if (url.indexOf('http') == 0) {
                promises.push($mmFilepool.downloadUrl(siteId, url, false, mmaRemoteStylesComponent, 2).then(function(fileUrl) {
                    if (fileUrl != url) {
                        cssCode = cssCode.replace(new RegExp($mmText.escapeForRegex(url), 'g'), fileUrl);
                        updated = true;
                    }
                }).catch(function(error) {
                    // It shouldn't happen. Ignore errors.
                    $log.warn('MMRMSTYLES Error treating file ', url, error);
                }));
            }
        });

        return $q.all(promises).then(function() {
            // All files downloaded. Store the result if it has changed.
            if (updated) {
                return $mmFS.writeFile(filePath, cssCode);
            }
        }).then(function() {
            return cssCode;
        });
    }

    return self;
});
