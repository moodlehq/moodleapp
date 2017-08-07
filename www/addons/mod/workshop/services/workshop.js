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

angular.module('mm.addons.mod_workshop')

/**
 * Workshop service.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc controller
 * @name $mmaModWorkshop
 */
.factory('$mmaModWorkshop', function($q, $mmSitesManager, mmaModWorkshopComponent, $mmFilepool, $mmSite) {
    var self = {
        PHASE_SETUP: 10,
        PHASE_SUBMISSION: 20,
        PHASE_ASSESSMENT: 30,
        PHASE_EVALUATION: 40,
        PHASE_CLOSED: 50
    };

    /**
     * Get cache key for workshop data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getWorkshopDataCacheKey(courseId) {
        return 'mmaModWorkshop:workshop:' + courseId;
    }

    /**
     * Get prefix cache key for all workshop activity data WS calls.
     *
     * @param {Number} workshopId   Workshop ID.
     * @return {String}         Cache key.
     */
    function getWorkshopDataPrefixCacheKey(workshopId) {
        return 'mmaModWorkshop:' + workshopId;
    }

    /**
     * Get cache key for workshop access information data WS calls.
     *
     * @param {Number} workshopId   Workshop ID.
     * @return {String}         Cache key.
     */
    function getWorkshopAccessInformationDataCacheKey(workshopId) {
        return getWorkshopDataPrefixCacheKey(workshopId) + ':access';
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the workshop WS are available.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_workshop_get_workshops_by_courses') &&
                site.wsAvailable('mod_workshop_get_workshop_access_information');
        });
    };

    /**
     * Get a workshop with key=value. If more than one is found, only the first will be returned.
     *
     * @param  {Number}     courseId        Course ID.
     * @param  {String}     key             Name of the property to check.
     * @param  {Mixed}      value           Value to search.
     * @param  {String}     [siteId]        Site ID. If not defined, current site.
     * @param  {Boolean}    [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return {Promise}                    Promise resolved when the workshop is retrieved.
     */
    function getWorkshop(courseId, key, value, siteId, forceCache) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getWorkshopDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_workshop_get_workshops_by_courses', params, preSets).then(function(response) {
                if (response && response.workshops) {
                    for (var x in response.workshops) {
                        if (response.workshops[x][key] == value) {
                            return response.workshops[x];
                        }
                    }
                }
                return $q.reject();
            });
        });
    }

    /**
     * Get a workshop by course module ID.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getWorkshop
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    cmId            Course module ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the workshop is retrieved.
     */
    self.getWorkshop = function(courseId, cmId, siteId, forceCache) {
        return getWorkshop(courseId, 'coursemodule', cmId, siteId, forceCache);
    };

    /**
     * Get a workshop by ID.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getWorkshopById
     * @param   {Number}    courseId        Course ID.
     * @param   {Number}    id              Workshop ID.
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @param   {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @return  {Promise}                   Promise resolved when the workshop is retrieved.
     */
    self.getWorkshopById = function(courseId, id, siteId, forceCache) {
        return getWorkshop(courseId, 'id', id, siteId, forceCache);
    };

    /**
     * Invalidates workshop data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateWorkshopData
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the workshop is invalidated.
     */
    self.invalidateWorkshopData = function(courseId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWorkshopDataCacheKey(courseId));
        });
    };

    /**
     * Invalidates workshop data except files and module info.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateWorkshopWSData
     * @param  {Number} workshopId   Workshop ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the workshop is invalidated.
     */
    self.invalidateWorkshopWSData = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getWorkshopDataPrefixCacheKey(workshopId));

        });
    };

    /**
     * Get  access information for a given workshop.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#getWorkshopAccessInformation
     * @param   {Number}    workshopId      Workshop ID.
     * @param   {Boolean}   offline         True if it should return cached data. Has priority over ignoreCache.
     * @param   {Boolean}   ignoreCache     True if it should ignore cached data (it will always fail in offline or server down).
     * @param   {String}    [siteId]        Site ID. If not defined, current site.
     * @return  {Promise}                   Promise resolved when the workshop is retrieved.
     */
    self.getWorkshopAccessInformation = function(workshopId, offline, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    workshopid: workshopId
                },
                preSets = {
                    cacheKey: getWorkshopAccessInformationDataCacheKey(workshopId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return site.read('mod_workshop_get_workshop_access_information', params, preSets);
        });
    };

    /**
     * Invalidates workshop access information data.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateWorkshopAccessInformationData
     * @param {Number} workshopId   Workshop ID.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateWorkshopAccessInformationData = function(workshopId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWorkshopAccessInformationDataCacheKey(workshopId));
        });
    };

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use $mmaModWorkshop#invalidateFiles.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateContent
     * @param {Number} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return self.getWorkshop(courseId, moduleId, siteId, true).then(function(workshop) {
            var ps = [];
            // Do not invalidate workshop data before getting workshop info, we need it!
            ps.push(self.invalidateWorkshopData(courseId, siteId));
            ps.push(self.invalidateWorkshopWSData(workshop.id, siteId));

            return $q.all(ps);
        });
    };

    /**
     * Invalidate the prefetched files.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#invalidateFiles
     * @param {Number} moduleId  The module ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when the files are invalidated.
     */
    self.invalidateFiles = function(moduleId, siteId) {
        return $mmFilepool.invalidateFilesByComponent(siteId, mmaModWorkshopComponent, moduleId);
    };

    /**
     * Report the workshop as being viewed.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshop#logView
     * @param {String}  id       Workshop ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                workshopid: id
            };
            return site.write('mod_workshop_view_workshop', params);
        });
    };

    return self;
});
