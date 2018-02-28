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

angular.module('mm.addons.mod_lti')

/**
 * LTI service.
 *
 * @module mm.addons.mod_lti
 * @ngdoc service
 * @name $mmaModLti
 */
.factory('$mmaModLti', function($q, $mmSite, $mmFS, $mmText, $mmUtil, $mmLang, $mmSitesManager) {
    var self = {},
        launcherFileName = 'lti_launcher.html';

    /**
     * Delete launcher.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#deleteLauncher
     * @return {Promise} Promise resolved when the launcher file is deleted.
     */
    self.deleteLauncher = function() {
        return $mmFS.removeFile(launcherFileName);
    };

    /**
     * Generates a launcher file.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#generateLauncher
     * @param {String} url      Launch URL.
     * @param {Object[]} params Launch params.
     * @return {Promise}        Promise resolved with the file URL.
     */
    self.generateLauncher = function(url, params) {

        if (!$mmFS.isAvailable()) {
            return $q.when(url);
        }

        // Generate a form with the params.
        var text = '<form action="' + url + '" name="ltiLaunchForm" ' +
                    'method="post" encType="application/x-www-form-urlencoded">\n';
        angular.forEach(params, function(p) {
            if (p.name == 'ext_submit') {
                text += '    <input type="submit"';
            } else {
                text += '    <input type="hidden" name="' + $mmText.escapeHTML(p.name) + '"';
            }
            text += ' value="' + $mmText.escapeHTML(p.value) + '"/>\n';
        });
        text += '</form>\n';

        // Add an in-line script to automatically submit the form.
        text += '<script type="text/javascript"> \n' +
            '    document.ltiLaunchForm.submit(); \n' +
            '</script> \n';

        return $mmFS.writeFile(launcherFileName, text).then(function(entry) {
            return entry.toURL();
        });
    };

    /**
     * Get a LTI.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#getLti
     * @param {Number} courseid Course ID.
     * @param {Number} cmid     Course module ID.
     * @return {Promise}        Promise resolved when the LTI is retrieved.
     */
    self.getLti = function(courseid, cmid) {
        var params = {
                courseids: [courseid]
            },
            preSets = {
                cacheKey: getLtiCacheKey(courseid)
            };

        return $mmSite.read('mod_lti_get_ltis_by_courses', params, preSets).then(function(response) {
            if (response.ltis) {
                var currentLti;
                angular.forEach(response.ltis, function(lti) {
                    if (lti.coursemodule == cmid) {
                        currentLti = lti;
                    }
                });
                if (currentLti) {
                    return currentLti;
                }
            }
            return $q.reject();
        });
    };

    /**
     * Get cache key for LTI data WS calls.
     *
     * @param {Number} courseid Course ID.
     * @return {String}         Cache key.
     */
    function getLtiCacheKey(courseid) {
        return 'mmaModLti:lti:' + courseid;
    }

    /**
     * Get a LTI launch data.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#getLtiLaunchData
     * @param {Number} id LTI ID.
     * @return {Promise}  Promise resolved when the launch data is retrieved.
     */
    self.getLtiLaunchData = function(id) {
        var params = {
                toolid: id
            },
            // Try to avoid using cache since the "nonce" parameter is set to a timestamp.
            preSets = {
                getFromCache: 0,
                saveToCache: 1,
                emergencyCache: 1,
                cacheKey: getLtiLaunchDataCacheKey(id)
            };

        return $mmSite.read('mod_lti_get_tool_launch_data', params, preSets).then(function(response) {
            if (response.endpoint) {
                return response;
            }
            return $q.reject();
        });
    };

    /**
     * Get cache key for LTI launch data WS calls.
     *
     * @param {Number} id LTI ID.
     * @return {String}   Cache key.
     */
    function getLtiLaunchDataCacheKey(id) {
        return 'mmaModLti:launch:' + id;
    }

    /**
     * Invalidates LTI data.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#invalidateLti
     * @param {Number} courseid Course ID.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateLti = function(courseid) {
        return $mmSite.invalidateWsCacheForKey(getLtiCacheKey(courseid));
    };

    /**
     * Invalidates options.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#invalidateLtiLaunchData
     * @param {Number} id LTI ID.
     * @return {Promise}  Promise resolved when the data is invalidated.
     */
    self.invalidateLtiLaunchData = function(id) {
        return $mmSite.invalidateWsCacheForKey(getLtiLaunchDataCacheKey(id));
    };

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the lti WS are available.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_lti_get_ltis_by_courses') &&
                    site.wsAvailable('mod_lti_get_tool_launch_data');
        });
    };

    /**
     * Launch LTI.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#launch
     * @param {String} url      Launch URL.
     * @param {Object[]} params Launch params.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.launch = function(url, params) {
        if (!$mmUtil.isValidURL(url)) {
            return $mmLang.translateAndReject('mma.mod_lti.errorinvalidlaunchurl');
        }

        // Generate launcher and open it.
        return self.generateLauncher(url, params).then(function(url) {
            $mmUtil.openInApp(url);
        });
    };

    /**
     * Report the LTI as being viewed.
     *
     * @module mm.addons.mod_lti
     * @ngdoc method
     * @name $mmaModLti#logView
     * @param {String} id LTI ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                ltiid: id
            };
            return $mmSite.write('mod_lti_view_lti', params);
        }
        return $q.reject();
    };

    return self;
});
