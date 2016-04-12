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

/**
 * Wiki service.
 *
 * @module mm.addons.mod_wiki
 * @ngdoc service
 * @name $mmaModWiki
 */
.factory('$mmaModWiki', function($q, $mmSite, $mmSitesManager, $mmFilepool, mmaModWikiComponent) {
    var self = {},
        subwikiListsCache = {};

    /**
     * Get cache key for wiki data WS calls.
     *
     * @param {Number} courseId Course ID.
     * @return {String}         Cache key.
     */
    function getWikiDataCacheKey(courseId) {
        return 'mmaModWiki:wiki:' + courseId;
    }

    /**
     * Get cache key for wiki SubWikis WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikisCacheKey(wikiId) {
        return 'mmaModWiki:subwikis:' + wikiId;
    }

    /**
     * Get cache key for wiki Subwiki Pages WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @param {Number} groupId Group ID.
     * @param {Number} userId User ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiPagesCacheKey(wikiId, groupId, userId) {
        return getWikiSubwikiPagesCacheKeyPrefix(wikiId) + ':' + groupId + ':' + userId;
    }

    /**
     * Get cache key for all wiki Subwiki Pages WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiPagesCacheKeyPrefix(wikiId) {
        return 'mmaModWiki:subwikipages:' + wikiId;
    }

    /**
     * Get cache key for wiki Subwiki Files WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @param {Number} groupId Group ID.
     * @param {Number} userId User ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiFilesCacheKey(wikiId, groupId, userId) {
        return getWikiSubwikiFilesCacheKeyPrefix(wikiId) + ':' + groupId + ':' + userId;
    }

    /**
     * Get cache key for all wiki Subwiki Files WS calls.
     *
     * @param {Number} wikiId Wiki ID.
     * @return {String}     Cache key.
     */
    function getWikiSubwikiFilesCacheKeyPrefix(wikiId) {
        return 'mmaModWiki:subwikifiles:' + wikiId;
    }


    /**
     * Get cache key for wiki Pages Contents WS calls.
     *
     * @param {Number} pageId Wiki Page ID.
     * @return {String}     Cache key.
     */
    function getWikiPageCacheKey(pageId) {
        return 'mmaModWiki:page:' + pageId;
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the wiki WS are available.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_wiki_get_wikis_by_courses') &&
                    site.wsAvailable('mod_wiki_get_subwikis') &&
                    site.wsAvailable('mod_wiki_get_subwiki_pages') &&
                    site.wsAvailable('mod_wiki_get_page_contents');
        });
    };

    /**
     * Get a wiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getWiki
     * @param {Number} courseId Course ID.
     * @param {Number} id   Wiki ID or cmid to look for.
     * @param {String} paramName Name of the param id to look for.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the wiki is retrieved.
     */
    self.getWiki = function(courseId, id, paramName, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    courseids: [courseId]
                },
                preSets = {
                    cacheKey: getWikiDataCacheKey(courseId)
                };

            return site.read('mod_wiki_get_wikis_by_courses', params, preSets).then(function(response) {
                if (response.wikis) {
                    var currentWiki;
                    angular.forEach(response.wikis, function(wiki) {
                        if (wiki[paramName] == id) {
                            currentWiki = wiki;
                        }
                    });
                    if (currentWiki) {
                        return currentWiki;
                    }
                }
                return $q.reject();
            });
        });
    };

    /**
     * Gets a list of files to download for a Wiki, using a format similar to module.contents from get_course_contents.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getWikiFileList
     * @param  {Object} wiki Wiki.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Object[]}     File list.
     */
    self.getWikiFileList = function(wiki, siteId) {
        var files = [];
        siteId = siteId || $mmSite.getId();

        return self.getSubwikis(wiki.id, siteId).then(function(subwikis) {
            var promises = [];
            angular.forEach(subwikis, function(subwiki) {
                promises.push(self.getSubwikiFiles(subwiki.wikiid, subwiki.groupid, subwiki.userid, siteId).then(function(subwikiFiles) {
                    files = files.concat(subwikiFiles);
                }));
            });

            return $q.all(promises).then(function() {
                return files;
            });
        });
    };

    /**
     * Gets a list of all pages for a Wiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getWikiPageList
     * @param  {Object} wiki Wiki.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}     Page list.
     */
    self.getWikiPageList = function(wiki, siteId) {
        var pages = [];
        siteId = siteId || $mmSite.getId();

        return self.getSubwikis(wiki.id, siteId).then(function(subwikis) {
            var promises = [];
            angular.forEach(subwikis, function(subwiki) {
                promises.push(self.getSubwikiPages(subwiki.wikiid, subwiki.groupid, subwiki.userid, null, null, null, siteId).then(
                    function(subwikiPages) {
                        pages = pages.concat(subwikiPages);
                    }
                ));
            });

            return $q.all(promises).then(function() {
                return pages;
            });
        });
    };

    /**
     * Get Subwiki List for a Wiki from the cache
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikiList
     * @param  {Number} wikiId wiki Id
     * @return {Array}        Of subwiki lists
     */
    self.getSubwikiList = function(wikiId) {
        return subwikiListsCache[wikiId];
    };

    /**
     * Save Subwiki List for a Wiki to the cache
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#setSubwikiList
     * @param  {Number} wikiId wiki Id
     * @param  {Number} subwikis List of subwikis
     * @param  {Number} count Number of subwikis in the subwikis list
     * @param  {Number} selected subwiki Id currently selected
     */
    self.setSubwikiList = function(wikiId, subwikis, count, selected) {
        var subwikiLists =  {
            count: count,
            selected: selected,
            subwikis: subwikis
        };
        subwikiListsCache[wikiId] = subwikiLists;
    };

    /**
     * Clear Subwiki List for a Wiki from the cache
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#clearSubwikiList
     * @param  {Number} [wikiId] wiki Id, if not provided all will be cleared
     */
    self.clearSubwikiList = function(wikiId) {
        if(typeof wikiId == 'undefined') {
            subwikiListsCache = {};
        } else {
            delete subwikiListsCache[wikiId];
        }

    };

    /**
     * Get a wiki Subwikis.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikis
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki subwikis.
     */
    self.getSubwikis = function(wikiId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    wikiid: wikiId
                },
                preSets = {
                    cacheKey: getWikiSubwikisCacheKey(wikiId)
                };

            return site.read('mod_wiki_get_subwikis', params, preSets).then(function(response) {
                if (response.subwikis) {
                    return response.subwikis;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get the list of Pages of a SubWiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikiPages
     * @param {Number} wikiId Wiki ID.
     * @param {Number} [groupId] to get pages from
     * @param {Number} [userId] to get pages from
     * @param {String} [sortBy] the attribute to sort the returned list. Default: title
     * @param {String} [sortDirection] ASC | DESC direction to sort the returned list. Default: ASC
     * @param {Boolean} [includeContent] if the pages have to include its content. Default: false.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki subwiki pages.
     */
    self.getSubwikiPages = function(wikiId, groupId, userId, sortBy, sortDirection, includeContent, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            groupId = groupId || -1;
            userId = userId || 0;
            sortBy = sortBy || 'title';
            sortDirection = sortDirection || 'ASC';
            includeContent = includeContent || 0;
            var params = {
                    wikiid: wikiId,
                    groupid: groupId,
                    userid: userId,
                    options: {
                        sortby: sortBy,
                        sortdirection: sortDirection,
                        includecontent: includeContent
                    }

                },
                preSets = {
                    cacheKey: getWikiSubwikiPagesCacheKey(wikiId, groupId, userId)
                };

            return site.read('mod_wiki_get_subwiki_pages', params, preSets).then(function(response) {
                if (response.pages) {
                    return response.pages;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Gets the list of files from a specific subwiki.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getSubwikiFiles
     * @param {Number} wikiId Wiki ID.
     * @param {Number} [groupId] to get files from
     * @param {Number} [userId] to get files from
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki subwiki files.
     */
    self.getSubwikiFiles = function(wikiId, groupId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            groupId = groupId || -1;
            userId = userId || 0;
            var params = {
                    wikiid: wikiId,
                    groupid: groupId,
                    userid: userId
                },
                preSets = {
                    cacheKey: getWikiSubwikiFilesCacheKey(wikiId, groupId, userId)
                };

            return site.read('mod_wiki_get_subwiki_files', params, preSets).then(function(response) {
                if (response.files) {
                    return response.files;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get a wiki page contents.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#getPageContents
     * @param {Number} pageId Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved with wiki page contents.
     */
    self.getPageContents = function(pageId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    pageid: pageId
                },
                preSets = {
                    cacheKey: getWikiPageCacheKey(pageId)
                };

            return site.read('mod_wiki_get_page_contents', params, preSets).then(function(response) {
                if (response.page) {
                    return response.page;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Invalidates wiki data.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateWikiData
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateWikiData = function(courseId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWikiDataCacheKey(courseId));
        });
    };

    /**
     * Invalidates Subwikis.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateSubwikis
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubwikis = function(wikiId, siteId) {
        siteId = siteId || $mmSite.getId();
        self.clearSubwikiList(wikiId);
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWikiSubwikisCacheKey(wikiId));
        });
    };

    /**
     * Invalidates Subwiki Pages.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateSubwikiPages
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubwikiPages = function(wikiId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getWikiSubwikiPagesCacheKeyPrefix(wikiId));
        });
    };

    /**
     * Invalidates Subwiki Files.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateSubwikiFiles
     * @param {Number} wikiId Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidateSubwikiFiles = function(wikiId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKeyStartingWith(getWikiSubwikiFilesCacheKeyPrefix(wikiId));
        });
    };

    /**
     * Invalidates Subwiki Pages.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidatePage
     * @param {Number} pageId Wiki Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}        Promise resolved when the data is invalidated.
     */
    self.invalidatePage = function(pageId, siteId) {
        siteId = siteId || $mmSite.getId();
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getWikiPageCacheKey(pageId));
        });
    };

    /**
     * Invalidate the prefetched content.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#invalidateContent
     * @param {Object} moduleId The module ID.
     * @param {Number} courseId Course ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContent = function(moduleId, courseId, siteId) {
        var promises = [];
        siteId = siteId || $mmSite.getId();

        promises.push(self.getWiki(courseId, moduleId, 'coursemodule', siteId).then(function(wiki) {
            var ps = [];
            // Do not invalidate wiki data before getting wiki info, we need it!
            ps.push(self.invalidateWikiData(courseId, siteId));
            ps.push(self.invalidateSubwikis(wiki.id, siteId));
            ps.push(self.invalidateSubwikiPages(wiki.id, siteId));
            ps.push(self.invalidateSubwikiFiles(wiki.id, siteId));

            return $q.all(ps);
        }));

        promises.push($mmFilepool.invalidateFilesByComponent(siteId, mmaModWikiComponent, moduleId));

        return $q.all(promises);
    };

    /**
     * Report the wiki as being viewed.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#logView
     * @param {String} id Wiki ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id, siteId) {
        if (id) {
            siteId = siteId || $mmSite.getId();

            return $mmSitesManager.getSite(siteId).then(function(site) {
                var params = {
                    wikiid: id
                };
                return site.write('mod_wiki_view_wiki', params);
            });
        }
        return $q.reject();
    };

    /**
     * Report a wiki page as being viewed.
     *
     * @module mm.addons.mod_wiki
     * @ngdoc method
     * @name $mmaModWiki#logPageView
     * @param {String} id Page ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logPageView = function(id, siteId) {
        if (id) {
            siteId = siteId || $mmSite.getId();

            return $mmSitesManager.getSite(siteId).then(function(site) {
                var params = {
                    pageid: id
                };
                return site.write('mod_wiki_view_page', params);
            });
        }
        return $q.reject();
    };

    return self;
});
