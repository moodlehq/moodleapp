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

angular.module('mm.addons.mod_url')

/**
 * URL service.
 *
 * @module mm.addons.mod_url
 * @ngdoc service
 * @name $mmaModUrl
 */
.factory('$mmaModUrl', function($mmSite, $mmUtil, $q, $mmContentLinksHelper, $mmCourse, $mmSitesManager) {
    var self = {};

    /**
     * Report a URL as being viewed.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                urlid: id
            };
            return $mmSite.write('mod_url_view_url', params);
        }
        return $q.reject();
    };

    /**
     * Returns whether or not getUrl WS available or not.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#isGetUrlWSAvailable
     * @return {Boolean}
     */
    self.isGetUrlWSAvailable = function() {
        return $mmSite.wsAvailable('mod_url_get_urls_by_courses');
    };

    /**
     * Get a url.
     *
     * @param  {String} siteId    Site ID.
     * @param  {Number} courseId  Course ID.
     * @param  {String} key       Name of the property to check.
     * @param  {Mixed}  value     Value to search.
     * @return {Promise}          Promise resolved when the url is retrieved.
     */
    function getUrl(siteId, courseId, key, value) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getUrlCacheKey(courseId)
                };

            return site.read('mod_url_get_urls_by_courses', params, preSets).then(function(response) {
                if (response && response.urls) {
                    var currentUrl;
                    angular.forEach(response.urls, function(url) {
                        if (!currentUrl && url[key] == value) {
                            currentUrl = url;
                        }
                    });
                    if (currentUrl) {
                        return currentUrl;
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a url by course module ID.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#getUrl
     * @param {Number} courseId Course ID.
     * @param {Number} cmId     Course module ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the url is retrieved.
     */
    self.getUrl = function(courseId, cmId, siteId) {
        return getUrl(siteId, courseId, 'coursemodule', cmId);
    };

    /**
     * Get cache key for url data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getUrlCacheKey(courseId) {
        return 'mmaModUrl:url:' + courseId;
    }

    /**
     * Invalidates url data.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#invalidateUrlData
     * @param {Number} courseId Course ID.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateUrlData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getUrlCacheKey(courseId));
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#invalidateContent
     * @param  {Number} moduleId The module ID.
     * @param  {Number} courseId Course ID of the module.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        var promises = [];

        promises.push(self.invalidateUrlData(courseId, siteId));
        promises.push($mmCourse.invalidateModule(moduleId, siteId));

        return $mmUtil.allPromises(promises);
    };

    /**
     * Opens a URL.
     *
     * @module mm.addons.mod_url
     * @ngdoc method
     * @name $mmaModUrl#open
     * @param {String} url The URL to go to.
     */
    self.open = function(url) {
        var modal = $mmUtil.showModalLoading();
        $mmContentLinksHelper.handleLink(url).then(function(treated) {
            if (!treated) {
                return $mmSite.openInBrowserWithAutoLoginIfSameSite(url);
            }
        }).finally(function() {
            modal.dismiss();
        });
    };

    return self;
});
