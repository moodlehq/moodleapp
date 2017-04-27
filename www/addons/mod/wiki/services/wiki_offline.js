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

.constant('mmaModWikiNewPagesStore', 'mma_mod_wiki_new_pages_store')

.config(function($mmSitesFactoryProvider, mmaModWikiNewPagesStore) {
    var stores = [
        {
            name: mmaModWikiNewPagesStore,
            keyPath: ['subwikiid', 'wikiid', 'userid', 'groupid', 'title'],
            indexes: [
                {
                    name: 'subwikiid'
                },
                {
                    name: 'wikiid'
                },
                {
                    name: 'userid'
                },
                {
                    name: 'groupid'
                },
                {
                    name: 'title'
                },
                {
                    name: 'subwikiWikiUserGroup',
                    keyPath: ['subwikiid', 'wikiid', 'userid', 'groupid']
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
     * @param  {String} title     Title of the page.
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved if deleted, rejected if failure.
     */
    self.deleteNewPage = function(title, subwikiId, wikiId, userId, groupId,  siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            subwikiId = (subwikiId = parseInt(subwikiId, 10)) > 0 ? subwikiId : 0;
            wikiId = (wikiId = parseInt(wikiId, 10)) > 0 ? wikiId : 0;
            userId = (userId = parseInt(userId, 10)) > 0 ? userId : 0;
            groupId = (groupId = parseInt(groupId, 10)) > 0 ? groupId : 0;
            return site.getDb().remove(mmaModWikiNewPagesStore, [subwikiId, wikiId, userId, groupId, title]);
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
     * @param  {String} title     Title of the page.
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with page.
     */
    self.getNewPage = function(title, subwikiId, wikiId, userId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            subwikiId = (subwikiId = parseInt(subwikiId, 10)) > 0 ? subwikiId : 0;
            wikiId = (wikiId = parseInt(wikiId, 10)) > 0 ? wikiId : 0;
            userId = (userId = parseInt(userId, 10)) > 0 ? userId : 0;
            groupId = (groupId = parseInt(groupId, 10)) > 0 ? groupId : 0;
            return site.getDb().get(mmaModWikiNewPagesStore, [subwikiId, wikiId, userId, groupId, title]);
        });
    };

    /**
     * Get all the stored new pages from a certain subwiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#getSubwikiNewPages
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param  {String} [siteId]  Site ID. If not defined, current site.
     * @return {Promise}          Promise resolved with pages.
     */
    self.getSubwikiNewPages = function(subwikiId, wikiId, userId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            subwikiId = (subwikiId = parseInt(subwikiId, 10)) > 0 ? subwikiId : 0;
            wikiId = (wikiId = parseInt(wikiId, 10)) > 0 ? wikiId : 0;
            userId = (userId = parseInt(userId, 10)) > 0 ? userId : 0;
            groupId = (groupId = parseInt(groupId, 10)) > 0 ? groupId : 0;
            return site.getDb().whereEqual(mmaModWikiNewPagesStore, 'subwikiWikiUserGroup', [subwikiId, wikiId, userId, groupId]);
        });
    };

    /**
     * Get all the stored new pages from a list of subwikis.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#getSubwikisNewPages
     * @param  {Object[]} subwikis List of subwiki.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with pages.
     */
    self.getSubwikisNewPages = function(subwikis, siteId) {
        siteId = siteId || $mmSite.getId();

        var promises = [],
            pages = [];

        angular.forEach(subwikis, function(subwiki) {
            promises.push(self.getSubwikiNewPages(subwiki.id, subwiki.wikiid, subwiki.userid, subwiki.groupid, siteId)
                    .then(function(subwikiPages) {
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
     * @param  {String} title       Title of the page.
     * @param  {String} content     Content of the page.
     * @param  {Number} [subwikiId] Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
     * @param  {Number} [wikiId]    Wiki ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [userId]    User ID. Optional, will be used create subwiki if not informed.
     * @param  {Number} [groupId]   Group ID. Optional, will be used create subwiki if not informed.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved if stored, rejected if failure.
     */
    self.saveNewPage = function(title, content, subwikiId, wikiId, userId, groupId, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var now = new Date().getTime(),
                entry = {
                    title: title,
                    cachedcontent: content,
                    subwikiid: (subwikiId = parseInt(subwikiId, 10)) > 0 ? subwikiId : 0,
                    wikiid: (wikiId = parseInt(wikiId, 10)) > 0 ? wikiId : 0,
                    userid: (userId = parseInt(userId, 10)) > 0 ? userId : 0,
                    groupid: (groupId = parseInt(groupId, 10)) > 0 ? groupId : 0,
                    contentformat: 'html',
                    timecreated: now,
                    timemodified: now,
                    caneditpage: true
                };

            return site.getDb().insert(mmaModWikiNewPagesStore, entry);
        });
    };

    /**
     * Check if a list of subwikis have offline data stored.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWikiOffline#subwikisHaveOfflineData
     * @param  {Object[]} subwikis List of subwikis.
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
