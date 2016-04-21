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
            mmCoreNotDownloaded, $mmUtil) {

    $log = $log.getInstance('$mmaRemoteStyles');

    var self = {},
        remoteStylesEl = angular.element(document.querySelector('#mobilecssurl'));

    /**
     * Clear remote styles added to the DOM.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#clear
     */
    self.clear = function() {
        remoteStylesEl.html('');
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
     * Load styles for current site.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#load
     */
    self.load = function() {
        var siteId = $mmSite.getId();
        if (siteId) {
            self.get(siteId).then(function(data) {
                if (siteId === $mmSite.getId()) { // Make sure it hasn't logout while retrieving styles.
                    remoteStylesEl.html(data.styles);
                }
                // Styles have been loaded, now treat the CSS.
                treatCSSCode(siteId, data.file, data.styles);
            });
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
            promises.push($mmFilepool.getUrlByUrl(siteId, url, mmaRemoteStylesComponent, 2).then(function(fileUrl) {
                if (fileUrl != url) {
                    cssCode = cssCode.replace(new RegExp(url, 'g'), fileUrl);
                    updated = true;
                }
            }).catch(function(error) {
                // It shouldn't happen. Ignore errors.
                $log.warn('Error treating file ', url, error);
            }));
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
