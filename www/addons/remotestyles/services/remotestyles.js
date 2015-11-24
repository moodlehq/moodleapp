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
            mmCoreNotDownloaded) {

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
     * Get remote styles of a certain site.
     *
     * @module mm.addons.remotestyles
     * @ngdoc method
     * @name $mmaRemoteStyles#get
     * @param {String} siteid Site ID.
     * @return {Promise}      Promise resolved with the styles.
     */
    self.get = function(siteid) {
        var promise;

        siteid = siteid || $mmSite.getId();
        if (!siteid) {
            return $q.reject();
        }

        // Downloads a CSS file and remove old files if needed.
        function downloadFileAndRemoveOld(url) {
            return $mmFilepool.getFileStateByUrl(siteid, url).then(function(state) {
                return state !== mmCoreNotDownloaded;
            }).catch(function() {
                return true; // An error occurred while getting state (shouldn't happen). Don't delete downloaded file.
            }).then(function(isDownloaded) {
                if (!isDownloaded) {
                    // File not downloaded, URL has changed or first time. Delete downloaded CSS files.
                    return $mmFilepool.removeFilesByComponent(siteid, mmaRemoteStylesComponent, 1);
                }
            }).then(function() {
                return $mmFilepool.downloadUrl(siteid, url, false, mmaRemoteStylesComponent, 1);
            });
        }

        return $mmSitesManager.getSite(siteid).then(function(site) {
            var infos = site.getInfo();
            if (infos && infos.mobilecssurl) {
                if ($mmFS.isAvailable()) {
                    // The file system is available. Download the file and remove old CSS files if needed.
                    return downloadFileAndRemoveOld(infos.mobilecssurl);
                } else {
                    // We return the online URL. We're probably on browser.
                    return infos.mobilecssurl;
                }
            } else {
                if (infos.mobilecssurl === '') {
                    // CSS URL is empty. Delete downloaded files (if any).
                    $mmFilepool.removeFilesByComponent(siteid, mmaRemoteStylesComponent, 1)
                }
                return $q.reject();
            }
        }).then(function(url) {
            $log.debug('Loading styles from: '+url);
            return $http.get(url);
        }).then(function(response) {
            if (typeof response.data == 'string') {
                return response.data;
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
        var siteid = $mmSite.getId();
        if (siteid) {
            self.get(siteid).then(function(styles) {
                if (siteid === $mmSite.getId()) { // Make sure it hasn't logout while retrieving styles.
                    remoteStylesEl.html(styles);
                }
            });
        }
    };

    return self;
});
