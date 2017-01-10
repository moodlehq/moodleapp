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

angular.module('mm.addons.mod_wiki')

.constant('mmaModWikiNewPagesStore', 'mma_mod_wiki_new_pages')

.config(function($mmSitesFactoryProvider, mmaModWikiNewPagesStore) {
    var stores = [
        {
            name: mmaModWikiNewPagesStore,
            keyPath: ['subwikiid', 'title'],
            indexes: [
                {
                    name: 'subwikiid'
                },
                {
                    name: 'title'
                }
            ]
        }
    ];
    $mmSitesFactoryProvider.registerStores(stores);
})

/**
 * Offline wiki factory.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc service
 * @name $mmaModWikiOffline
 */
.factory('$mmaModWikiOffline', function($mmSitesManager, $log, $mmSite, $q, mmaModWikiNewPagesStore) {
    $log = $log.getInstance('$mmaModWikiOffline');

    var self = {};

    /**
     * Delete a new page.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#deleteNewPage
     * @param  {Number} subwikiId Subwiki ID.
     * @param  {String} title     Title of the page.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved if deleted, rejected if failure.
     */
    self.deleteNewPage = function(subwikiId, title, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().remove(mmaModWikiNewPagesStore, [subwikiId, title]);
        });
    };

    /**
     * Get all the stored new pages from all the wikis.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#getAllNewPages
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with pages.
     */
    self.getAllNewPages = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().getAll(mmaModWikiNewPagesStore);
        });
    };

    /**
     * Get a stored new page.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#getNewPage
     * @param  {Number} subwikiId Subwiki ID.
     * @param  {String} title     Title of the page.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with page.
     */
    self.getNewPage = function(subwikiId, title, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().get(mmaModWikiNewPagesStore, [subwikiId, title]);
        });
    };

    /**
     * Get all the stored new pages from a certain subwiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#getSubwikiNewPages
     * @param  {Number} subwikiId Subwiki ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with pages.
     */
    self.getSubwikiNewPages = function(subwikiId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.getDb().whereEqual(mmaModWikiNewPagesStore, 'subwikiid', subwikiId);
        });
    };

    /**
     * Get all the stored new pages from a list of subwikis.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#getSubwikisNewPages
     * @param  {Number[]} subwikis List of subwiki IDs.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with pages.
     */
    self.getSubwikisNewPages = function(subwikis, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [],
            pages = [];

        angular.forEach(subwikis, function(subwikiId) {
            promises.push(self.getSubwikiNewPages(subwikiId, siteId).then(function(subwikiPages) {
                pages = pages.concat(subwikiPages);
            }));
        });

        return $q.all(promises).then(function() {
            return pages;
        });
    };

    /**
     * Save a new page to be sent later.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#saveNewPage
     * @param  {Number} subwikiId Subwiki ID.
     * @param  {String} title     Title of the page.
     * @param  {String} content   Content of the page.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved if stored, rejected if failure.
     */
    self.saveNewPage = function(subwikiId, title, content, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var now = new Date().getTime(),
                entry = {
                    subwikiid: subwikiId,
                    title: title,
                    cachedcontent: content,
                    contentformat: 'html',
                    timecreated: now,
                    timemodified: now,
                    caneditpage: true
                };

            return site.getDb().insert(mmaModWikiNewPagesStore, entry);
        });
    };

    /**
     * Check if a subwiki has offline data stored.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#subwikiHasOfflineData
     * @param  {Number} subwikiId Subwiki ID.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with boolean: true if has offline data, false otherwise.
     */
    self.subwikiHasOfflineData = function(subwikiId, siteId) {
        return self.getSubwikiNewPages(subwikiId, siteId).then(function(pages) {
            return !!pages.length;
        });
    };

    /**
     * Check if a list of subwikis have offline data stored.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#subwikisHaveOfflineData
     * @param  {Number[]} subwikis List of subwiki IDs.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with boolean: true if has offline data, false otherwise.
     */
    self.subwikisHaveOfflineData = function(subwikis, siteId) {
        return self.getSubwikisNewPages(subwikis, siteId).then(function(pages) {
            return !!pages.length;
        }).catch(function() {
            // Error, return false.
            return false;
        });
    };

    return self;
});
