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

angular.module('mm.addons.mod_recommended')

/**
 * recommended factory.
 *
 * @module mm.addons.mod_recommended
 * @ngdoc service
 * @name $mmaModrecommended
 */
.factory('$mmaModrecommended', function($mmFilepool, $mmSite, $mmFS, $http, $log, $q, $mmSitesManager, $mmUtil, mmaModrecommendedComponent) {
    $log = $log.getInstance('$mmaModrecommended');

    var self = {};

    /**
     * Gets the recommended HTML.
     *
     * @module mm.addons.mod_recommended
     * @ngdoc method
     * @name $mmaModrecommended#getrecommendedHtml
     * @param {Object} contents The module contents.
     * @param {Number} moduleId The module ID.
     * @return {Promise}
     */
    self.getrecommendedHtml = function(contents, moduleId) {
        var indexUrl,
            paths = {},
            promise;

        // Extract the information about paths from the module contents.
        angular.forEach(contents, function(content) {
            var key,
                url = content.fileurl;

            if (self._isMainrecommended(content)) {
                // This seems to be the most reliable way to spot the index recommended.
                indexUrl = url;
            } else {
                key = content.filename;
                if (content.filepath !== '/') {
                    // Add the folders without the leading slash.
                    key = content.filepath.substr(1) + key;
                }
                paths[decodeURIComponent(key)] = url;
            }
        });

        // Promise handling when we are in a browser.
        promise = (function() {
            if (!indexUrl) {
                // If ever that happens.
                $log.debug('Could not locate the index recommended');
                return $q.reject();
            } else if ($mmFS.isAvailable()) {
                // The file system is available.
                return $mmFilepool.downloadUrl($mmSite.getId(), indexUrl, false, mmaModrecommendedComponent, moduleId);
            } else {
                // We return the live URL.
                return $q.when($mmSite.fixPluginfileURL(indexUrl));
            }
        })();

        return promise.then(function(url) {
            // Fetch the URL content.
            return $http.get(url).then(function(response) {
                if (typeof response.data !== 'string') {
                    return $q.reject();
                } else {
                    // Now that we have the content, we update the SRC to point back to
                    // the external resource. That will b caught by mm-format-text.
                    return $mmUtil.restoreSourcesInHtml(response.data, paths);
                }
            });
        });
    };

    /**
     * Returns whether the file is the main recommended of the module.
     *
     * @module mm.addons.mod_recommended
     * @ngdoc method
     * @name $mmaModrecommended#_isMainrecommended
     * @param {Object} file An object returned from WS containing file info.
     * @return {Boolean}
     * @protected
     */
    self._isMainrecommended = function(file) {
        var filename = file.filename || undefined,
            fileurl = file.fileurl || '',
            url = '/mod_recommended/content/index.html',
            encodedUrl = encodeURIComponent(url);

        return (filename === 'index.html' && (fileurl.indexOf(url) > 0 || fileurl.indexOf(encodedUrl) > 0 ));
    };

    /**
     * Check if recommended plugin is enabled in a certain site.
     *
     * @module mm.addons.mod_recommended
     * @ngdoc method
     * @name $mmaModrecommended#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.canDownloadFiles();
        });
    };

    /**
     * Report a recommended as being viewed.
     *
     * @module mm.addons.mod_recommended
     * @ngdoc method
     * @name $mmaModrecommended#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                recommendedid: id
            };
            return $mmSite.write('mod_recommended_view_recommended', params);
        }
        return $q.reject();
    };

    return self;
});
